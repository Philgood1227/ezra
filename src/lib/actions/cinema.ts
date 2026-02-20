"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  createDemoMovieSession,
  getDemoMovieSessionById,
  listDemoMovieOptionsForSession,
  listDemoMovieVotesForSession,
  setDemoMovieSessionChoice,
  upsertDemoMovieVote,
} from "@/lib/demo/cinema-store";
import { chooseWinningMovieOption } from "@/lib/domain/cinema-rotation";
import type { ActionResult, MovieSessionInput } from "@/lib/day-templates/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SessionStatus = "planifiee" | "choisie" | "terminee";

const movieOptionSchema = z.object({
  title: z.string().trim().min(2, "Titre de film requis."),
  platform: z.string().trim().max(80).nullable(),
  durationMinutes: z.number().int().min(30).max(300).nullable(),
  description: z.string().trim().max(280).nullable(),
});

const createSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Heure invalide.")
    .nullable(),
  proposerProfileId: z.string().trim().min(1).nullable(),
  pickerProfileId: z.string().trim().min(1).nullable(),
  options: z.array(movieOptionSchema).length(3, "Ajoutez exactement 3 films."),
});

const voteSchema = z.object({
  sessionId: z.string().uuid("Session invalide."),
  movieOptionId: z.string().uuid("Film invalide."),
});

function revalidateCinemaPaths(): void {
  revalidatePath("/parent/cinema");
  revalidatePath("/child/cinema");
  revalidatePath("/child/my-day");
}

async function requireParentFamilyId(): Promise<string | null> {
  const context = await getCurrentProfile();
  if (context.role !== "parent" || !context.familyId) {
    return null;
  }

  return context.familyId;
}

function sanitizeMovieSessionInput(input: MovieSessionInput): MovieSessionInput {
  return {
    date: input.date,
    time: input.time?.trim() || null,
    proposerProfileId: input.proposerProfileId,
    pickerProfileId: input.pickerProfileId,
    options: input.options.map((option) => ({
      title: option.title.trim(),
      platform: option.platform?.trim() ? option.platform.trim() : null,
      durationMinutes:
        typeof option.durationMinutes === "number"
          ? Math.max(30, Math.min(300, Math.trunc(option.durationMinutes)))
          : null,
      description: option.description?.trim() ? option.description.trim() : null,
    })),
  };
}

export async function createMovieSessionAction(
  input: MovieSessionInput,
): Promise<ActionResult<{ sessionId: string }>> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const sanitized = sanitizeMovieSessionInput(input);
  const parsed = createSessionSchema.safeParse(sanitized);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const created = createDemoMovieSession(familyId, parsed.data);
    revalidateCinemaPaths();
    return { success: true, data: { sessionId: created.session.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data: sessionRow, error: sessionError } = await supabase
    .from("movie_sessions")
    .insert({
      family_id: familyId,
      date: parsed.data.date,
      time: parsed.data.time,
      proposer_profile_id: parsed.data.proposerProfileId,
      picker_profile_id: parsed.data.pickerProfileId,
      status: "planifiee" satisfies SessionStatus,
    })
    .select("id")
    .single();

  if (sessionError || !sessionRow) {
    return { success: false, error: "Impossible de creer la session cinema." };
  }

  const { error: optionsError } = await supabase.from("movie_options").insert(
    parsed.data.options.map((option) => ({
      session_id: sessionRow.id,
      title: option.title,
      platform: option.platform,
      duration_minutes: option.durationMinutes,
      description: option.description,
    })),
  );

  if (optionsError) {
    return { success: false, error: "Session creee mais films non enregistres." };
  }

  revalidateCinemaPaths();
  return { success: true, data: { sessionId: sessionRow.id } };
}

async function chooseMovieIfNeeded(input: {
  familyId: string;
  sessionId: string;
  voterProfileId: string;
  votedOptionId: string;
  useAdminClient: boolean;
}): Promise<{ chosenOptionId: string | null }> {
  if (!isSupabaseEnabled()) {
    const session = getDemoMovieSessionById(input.familyId, input.sessionId);
    const options = listDemoMovieOptionsForSession(input.familyId, input.sessionId);
    const votes = listDemoMovieVotesForSession(input.familyId, input.sessionId);

    const sessionPicker = session?.pickerProfileId ?? null;
    const chosenByVotes = chooseWinningMovieOption({
      orderedOptionIds: options.map((option) => option.id),
      votes,
    });

    const chosenOptionId = sessionPicker === input.voterProfileId ? input.votedOptionId : chosenByVotes;
    if (chosenOptionId) {
      setDemoMovieSessionChoice(input.familyId, input.sessionId, chosenOptionId);
    }

    return { chosenOptionId };
  }

  const supabase = input.useAdminClient ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const [{ data: sessionRow }, { data: optionRows }, { data: voteRows }] = await Promise.all([
    supabase
      .from("movie_sessions")
      .select("picker_profile_id")
      .eq("id", input.sessionId)
      .eq("family_id", input.familyId)
      .maybeSingle(),
    supabase
      .from("movie_options")
      .select("id")
      .eq("session_id", input.sessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("movie_votes")
      .select("movie_option_id")
      .eq("session_id", input.sessionId),
  ]);

  const orderedOptionIds = (optionRows ?? []).map((option) => option.id);
  const pickerProfileId = sessionRow?.picker_profile_id ?? null;

  const chosenOptionId = pickerProfileId
    ? pickerProfileId === input.voterProfileId
      ? input.votedOptionId
      : null
    : chooseWinningMovieOption({
        orderedOptionIds,
        votes: (voteRows ?? []).map((vote) => ({ movieOptionId: vote.movie_option_id })),
      });

  if (chosenOptionId) {
    await supabase
      .from("movie_sessions")
      .update({
        chosen_option_id: chosenOptionId,
        status: "choisie" satisfies SessionStatus,
      })
      .eq("id", input.sessionId)
      .eq("family_id", input.familyId);
  }

  return { chosenOptionId };
}

export async function voteMovieOptionAction(
  payload: unknown,
): Promise<ActionResult<{ chosenOptionId: string | null }>> {
  const parsed = voteSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id) {
    return { success: false, error: "Session invalide." };
  }

  if (context.role !== "child" && context.role !== "parent") {
    return { success: false, error: "Action non autorisee." };
  }

  if (!isSupabaseEnabled()) {
    upsertDemoMovieVote(context.familyId, {
      sessionId: parsed.data.sessionId,
      profileId: context.profile.id,
      movieOptionId: parsed.data.movieOptionId,
    });

    const { chosenOptionId } = await chooseMovieIfNeeded({
      familyId: context.familyId,
      sessionId: parsed.data.sessionId,
      voterProfileId: context.profile.id,
      votedOptionId: parsed.data.movieOptionId,
      useAdminClient: false,
    });

    revalidateCinemaPaths();
    return { success: true, data: { chosenOptionId } };
  }

  const useAdminClient =
    context.source === "child-pin" &&
    context.role === "child" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = useAdminClient ? createSupabaseAdminClient() : await createSupabaseServerClient();

  const { data: sessionRow } = await supabase
    .from("movie_sessions")
    .select("id, family_id, status")
    .eq("id", parsed.data.sessionId)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!sessionRow) {
    return { success: false, error: "Session cinema introuvable." };
  }

  if (sessionRow.status !== "planifiee") {
    return { success: false, error: "Cette session n'accepte plus de votes." };
  }

  const { data: optionRow } = await supabase
    .from("movie_options")
    .select("id")
    .eq("id", parsed.data.movieOptionId)
    .eq("session_id", parsed.data.sessionId)
    .maybeSingle();

  if (!optionRow) {
    return { success: false, error: "Film invalide pour cette session." };
  }

  const { error } = await supabase.from("movie_votes").upsert(
    {
      session_id: parsed.data.sessionId,
      profile_id: context.profile.id,
      movie_option_id: parsed.data.movieOptionId,
    },
    { onConflict: "session_id,profile_id" },
  );

  if (error) {
    return { success: false, error: "Impossible d'enregistrer ton vote." };
  }

  const { chosenOptionId } = await chooseMovieIfNeeded({
    familyId: context.familyId,
    sessionId: parsed.data.sessionId,
    voterProfileId: context.profile.id,
    votedOptionId: parsed.data.movieOptionId,
    useAdminClient,
  });

  revalidateCinemaPaths();
  return { success: true, data: { chosenOptionId } };
}
