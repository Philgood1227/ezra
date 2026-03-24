import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  mapRevisionCardRow,
  mergeConceptCardPatchIntoStoredCard,
  mapUserRevisionStateRow,
} from "@/lib/revisions/mappers";
import type { ChildVisibleRevisionCardItem } from "@/lib/revisions/child-tools";
import {
  createDemoRevisionCard,
  getDemoRevisionCardById,
  getDemoUserRevisionState,
  listDemoRevisionCards,
  listDemoUserRevisionStatesForUser,
  upsertDemoUserRevisionState,
  updateDemoRevisionCard,
} from "@/lib/demo/revisions-store";
import type {
  CardType,
  CreateRevisionCardInput,
  RevisionCardLibraryItem,
  RevisionLibraryFilters,
  RevisionMutationResult,
  RevisionProgress,
  RevisionProgressStatus,
  RevisionQuizQuestion,
  StoredRevisionCard,
  UpdateRevisionCardPatch,
  RevisionCardStatus,
  RevisionCardKind,
  UserRevisionState,
  UpsertRevisionProgressInput,
} from "@/lib/revisions/types";
import {
  createRevisionCardInputSchema,
  revisionCardContentSchema,
  revisionCardKindSchema,
  revisionCardStatusSchema,
  updateRevisionCardPatchSchema,
  upsertRevisionProgressInputSchema,
} from "@/lib/revisions/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

type RevisionCardRow = Database["public"]["Tables"]["revision_cards"]["Row"];
type UserRevisionStateRow = Database["public"]["Tables"]["user_revision_state"]["Row"];

interface FamilyContext {
  familyId: string;
  profileId: string;
  role: "parent" | "child" | "viewer";
  useAdminClientForChildPin: boolean;
}

const DEFAULT_PARENT_LIBRARY_LIMIT = 30;
const MAX_PARENT_LIBRARY_LIMIT = 100;
export const SUPABASE_NOT_CONFIGURED_CODE = "SUPABASE_NOT_CONFIGURED" as const;

export interface ListRevisionCardsParams {
  subject?: string;
  type?: CardType;
  level?: string;
  status?: "draft" | "published";
  limit?: number;
}

export interface UpdateStoredRevisionCardInput {
  id: string;
  title?: string;
  content?: CreateRevisionCardInput["content"];
  concept?: {
    blocks?: {
      jeRetiens?: string;
      jeVoisHtml?: string;
      monTruc?: string;
      examples?: string[];
    };
    exercises?: string[];
    quiz?: RevisionQuizQuestion[];
  };
  status?: "draft" | "published";
}

const userRevisionStateSchema = z.object({
  userId: z.string().min(1),
  cardId: z.string().min(1),
  status: z.enum(["unseen", "in_progress", "mastered"]),
  stars: z.number().int().min(0).max(5),
  lastReviewedAt: z.string().datetime({ offset: true }),
  quizScore: z
    .object({
      lastScore: z.number().int().min(0).max(100),
      attempts: z.number().int().min(0),
    })
    .optional(),
});

const revisionQuizQuestionSchema = z
  .object({
    id: z.string().min(1).max(120),
    question: z.string().min(2).max(500).transform((value) => value.replace(/\s+/g, " ").trim()),
    choices: z
      .array(z.string().min(1).max(200))
      .min(2)
      .max(8)
      .transform((values) => values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean)),
    answer: z.string().min(1).max(200).transform((value) => value.replace(/\s+/g, " ").trim()),
  })
  .superRefine((question, context) => {
    const hasAnswer = question.choices.some(
      (choice) => choice.toLocaleLowerCase() === question.answer.toLocaleLowerCase(),
    );
    if (!hasAnswer) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message: "Answer must match one of the choices.",
      });
    }
  });

const updateStoredRevisionCardInputSchema = z
  .object({
    id: z.string().uuid("Invalid revision card id."),
    title: z
      .string()
      .min(2)
      .max(160)
      .optional()
      .transform((value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : value)),
    concept: z
      .object({
        blocks: z
          .object({
            jeRetiens: z
              .string()
              .max(4000)
              .optional()
              .transform((value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : value)),
            jeVoisHtml: z.string().max(12000).optional(),
            monTruc: z
              .string()
              .max(1200)
              .optional()
              .transform((value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : value)),
            examples: z
              .array(z.string().max(300))
              .max(20)
              .optional()
              .transform((values) =>
                values ? values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean) : values,
              ),
          })
          .partial()
          .optional(),
        exercises: z
          .array(z.string().max(300))
          .max(20)
          .optional()
          .transform((values) =>
            values ? values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean) : values,
          ),
        quiz: z.array(revisionQuizQuestionSchema).max(20).optional(),
      })
      .partial()
      .optional(),
    content: revisionCardContentSchema.optional(),
    status: revisionCardStatusSchema.optional(),
  })
  .superRefine((payload, context) => {
    if (payload.title !== undefined || payload.status !== undefined) {
      return;
    }

    if (payload.content !== undefined) {
      return;
    }

    const hasConcept =
      payload.concept?.blocks !== undefined ||
      payload.concept?.exercises !== undefined ||
      payload.concept?.quiz !== undefined;
    if (hasConcept) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided.",
    });
  });

const listRevisionCardsForParentParamsSchema = z.object({
  status: z.union([z.literal("all"), revisionCardStatusSchema]).default("all"),
  kind: z.union([z.literal("all"), revisionCardKindSchema]).default("all"),
  subject: z
    .string()
    .max(120)
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }

      const cleaned = value.replace(/\s+/g, " ").trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
  search: z
    .string()
    .max(160)
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }

      const cleaned = value.replace(/\s+/g, " ").trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
  limit: z.number().int().min(1).max(MAX_PARENT_LIBRARY_LIMIT).default(DEFAULT_PARENT_LIBRARY_LIMIT),
});

const listStoredRevisionCardsParamsSchema = z.object({
  subject: z
    .string()
    .max(120)
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }

      const cleaned = value.replace(/\s+/g, " ").trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
  type: z.enum(["concept", "procedure", "vocab", "comprehension"]).optional(),
  level: z
    .string()
    .max(120)
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }

      const cleaned = value.replace(/\s+/g, " ").trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
  status: revisionCardStatusSchema.optional(),
  limit: z.number().int().min(1).max(MAX_PARENT_LIBRARY_LIMIT).default(DEFAULT_PARENT_LIBRARY_LIMIT),
});

const revisionCardIdSchema = z.string().uuid("Invalid revision card id.");

function normalizeParentLibraryFilters(params?: RevisionLibraryFilters): z.infer<typeof listRevisionCardsForParentParamsSchema> {
  const parsed = listRevisionCardsForParentParamsSchema.safeParse({
    status: params?.status,
    kind: params?.kind,
    subject: params?.subject ?? undefined,
    search: params?.search ?? undefined,
    limit: params?.limit,
  });

  if (parsed.success) {
    return parsed.data;
  }

  return listRevisionCardsForParentParamsSchema.parse({});
}

function normalizeStoredRevisionCardsFilters(params?: ListRevisionCardsParams): z.infer<typeof listStoredRevisionCardsParamsSchema> {
  const parsed = listStoredRevisionCardsParamsSchema.safeParse({
    subject: params?.subject,
    type: params?.type,
    level: params?.level,
    status: params?.status,
    limit: params?.limit,
  });

  if (parsed.success) {
    return parsed.data;
  }

  return listStoredRevisionCardsParamsSchema.parse({});
}

function normalizeFilterValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function matchesOptionalPrefix(value: string | null, filterValue: string | null): boolean {
  if (!filterValue) {
    return true;
  }

  if (!value) {
    return false;
  }

  return normalizeFilterValue(value).startsWith(normalizeFilterValue(filterValue));
}

function applyStoredCardFilters(
  cards: StoredRevisionCard[],
  filters: z.infer<typeof listStoredRevisionCardsParamsSchema>,
): StoredRevisionCard[] {
  return cards
    .filter((card) => (filters.status ? card.status === filters.status : true))
    .filter((card) => (filters.type ? card.content.kind === filters.type : true))
    .filter((card) => matchesOptionalPrefix(card.subject, filters.subject))
    .filter((card) => matchesOptionalPrefix(card.level, filters.level))
    .slice(0, filters.limit);
}

function toComparableTimestamp(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsed;
}

function sortChildVisibleCards(cards: ChildVisibleRevisionCardItem[]): ChildVisibleRevisionCardItem[] {
  return [...cards].sort((left, right) => {
    const leftLastReviewed = toComparableTimestamp(left.lastReviewedAt);
    const rightLastReviewed = toComparableTimestamp(right.lastReviewedAt);

    const leftHasReviewedSignal = Number.isFinite(leftLastReviewed);
    const rightHasReviewedSignal = Number.isFinite(rightLastReviewed);

    if (leftHasReviewedSignal && rightHasReviewedSignal && leftLastReviewed !== rightLastReviewed) {
      return rightLastReviewed - leftLastReviewed;
    }

    if (leftHasReviewedSignal !== rightHasReviewedSignal) {
      return leftHasReviewedSignal ? -1 : 1;
    }

    const leftUpdated = toComparableTimestamp(left.updatedAt);
    const rightUpdated = toComparableTimestamp(right.updatedAt);
    if (leftUpdated !== rightUpdated) {
      return rightUpdated - leftUpdated;
    }

    return left.title.localeCompare(right.title, "fr", { sensitivity: "base" });
  });
}

function toChildVisibleRevisionCardsFromStoredCards(
  cards: StoredRevisionCard[],
  userStates: UserRevisionState[],
): ChildVisibleRevisionCardItem[] {
  const statesByCardId = new Map(userStates.map((state) => [state.cardId, state]));

  const mapped = cards.map<ChildVisibleRevisionCardItem>((card) => {
    const state = statesByCardId.get(card.id);
    const cardType = card.content.kind === "generic" ? "concept" : card.content.kind;

    return {
      id: card.id,
      title: card.title,
      subject: card.subject,
      level: card.level,
      type: cardType,
      status: "published",
      updatedAt: card.updatedAt,
      lastReviewedAt: state?.lastReviewedAt ?? null,
      progressStatus: state?.status ?? "unseen",
      stars: state?.stars ?? 0,
    };
  });

  return sortChildVisibleCards(mapped);
}

function toRevisionCardLibraryItem(card: StoredRevisionCard): RevisionCardLibraryItem {
  const sourceType = card.content.source?.sourceType;
  const sourceLabel =
    sourceType === "book"
      ? card.content.source?.bookTitle
        ? `Livre: ${card.content.source.bookTitle}`
        : "Manuel"
      : null;

  return {
    id: card.id,
    title: card.title,
    subject: card.subject,
    level: card.level,
    tags: card.tags,
    kind: card.content.kind,
    status: card.status,
    ...(sourceType ? { sourceType } : {}),
    ...(sourceLabel ? { sourceLabel } : {}),
    createdByProfileId: card.createdByProfileId,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

function shouldUseAdminClientForChildPin(
  context: Awaited<ReturnType<typeof getCurrentProfile>>,
): boolean {
  return (
    context.source === "child-pin" &&
    context.role === "child" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function buildDeniedResult<T>(message: string): RevisionMutationResult<T> {
  return {
    success: false,
    error: message,
  };
}

function buildSupabaseNotConfiguredResult<T>(): RevisionMutationResult<T> {
  return buildDeniedResult(SUPABASE_NOT_CONFIGURED_CODE);
}

function isSupabaseConfigured(): boolean {
  return isSupabaseEnabled();
}

async function getFamilyContext(): Promise<FamilyContext | null> {
  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id || context.role === "anonymous") {
    return null;
  }

  return {
    familyId: context.familyId,
    profileId: context.profile.id,
    role: context.role,
    useAdminClientForChildPin: shouldUseAdminClientForChildPin(context),
  };
}

export async function listRevisionCardsForFamily(): Promise<StoredRevisionCard[]> {
  const context = await getFamilyContext();
  if (!context) {
    return [];
  }

  const publishedOnly = context.role !== "parent";

  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("revision_cards")
    .select("*")
    .eq("family_id", context.familyId)
    .order("updated_at", { ascending: false });

  if (publishedOnly) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map((row) => mapRevisionCardRow(row as RevisionCardRow));
}

export async function listStoredRevisionCards(
  params?: ListRevisionCardsParams,
): Promise<StoredRevisionCard[]> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return [];
  }

  const filters = normalizeStoredRevisionCardsFilters(params);

  if (!isSupabaseConfigured()) {
    const demoCards = listDemoRevisionCards(context.familyId);
    return applyStoredCardFilters(demoCards, filters);
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("revision_cards")
    .select("id,family_id,created_by_profile_id,title,subject,level,tags,type,goal,content,content_json,status,created_at,updated_at")
    .eq("family_id", context.familyId)
    .order("updated_at", { ascending: false })
    .limit(filters.limit);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.subject) {
    query = query.ilike("subject", `${filters.subject}%`);
  }

  if (filters.level) {
    query = query.ilike("level", `${filters.level}%`);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map((row) => mapRevisionCardRow(row as RevisionCardRow));
}

export async function listChildVisibleRevisionCards(
  profileId?: string,
): Promise<ChildVisibleRevisionCardItem[]> {
  const context = await getFamilyContext();
  if (!context || context.role !== "child") {
    return [];
  }

  const targetProfileId = profileId ?? context.profileId;
  if (targetProfileId !== context.profileId) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    const demoCards = listDemoRevisionCards(context.familyId, { publishedOnly: true });
    const userStates = listDemoUserRevisionStatesForUser(context.familyId, targetProfileId);
    return toChildVisibleRevisionCardsFromStoredCards(demoCards, userStates);
  }

  const supabase = context.useAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { data: cardsData, error: cardsError } = await supabase
    .from("revision_cards")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (cardsError || !cardsData) {
    return [];
  }

  const storedCards = cardsData.map((row) => mapRevisionCardRow(row as RevisionCardRow));

  const { data: statesData, error: statesError } = await supabase
    .from("user_revision_state")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("user_id", targetProfileId);

  const states =
    statesError || !statesData
      ? []
      : statesData.map((row) => mapUserRevisionStateRow(row as UserRevisionStateRow));

  return toChildVisibleRevisionCardsFromStoredCards(storedCards, states);
}

function toCardTypeFromKind(kind: z.infer<typeof revisionCardKindSchema>): CardType | undefined {
  switch (kind) {
    case "concept":
    case "procedure":
    case "vocab":
    case "comprehension":
      return kind;
    default:
      return undefined;
  }
}

function normalizeCardTypeForStorage(kind: RevisionCardKind): CardType {
  switch (kind) {
    case "concept":
    case "procedure":
    case "vocab":
    case "comprehension":
      return kind;
    default:
      return "concept";
  }
}

function mapLegacyProgressStatusToUserRevisionStatus(
  status: RevisionProgressStatus,
): UserRevisionState["status"] {
  switch (status) {
    case "completed":
      return "mastered";
    case "in_progress":
      return "in_progress";
    default:
      return "unseen";
  }
}

function mapUserRevisionStatusToLegacyProgressStatus(
  status: UserRevisionState["status"],
): RevisionProgressStatus {
  switch (status) {
    case "mastered":
      return "completed";
    case "in_progress":
      return "in_progress";
    default:
      return "not_started";
  }
}

function toRevisionProgressFromUserState(
  state: UserRevisionState,
  familyId: string,
): RevisionProgress {
  const confidenceScore =
    state.quizScore?.lastScore ?? (state.stars > 0 ? Math.min(100, state.stars * 20) : null);
  const attempts = state.quizScore?.attempts ?? 0;
  const nowIso = state.lastReviewedAt;

  return {
    id: `${state.userId}:${state.cardId}`,
    familyId,
    childProfileId: state.userId,
    revisionCardId: state.cardId,
    lastSeenAt: state.lastReviewedAt,
    completedCount: attempts,
    successStreak: state.status === "mastered" ? Math.max(1, state.stars) : 0,
    confidenceScore,
    status: mapUserRevisionStatusToLegacyProgressStatus(state.status),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function listRevisionCardsForParent(
  params?: RevisionLibraryFilters,
): Promise<RevisionCardLibraryItem[]> {
  const filters = normalizeParentLibraryFilters(params);
  const statusFilter = filters.status === "all" ? undefined : filters.status;
  const typeFilter = filters.kind === "all" ? undefined : toCardTypeFromKind(filters.kind);
  const cards = await listStoredRevisionCards({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(filters.subject ? { subject: filters.subject } : {}),
    limit: filters.limit,
  });

  const normalizedSearch = filters.search ? normalizeFilterValue(filters.search) : null;

  return cards
    .filter((card) => (filters.kind === "all" ? true : card.content.kind === filters.kind))
    .filter((card) => {
      if (!normalizedSearch) {
        return true;
      }
      return normalizeFilterValue(card.title).includes(normalizedSearch);
    })
    .slice(0, filters.limit)
    .map(toRevisionCardLibraryItem);
}

export async function getRevisionCardById(id: string): Promise<StoredRevisionCard | null> {
  const context = await getFamilyContext();
  if (!context) {
    return null;
  }

  const publishedOnly = context.role !== "parent";

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = context.useAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  let query = supabase
    .from("revision_cards")
    .select("*")
    .eq("id", id)
    .eq("family_id", context.familyId);

  if (publishedOnly) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    return null;
  }

  const mappedRow = data as RevisionCardRow;
  if (mappedRow.family_id !== context.familyId) {
    return null;
  }

  if (publishedOnly && mappedRow.status !== "published") {
    return null;
  }

  return mapRevisionCardRow(mappedRow);
}

export async function getRevisionCardForParent(id: string): Promise<StoredRevisionCard | null> {
  return getStoredRevisionCardById(id);
}

export async function getStoredRevisionCardById(id: string): Promise<StoredRevisionCard | null> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return null;
  }

  const parsedId = revisionCardIdSchema.safeParse(id);
  if (!parsedId.success) {
    return null;
  }

  if (!isSupabaseConfigured()) {
    return getDemoRevisionCardById(context.familyId, parsedId.data);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("revision_cards")
    .select("*")
    .eq("id", parsedId.data)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRevisionCardRow(data as RevisionCardRow);
}

export async function createStoredRevisionCard(
  input: CreateRevisionCardInput,
): Promise<RevisionMutationResult<StoredRevisionCard>> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return buildDeniedResult("Action reservee au parent.");
  }

  const parsed = createRevisionCardInputSchema.safeParse(input);
  if (!parsed.success) {
    return buildDeniedResult(parsed.error.issues[0]?.message ?? "Saisie invalide.");
  }

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      data: createDemoRevisionCard(context.familyId, context.profileId, parsed.data),
    };
  }

  const supabase = await createSupabaseServerClient();
  const storedType = normalizeCardTypeForStorage(parsed.data.content.kind);
  const { data, error } = await supabase
    .from("revision_cards")
    .insert({
      family_id: context.familyId,
      created_by_profile_id: context.profileId,
      title: parsed.data.title,
      subject: parsed.data.subject,
      level: parsed.data.level ?? null,
      tags: parsed.data.tags,
      type: storedType,
      goal: parsed.data.content.summary ?? null,
      content: parsed.data.content as unknown as Json,
      content_json: parsed.data.content as unknown as Json,
      status: parsed.data.status,
    })
    .select("*")
    .single();

  if (error || !data) {
    return buildDeniedResult("Impossible de creer la fiche de revision.");
  }

  return {
    success: true,
    data: mapRevisionCardRow(data as RevisionCardRow),
  };
}

export async function createRevisionCard(
  input: CreateRevisionCardInput,
): Promise<RevisionMutationResult<StoredRevisionCard>> {
  return createStoredRevisionCard(input);
}

export async function updateStoredRevisionCard(
  input: UpdateStoredRevisionCardInput,
): Promise<RevisionMutationResult<StoredRevisionCard>> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return buildDeniedResult("Action reservee au parent.");
  }

  const parsed = updateStoredRevisionCardInputSchema.safeParse(input);
  if (!parsed.success) {
    return buildDeniedResult(parsed.error.issues[0]?.message ?? "Mise a jour invalide.");
  }

  const existingCard = await getStoredRevisionCardById(parsed.data.id);
  if (!existingCard) {
    return buildDeniedResult("Fiche introuvable.");
  }

  const conceptBlocks = parsed.data.concept?.blocks
    ? {
        ...(parsed.data.concept.blocks.jeRetiens !== undefined
          ? { jeRetiens: parsed.data.concept.blocks.jeRetiens }
          : {}),
        ...(parsed.data.concept.blocks.jeVoisHtml !== undefined
          ? { jeVoisHtml: parsed.data.concept.blocks.jeVoisHtml }
          : {}),
        ...(parsed.data.concept.blocks.monTruc !== undefined
          ? { monTruc: parsed.data.concept.blocks.monTruc }
          : {}),
        ...(parsed.data.concept.blocks.examples !== undefined
          ? { examples: parsed.data.concept.blocks.examples }
          : {}),
      }
    : null;

  const conceptPatch = parsed.data.concept
    ? {
        ...(conceptBlocks && Object.keys(conceptBlocks).length > 0 ? { blocks: conceptBlocks } : {}),
        ...(parsed.data.concept.exercises ? { exercises: parsed.data.concept.exercises } : {}),
        ...(parsed.data.concept.quiz ? { quiz: parsed.data.concept.quiz } : {}),
      }
    : null;

  const nextCardFromConceptPatch = conceptPatch
    ? mergeConceptCardPatchIntoStoredCard(existingCard, conceptPatch)
    : existingCard;

  const nextContent = parsed.data.content ?? (conceptPatch ? nextCardFromConceptPatch.content : undefined);

  const patch: UpdateRevisionCardPatch = {};
  if (parsed.data.title !== undefined) {
    patch.title = parsed.data.title;
  }
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
  }
  if (nextContent !== undefined) {
    patch.content = nextContent;
  }

  if (Object.keys(patch).length === 0) {
    return {
      success: true,
      data: existingCard,
    };
  }

  if (!isSupabaseConfigured()) {
    const updatedDemoCard = updateDemoRevisionCard(context.familyId, parsed.data.id, patch);
    if (!updatedDemoCard) {
      return buildDeniedResult("Fiche introuvable.");
    }

    return {
      success: true,
      data: updatedDemoCard,
    };
  }

  const supabase = await createSupabaseServerClient();
  const payload: Database["public"]["Tables"]["revision_cards"]["Update"] = {};

  if (patch.title !== undefined) {
    payload.title = patch.title;
  }
  if (patch.subject !== undefined) {
    payload.subject = patch.subject;
  }
  if (patch.level !== undefined) {
    payload.level = patch.level;
  }
  if (patch.tags !== undefined) {
    payload.tags = patch.tags;
  }
  if (patch.content !== undefined) {
    payload.type = normalizeCardTypeForStorage(patch.content.kind);
    payload.goal = patch.content.summary ?? null;
    payload.content = patch.content as unknown as Json;
    payload.content_json = patch.content as unknown as Json;
  }
  if (patch.status !== undefined) {
    payload.status = patch.status;
  }

  const { data, error } = await supabase
    .from("revision_cards")
    .update(payload)
    .eq("id", parsed.data.id)
    .eq("family_id", context.familyId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return buildDeniedResult("Impossible de modifier la fiche de revision.");
  }

  return {
    success: true,
    data: mapRevisionCardRow(data as RevisionCardRow),
  };
}

export async function updateRevisionCard(
  id: string,
  patch: UpdateRevisionCardPatch,
): Promise<RevisionMutationResult<StoredRevisionCard>> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return buildDeniedResult("Action reservee au parent.");
  }

  const parsed = updateRevisionCardPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return buildDeniedResult(parsed.error.issues[0]?.message ?? "Mise a jour invalide.");
  }

  if (!isSupabaseConfigured()) {
    return buildSupabaseNotConfiguredResult();
  }

  const supabase = await createSupabaseServerClient();
  const payload: Database["public"]["Tables"]["revision_cards"]["Update"] = {};

  if (parsed.data.title !== undefined) {
    payload.title = parsed.data.title;
  }
  if (parsed.data.subject !== undefined) {
    payload.subject = parsed.data.subject;
  }
  if (parsed.data.level !== undefined) {
    payload.level = parsed.data.level;
  }
  if (parsed.data.tags !== undefined) {
    payload.tags = parsed.data.tags;
  }
  if (parsed.data.content !== undefined) {
    payload.type = normalizeCardTypeForStorage(parsed.data.content.kind);
    payload.goal = parsed.data.content.summary ?? null;
    payload.content = parsed.data.content as unknown as Json;
    payload.content_json = parsed.data.content as unknown as Json;
  }
  if (parsed.data.status !== undefined) {
    payload.status = parsed.data.status;
  }

  const { data, error } = await supabase
    .from("revision_cards")
    .update(payload)
    .eq("id", id)
    .eq("family_id", context.familyId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return buildDeniedResult("Impossible de modifier la fiche de revision.");
  }

  return {
    success: true,
    data: mapRevisionCardRow(data as RevisionCardRow),
  };
}

export async function setRevisionCardStatus(
  id: string,
  status: RevisionCardStatus,
): Promise<RevisionMutationResult<StoredRevisionCard>> {
  return updateRevisionCard(id, { status });
}

export async function deleteRevisionCard(
  id: string,
): Promise<RevisionMutationResult<{ id: string }>> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return buildDeniedResult("Action reservee au parent.");
  }

  const parsedId = revisionCardIdSchema.safeParse(id);
  if (!parsedId.success) {
    return buildDeniedResult(parsedId.error.issues[0]?.message ?? "Identifiant invalide.");
  }

  if (!isSupabaseConfigured()) {
    return buildSupabaseNotConfiguredResult();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("revision_cards")
    .delete()
    .eq("id", parsedId.data)
    .eq("family_id", context.familyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return buildDeniedResult("Impossible de supprimer la fiche de revision.");
  }

  if (!data) {
    return buildDeniedResult("Fiche introuvable.");
  }

  return {
    success: true,
    data: {
      id: (data as Pick<RevisionCardRow, "id">).id,
    },
  };
}

function canAccessUserRevisionState(
  context: FamilyContext,
  userId: string,
): boolean {
  if (context.role === "parent") {
    return true;
  }

  if (context.role === "child") {
    return context.profileId === userId;
  }

  return false;
}

export async function getUserRevisionState(
  userId: string,
  cardId: string,
): Promise<UserRevisionState | null> {
  const context = await getFamilyContext();
  if (!context || !canAccessUserRevisionState(context, userId)) {
    return null;
  }

  if (!isSupabaseConfigured()) {
    return getDemoUserRevisionState(context.familyId, userId, cardId);
  }

  const supabase = context.useAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_revision_state")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapUserRevisionStateRow(data as UserRevisionStateRow);
}

export async function upsertUserRevisionState(
  state: UserRevisionState,
): Promise<void> {
  const context = await getFamilyContext();
  if (!context || !canAccessUserRevisionState(context, state.userId)) {
    return;
  }

  const parsed = userRevisionStateSchema.safeParse(state);
  if (!parsed.success) {
    return;
  }

  const normalizedState: UserRevisionState = {
    userId: parsed.data.userId,
    cardId: parsed.data.cardId,
    status: parsed.data.status,
    stars: parsed.data.stars,
    lastReviewedAt: parsed.data.lastReviewedAt,
    ...(parsed.data.quizScore ? { quizScore: parsed.data.quizScore } : {}),
  };

  if (!isSupabaseConfigured()) {
    upsertDemoUserRevisionState(context.familyId, normalizedState);
    return;
  }

  const supabase = context.useAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const payload: Database["public"]["Tables"]["user_revision_state"]["Insert"] = {
    family_id: context.familyId,
    user_id: normalizedState.userId,
    card_id: normalizedState.cardId,
    status: normalizedState.status,
    stars: normalizedState.stars,
    last_reviewed_at: normalizedState.lastReviewedAt,
    last_quiz_score: normalizedState.quizScore?.lastScore ?? null,
    attempts: normalizedState.quizScore?.attempts ?? 0,
  };

  const { error } = await supabase
    .from("user_revision_state")
    .upsert(payload, {
      onConflict: "user_id,card_id",
    })
    .select("user_id")
    .single();

  if (error) {
    throw new Error("Unable to persist user revision state.");
  }
}

export async function listUserRevisionStatesForUser(
  userId: string,
): Promise<UserRevisionState[]> {
  const context = await getFamilyContext();
  if (!context || !canAccessUserRevisionState(context, userId)) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    return listDemoUserRevisionStatesForUser(context.familyId, userId);
  }

  const supabase = context.useAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_revision_state")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapUserRevisionStateRow(row as UserRevisionStateRow));
}

function resolveNextProgressStatus(input: {
  status?: RevisionProgressStatus;
  completedCount?: number;
}): RevisionProgressStatus | undefined {
  if (input.status !== undefined) {
    return input.status;
  }

  if (input.completedCount !== undefined && input.completedCount > 0) {
    return "completed";
  }

  return undefined;
}

function toUpsertProgressInput(
  input: ReturnType<typeof upsertRevisionProgressInputSchema.parse>,
): UpsertRevisionProgressInput {
  const result: UpsertRevisionProgressInput = {
    revisionCardId: input.revisionCardId,
  };

  if (input.lastSeenAt !== undefined) {
    result.lastSeenAt = input.lastSeenAt;
  }
  if (input.completedCount !== undefined) {
    result.completedCount = input.completedCount;
  }
  if (input.successStreak !== undefined) {
    result.successStreak = input.successStreak;
  }
  if (input.confidenceScore !== undefined) {
    result.confidenceScore = input.confidenceScore;
  }
  if (input.status !== undefined) {
    result.status = input.status;
  }

  return result;
}

export async function upsertRevisionProgress(
  input: UpsertRevisionProgressInput,
): Promise<RevisionMutationResult<RevisionProgress>> {
  const context = await getFamilyContext();
  if (!context || context.role !== "child") {
    return buildDeniedResult("Action reservee a l'enfant.");
  }

  const parsed = upsertRevisionProgressInputSchema.safeParse(input);
  if (!parsed.success) {
    return buildDeniedResult(parsed.error.issues[0]?.message ?? "Progression invalide.");
  }

  if (!isSupabaseConfigured()) {
    return buildSupabaseNotConfiguredResult();
  }

  const supabase = context.useAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const cardQuery = supabase
    .from("revision_cards")
    .select("id,family_id,status")
    .eq("id", parsed.data.revisionCardId)
    .eq("family_id", context.familyId)
    .eq("status", "published");

  const { data: card, error: cardError } = await cardQuery.maybeSingle();

  const cardRow = card as Pick<RevisionCardRow, "id" | "family_id" | "status"> | null;
  if (cardError || !cardRow || cardRow.family_id !== context.familyId || cardRow.status !== "published") {
    return buildDeniedResult("Fiche de revision introuvable.");
  }

  const { data: existingRow, error: existingError } = await supabase
    .from("user_revision_state")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("user_id", context.profileId)
    .eq("card_id", parsed.data.revisionCardId)
    .maybeSingle();

  if (existingError) {
    return buildDeniedResult("Impossible de lire la progression.");
  }

  const nowIso = new Date().toISOString();
  const existing = existingRow
    ? mapUserRevisionStateRow(existingRow as UserRevisionStateRow)
    : null;
  const parsedInput = toUpsertProgressInput(parsed.data);
  const parsedConfidence =
    typeof parsedInput.confidenceScore === "number"
      ? parsedInput.confidenceScore
      : null;
  const nextLegacyStatus =
    parsedInput.status ??
    resolveNextProgressStatus(parsedInput) ??
    (existing ? mapUserRevisionStatusToLegacyProgressStatus(existing.status) : undefined) ??
    "in_progress";
  const shouldSetQuizScore =
    parsedConfidence !== null ||
    parsedInput.completedCount !== undefined ||
    existing?.quizScore !== undefined;
  const nextStateBase: UserRevisionState = {
    userId: context.profileId,
    cardId: parsedInput.revisionCardId,
    status: mapLegacyProgressStatusToUserRevisionStatus(nextLegacyStatus),
    stars:
      parsedConfidence !== null
        ? Math.max(0, Math.min(5, Math.round(parsedConfidence / 20)))
        : (existing?.stars ?? 0),
    lastReviewedAt: parsedInput.lastSeenAt ?? nowIso,
  };
  const nextState: UserRevisionState = shouldSetQuizScore
    ? {
        ...nextStateBase,
        quizScore: {
          lastScore: parsedConfidence ?? existing?.quizScore?.lastScore ?? 0,
          attempts: parsedInput.completedCount ?? existing?.quizScore?.attempts ?? 0,
        },
      }
    : nextStateBase;

  try {
    await upsertUserRevisionState(nextState);
  } catch {
    return buildDeniedResult("Impossible de mettre a jour la progression.");
  }

  return {
    success: true,
    data: toRevisionProgressFromUserState(nextState, context.familyId),
  };
}
