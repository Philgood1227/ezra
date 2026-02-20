import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily } from "@/lib/api/children";
import {
  listDemoKnowledgeCategoriesForSubject,
  listDemoKnowledgeFavoriteCardIds,
  listDemoKnowledgeSubjects,
} from "@/lib/demo/knowledge-store";
import {
  buildKnowledgeCategoriesForSubject,
  buildKnowledgeSubjectSummaries,
  normalizeKnowledgeContent,
} from "@/lib/domain/knowledge";
import type {
  KnowledgeCardSummary,
  KnowledgeCategorySummary,
  KnowledgeSubjectSummary,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type KnowledgeSubjectRow = Database["public"]["Tables"]["knowledge_subjects"]["Row"];
type KnowledgeCategoryRow = Database["public"]["Tables"]["knowledge_categories"]["Row"];
type KnowledgeCardRow = Database["public"]["Tables"]["knowledge_cards"]["Row"];

type KnowledgeFavoriteRow = Database["public"]["Tables"]["knowledge_favorites"]["Row"];

interface FamilyContext {
  familyId: string;
}

async function getFamilyContext(): Promise<FamilyContext | null> {
  const context = await getCurrentProfile();
  if (!context.familyId) {
    return null;
  }

  return { familyId: context.familyId };
}

function mapSubjectSummaries(
  subjects: KnowledgeSubjectRow[],
  categories: KnowledgeCategoryRow[],
  cards: KnowledgeCardRow[],
): KnowledgeSubjectSummary[] {
  return buildKnowledgeSubjectSummaries({
    subjects: subjects.map((subject) => ({
      id: subject.id,
      familyId: subject.family_id,
      code: subject.code,
      label: subject.label,
    })),
    categories: categories.map((category) => ({
      id: category.id,
      subjectId: category.subject_id,
      label: category.label,
      sortOrder: category.sort_order,
    })),
    cards: cards.map((card) => ({
      id: card.id,
      categoryId: card.category_id,
      title: card.title,
      summary: card.summary,
      difficulty: card.difficulty,
      content: normalizeKnowledgeContent(card.content),
      createdAt: card.created_at,
      updatedAt: card.updated_at,
    })),
  });
}

function mapCategories(
  subjectId: string,
  categories: KnowledgeCategoryRow[],
  cards: KnowledgeCardRow[],
  favoriteCardIds: string[],
): KnowledgeCategorySummary[] {
  return buildKnowledgeCategoriesForSubject({
    subjectId,
    categories: categories.map((category) => ({
      id: category.id,
      subjectId: category.subject_id,
      label: category.label,
      sortOrder: category.sort_order,
    })),
    cards: cards.map((card) => ({
      id: card.id,
      categoryId: card.category_id,
      title: card.title,
      summary: card.summary,
      difficulty: card.difficulty,
      content: normalizeKnowledgeContent(card.content),
      createdAt: card.created_at,
      updatedAt: card.updated_at,
    })),
    favoriteCardIds,
  });
}

export interface KnowledgeSubjectDetailData {
  subject: KnowledgeSubjectSummary | null;
  categories: KnowledgeCategorySummary[];
}

export interface ChildKnowledgePageData {
  subjects: KnowledgeSubjectSummary[];
  selectedSubjectId: string | null;
  categories: KnowledgeCategorySummary[];
  favoriteCardIds: string[];
}

export async function getKnowledgeSubjectsForCurrentFamily(): Promise<KnowledgeSubjectSummary[]> {
  const family = await getFamilyContext();
  if (!family) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoKnowledgeSubjects(family.familyId);
  }

  const supabase = await createSupabaseServerClient();
  const { data: subjectRows, error: subjectsError } = await supabase
    .from("knowledge_subjects")
    .select("*")
    .eq("family_id", family.familyId)
    .order("label", { ascending: true });

  if (subjectsError || !subjectRows || subjectRows.length === 0) {
    return [];
  }

  const subjectIds = subjectRows.map((subject) => subject.id);

  const { data: categoryRows } = await supabase
    .from("knowledge_categories")
    .select("*")
    .in("subject_id", subjectIds);

  const categoryIds = (categoryRows ?? []).map((category) => category.id);

  const { data: cardRows } = categoryIds.length
    ? await supabase.from("knowledge_cards").select("*").in("category_id", categoryIds)
    : { data: [] as KnowledgeCardRow[] };

  return mapSubjectSummaries(
    subjectRows as KnowledgeSubjectRow[],
    (categoryRows ?? []) as KnowledgeCategoryRow[],
    (cardRows ?? []) as KnowledgeCardRow[],
  );
}

export async function getKnowledgeSubjectDetailForCurrentFamily(
  subjectId: string,
): Promise<KnowledgeSubjectDetailData> {
  const family = await getFamilyContext();
  if (!family) {
    return { subject: null, categories: [] };
  }

  if (!isSupabaseEnabled()) {
    const subjects = listDemoKnowledgeSubjects(family.familyId);
    const subject = subjects.find((entry) => entry.id === subjectId) ?? null;
    return {
      subject,
      categories: subject ? listDemoKnowledgeCategoriesForSubject(family.familyId, subject.id) : [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: subjectRow } = await supabase
    .from("knowledge_subjects")
    .select("*")
    .eq("id", subjectId)
    .eq("family_id", family.familyId)
    .maybeSingle();

  if (!subjectRow) {
    return { subject: null, categories: [] };
  }

  const { data: categoryRows } = await supabase
    .from("knowledge_categories")
    .select("*")
    .eq("subject_id", subjectId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  const categoryIds = (categoryRows ?? []).map((category) => category.id);

  const { data: cardRows } = categoryIds.length
    ? await supabase
        .from("knowledge_cards")
        .select("*")
        .in("category_id", categoryIds)
        .order("title", { ascending: true })
    : { data: [] as KnowledgeCardRow[] };

  const subjectSummary = mapSubjectSummaries(
    [subjectRow as KnowledgeSubjectRow],
    (categoryRows ?? []) as KnowledgeCategoryRow[],
    (cardRows ?? []) as KnowledgeCardRow[],
  )[0] ?? null;

  return {
    subject: subjectSummary,
    categories: mapCategories(
      subjectId,
      (categoryRows ?? []) as KnowledgeCategoryRow[],
      (cardRows ?? []) as KnowledgeCardRow[],
      [],
    ),
  };
}

export async function getKnowledgeCardOptionsForCurrentFamily(): Promise<
  Array<{ id: string; title: string; subjectLabel: string; categoryLabel: string }>
> {
  const family = await getFamilyContext();
  if (!family) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    const subjects = listDemoKnowledgeSubjects(family.familyId);
    const options: Array<{ id: string; title: string; subjectLabel: string; categoryLabel: string }> = [];

    subjects.forEach((subject) => {
      const categories = listDemoKnowledgeCategoriesForSubject(family.familyId, subject.id);
      categories.forEach((category) => {
        category.cards.forEach((card) => {
          options.push({
            id: card.id,
            title: card.title,
            subjectLabel: subject.label,
            categoryLabel: category.label,
          });
        });
      });
    });

    return options;
  }

  const supabase = await createSupabaseServerClient();
  const { data: subjectRows } = await supabase
    .from("knowledge_subjects")
    .select("id, label")
    .eq("family_id", family.familyId);

  if (!subjectRows || subjectRows.length === 0) {
    return [];
  }

  const subjectLabelById = new Map(subjectRows.map((subject) => [subject.id, subject.label]));

  const { data: categoryRows } = await supabase
    .from("knowledge_categories")
    .select("id, label, subject_id")
    .in("subject_id", subjectRows.map((subject) => subject.id));

  if (!categoryRows || categoryRows.length === 0) {
    return [];
  }

  const categoryMetaById = new Map(
    categoryRows.map((category) => [
      category.id,
      {
        categoryLabel: category.label,
        subjectLabel: subjectLabelById.get(category.subject_id) ?? "Matiere",
      },
    ]),
  );

  const { data: cardRows } = await supabase
    .from("knowledge_cards")
    .select("id, title, category_id")
    .in("category_id", categoryRows.map((category) => category.id))
    .order("title", { ascending: true });

  if (!cardRows) {
    return [];
  }

  return cardRows
    .map((card) => {
      const category = categoryMetaById.get(card.category_id);
      if (!category) {
        return null;
      }

      return {
        id: card.id,
        title: card.title,
        subjectLabel: category.subjectLabel,
        categoryLabel: category.categoryLabel,
      };
    })
    .filter((entry): entry is { id: string; title: string; subjectLabel: string; categoryLabel: string } => entry !== null);
}

export async function getKnowledgeCardByIdForCurrentFamily(
  cardId: string,
): Promise<KnowledgeCardSummary | null> {
  const family = await getFamilyContext();
  if (!family) {
    return null;
  }

  if (!isSupabaseEnabled()) {
    const subjects = listDemoKnowledgeSubjects(family.familyId);
    for (const subject of subjects) {
      const categories = listDemoKnowledgeCategoriesForSubject(family.familyId, subject.id);
      for (const category of categories) {
        const card = category.cards.find((entry) => entry.id === cardId);
        if (card) {
          return card;
        }
      }
    }

    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: cardRow } = await supabase
    .from("knowledge_cards")
    .select("*")
    .eq("id", cardId)
    .maybeSingle();

  if (!cardRow) {
    return null;
  }

  return {
    id: cardRow.id,
    categoryId: cardRow.category_id,
    title: cardRow.title,
    summary: cardRow.summary,
    difficulty: cardRow.difficulty,
    content: normalizeKnowledgeContent(cardRow.content),
    isFavorite: false,
    createdAt: cardRow.created_at,
    updatedAt: cardRow.updated_at,
  };
}

export async function getKnowledgePageDataForCurrentChild(
  selectedSubjectId?: string,
  selectedCardId?: string,
): Promise<ChildKnowledgePageData> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  const context = await getCurrentProfile();

  if (!context.familyId || !child) {
    return {
      subjects: [],
      selectedSubjectId: null,
      categories: [],
      favoriteCardIds: [],
    };
  }

  if (!isSupabaseEnabled()) {
    const subjects = listDemoKnowledgeSubjects(context.familyId);
    const selected =
      (selectedSubjectId && subjects.find((subject) => subject.id === selectedSubjectId)?.id) ??
      (selectedCardId
        ? (() => {
            for (const subject of subjects) {
              const categories = listDemoKnowledgeCategoriesForSubject(context.familyId, subject.id, child.id);
              if (categories.some((category) => category.cards.some((card) => card.id === selectedCardId))) {
                return subject.id;
              }
            }
            return null;
          })()
        : null) ??
      subjects[0]?.id ??
      null;

    const favoriteCardIds = listDemoKnowledgeFavoriteCardIds(context.familyId, child.id);

    return {
      subjects,
      selectedSubjectId: selected,
      categories: selected
        ? listDemoKnowledgeCategoriesForSubject(context.familyId, selected, child.id)
        : [],
      favoriteCardIds,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: subjectRows } = await supabase
    .from("knowledge_subjects")
    .select("*")
    .eq("family_id", context.familyId)
    .order("label", { ascending: true });

  if (!subjectRows || subjectRows.length === 0) {
    return {
      subjects: [],
      selectedSubjectId: null,
      categories: [],
      favoriteCardIds: [],
    };
  }

  const subjectIds = subjectRows.map((subject) => subject.id);

  const { data: categoryRows } = await supabase
    .from("knowledge_categories")
    .select("*")
    .in("subject_id", subjectIds);

  const categoryIds = (categoryRows ?? []).map((category) => category.id);

  const [{ data: cardRows }, { data: favoriteRows }] = await Promise.all([
    categoryIds.length
      ? supabase.from("knowledge_cards").select("*").in("category_id", categoryIds)
      : Promise.resolve({ data: [] as KnowledgeCardRow[] }),
    supabase
      .from("knowledge_favorites")
      .select("*")
      .eq("child_profile_id", child.id),
  ]);

  const subjects = mapSubjectSummaries(
    subjectRows as KnowledgeSubjectRow[],
    (categoryRows ?? []) as KnowledgeCategoryRow[],
    (cardRows ?? []) as KnowledgeCardRow[],
  );

  const selected =
    (selectedSubjectId && subjects.find((subject) => subject.id === selectedSubjectId)?.id) ??
    (selectedCardId
      ? (() => {
          const card = (cardRows ?? []).find((row) => row.id === selectedCardId) as KnowledgeCardRow | undefined;
          if (!card) {
            return null;
          }

          const category = (categoryRows ?? []).find((row) => row.id === card.category_id);
          if (!category) {
            return null;
          }

          return subjects.find((subject) => subject.id === category.subject_id)?.id ?? null;
        })()
      : null) ??
    subjects[0]?.id ??
    null;

  const favoriteCardIds = (favoriteRows ?? []).map((favorite) => (favorite as KnowledgeFavoriteRow).card_id);

  return {
    subjects,
    selectedSubjectId: selected,
    categories: selected
      ? mapCategories(
          selected,
          (categoryRows ?? []) as KnowledgeCategoryRow[],
          (cardRows ?? []) as KnowledgeCardRow[],
          favoriteCardIds,
        )
      : [],
    favoriteCardIds,
  };
}
