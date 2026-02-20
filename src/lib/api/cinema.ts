import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getFamilyMembersForCurrentFamily, getPrimaryChildProfileForCurrentFamily } from "@/lib/api/children";
import {
  getDemoMovieOptionById,
  listDemoMovieOptionsForSession,
  listDemoMovieSessions,
  listDemoMovieVotesForSession,
} from "@/lib/demo/cinema-store";
import { computeNextCinemaRotation } from "@/lib/domain/cinema-rotation";
import type {
  MovieOptionSummary,
  MovieSessionSummary,
  MovieVoteSummary,
} from "@/lib/day-templates/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type MovieSessionRow = Database["public"]["Tables"]["movie_sessions"]["Row"];
type MovieOptionRow = Database["public"]["Tables"]["movie_options"]["Row"];
type MovieVoteRow = Database["public"]["Tables"]["movie_votes"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function mapMovieSession(row: MovieSessionRow): MovieSessionSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    date: row.date,
    time: row.time,
    status: row.status,
    proposerProfileId: row.proposer_profile_id,
    pickerProfileId: row.picker_profile_id,
    chosenOptionId: row.chosen_option_id,
    createdAt: row.created_at,
  };
}

function mapMovieOption(row: MovieOptionRow): MovieOptionSummary {
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    platform: row.platform,
    durationMinutes: row.duration_minutes,
    description: row.description,
  };
}

function mapMovieVote(row: MovieVoteRow): MovieVoteSummary {
  return {
    id: row.id,
    sessionId: row.session_id,
    profileId: row.profile_id,
    movieOptionId: row.movie_option_id,
    createdAt: row.created_at,
  };
}

export interface MovieSessionBundle {
  session: MovieSessionSummary;
  options: MovieOptionSummary[];
  votes: MovieVoteSummary[];
  chosenOption: MovieOptionSummary | null;
}

function toSessionBundle(input: {
  session: MovieSessionSummary;
  options: MovieOptionSummary[];
  votes: MovieVoteSummary[];
}): MovieSessionBundle {
  return {
    session: input.session,
    options: input.options,
    votes: input.votes,
    chosenOption: input.session.chosenOptionId
      ? input.options.find((option) => option.id === input.session.chosenOptionId) ?? null
      : null,
  };
}

function shouldUseAdminClientForChildPin(context: Awaited<ReturnType<typeof getCurrentProfile>>): boolean {
  return (
    context.source === "child-pin" &&
    context.role === "child" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export async function getCinemaFamilyMembers(): Promise<
  Array<{ id: string; displayName: string; role: "parent" | "child" | "viewer" }>
> {
  return getFamilyMembersForCurrentFamily();
}

export async function getMovieSessionsForCurrentFamily(): Promise<MovieSessionBundle[]> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    const sessions = listDemoMovieSessions(context.familyId);
    return sessions.map((session) =>
      toSessionBundle({
        session,
        options: listDemoMovieOptionsForSession(context.familyId!, session.id),
        votes: listDemoMovieVotesForSession(context.familyId!, session.id),
      }),
    );
  }

  const supabase = shouldUseAdminClientForChildPin(context)
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const { data: sessionRows } = await supabase
    .from("movie_sessions")
    .select("*")
    .eq("family_id", context.familyId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (!sessionRows || sessionRows.length === 0) {
    return [];
  }

  const sessionIds = sessionRows.map((session) => session.id);
  const [{ data: optionRows }, { data: voteRows }] = await Promise.all([
    supabase.from("movie_options").select("*").in("session_id", sessionIds),
    supabase.from("movie_votes").select("*").in("session_id", sessionIds),
  ]);

  return sessionRows.map((sessionRow) => {
    const session = mapMovieSession(sessionRow as MovieSessionRow);
    const options = (optionRows ?? [])
      .filter((option) => option.session_id === session.id)
      .map((option) => mapMovieOption(option as MovieOptionRow));
    const votes = (voteRows ?? [])
      .filter((vote) => vote.session_id === session.id)
      .map((vote) => mapMovieVote(vote as MovieVoteRow));

    return toSessionBundle({ session, options, votes });
  });
}

export async function getSuggestedCinemaRotation(): Promise<{
  proposerProfileId: string | null;
  pickerProfileId: string | null;
}> {
  const sessions = await getMovieSessionsForCurrentFamily();
  const members = (await getCinemaFamilyMembers()).filter((member) => member.role !== "viewer");

  const lastSession = sessions
    .slice()
    .sort((left, right) => right.session.date.localeCompare(left.session.date))[0];

  return computeNextCinemaRotation({
    members: members.map((member) => ({ id: member.id, displayName: member.displayName })),
    lastProposerId: lastSession?.session.proposerProfileId ?? null,
    lastPickerId: lastSession?.session.pickerProfileId ?? null,
  });
}

export async function getNextMovieSessionForCurrentChild(): Promise<{
  childProfileId: string | null;
  session: MovieSessionBundle | null;
  myVoteOptionId: string | null;
}> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return { childProfileId: null, session: null, myVoteOptionId: null };
  }

  const sessions = await getMovieSessionsForCurrentFamily();
  const todayKey = new Date().toISOString().slice(0, 10);

  const nextSession = sessions.find((entry) => entry.session.date >= todayKey) ?? null;

  const myVote = nextSession?.votes.find((vote) => vote.profileId === child.id)?.movieOptionId ?? null;

  return {
    childProfileId: child.id,
    session: nextSession,
    myVoteOptionId: myVote,
  };
}

export async function getChosenMovieForDate(dateKey: string): Promise<{
  sessionId: string;
  option: MovieOptionSummary;
} | null> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return null;
  }

  if (!isSupabaseEnabled()) {
    const session = listDemoMovieSessions(context.familyId).find(
      (entry) => entry.date === dateKey && entry.status === "choisie" && entry.chosenOptionId,
    );

    if (!session || !session.chosenOptionId) {
      return null;
    }

    const option = getDemoMovieOptionById(context.familyId, session.chosenOptionId);
    if (!option) {
      return null;
    }

    return {
      sessionId: session.id,
      option,
    };
  }

  const supabase = shouldUseAdminClientForChildPin(context)
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const { data: sessionRow } = await supabase
    .from("movie_sessions")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("date", dateKey)
    .eq("status", "choisie")
    .not("chosen_option_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sessionRow?.chosen_option_id) {
    return null;
  }

  const { data: optionRow } = await supabase
    .from("movie_options")
    .select("*")
    .eq("id", sessionRow.chosen_option_id)
    .maybeSingle();

  if (!optionRow) {
    return null;
  }

  return {
    sessionId: sessionRow.id,
    option: mapMovieOption(optionRow as MovieOptionRow),
  };
}

export async function getMovieOptionById(optionId: string): Promise<MovieOptionSummary | null> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return null;
  }

  if (!isSupabaseEnabled()) {
    return getDemoMovieOptionById(context.familyId, optionId);
  }

  const supabase = shouldUseAdminClientForChildPin(context)
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const { data } = await supabase.from("movie_options").select("*").eq("id", optionId).maybeSingle();
  if (!data) {
    return null;
  }

  if (shouldUseAdminClientForChildPin(context)) {
    const { data: sessionRow } = await supabase
      .from("movie_sessions")
      .select("family_id")
      .eq("id", data.session_id)
      .maybeSingle();

    if (!sessionRow || sessionRow.family_id !== context.familyId) {
      return null;
    }
  }

  return mapMovieOption(data as MovieOptionRow);
}

export async function getMovieSessionById(sessionId: string): Promise<MovieSessionBundle | null> {
  const sessions = await getMovieSessionsForCurrentFamily();
  return sessions.find((entry) => entry.session.id === sessionId) ?? null;
}

export async function getMovieSessionProfilesById(sessionId: string): Promise<{
  proposer: ProfileRow | null;
  picker: ProfileRow | null;
}> {
  const context = await getCurrentProfile();
  if (!context.familyId || !isSupabaseEnabled()) {
    return { proposer: null, picker: null };
  }

  const supabase = shouldUseAdminClientForChildPin(context)
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const { data: sessionRow } = await supabase
    .from("movie_sessions")
    .select("proposer_profile_id, picker_profile_id")
    .eq("id", sessionId)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!sessionRow) {
    return { proposer: null, picker: null };
  }

  const profileIds = [sessionRow.proposer_profile_id, sessionRow.picker_profile_id].filter(
    (id): id is string => Boolean(id),
  );

  if (profileIds.length === 0) {
    return { proposer: null, picker: null };
  }

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("*")
    .in("id", profileIds);

  const profileById = new Map((profileRows ?? []).map((profile) => [profile.id, profile as ProfileRow]));

  return {
    proposer: sessionRow.proposer_profile_id ? profileById.get(sessionRow.proposer_profile_id) ?? null : null,
    picker: sessionRow.picker_profile_id ? profileById.get(sessionRow.picker_profile_id) ?? null : null,
  };
}
