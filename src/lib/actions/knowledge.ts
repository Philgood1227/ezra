"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  deleteDemoKnowledgeCard,
  deleteDemoKnowledgeCategory,
  deleteDemoKnowledgeSubject,
  setDemoKnowledgeFavorite,
  upsertDemoKnowledgeCard,
  upsertDemoKnowledgeCategory,
  upsertDemoKnowledgeSubject,
} from "@/lib/demo/knowledge-store";
import { normalizeKnowledgeContent } from "@/lib/domain/knowledge";
import type {
  ActionResult,
  KnowledgeCardInput,
  KnowledgeCategoryInput,
  KnowledgeSubjectInput,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const subjectSchema = z.object({
  code: z.string().trim().min(2, "Le code est requis."),
  label: z.string().trim().min(2, "Le nom de la matiere est requis."),
});

const categorySchema = z.object({
  subjectId: z.string().uuid("Matiere invalide."),
  label: z.string().trim().min(2, "Le nom de la categorie est requis."),
  sortOrder: z.number().int().min(0).max(999),
});

const sectionSchema = z.object({
  title: z.string().trim().min(1, "Titre de section requis."),
  text: z.string().trim(),
  bullets: z.array(z.string().trim()).max(8),
});

const cardSchema = z.object({
  categoryId: z.string().uuid("Categorie invalide."),
  title: z.string().trim().min(2, "Le titre est requis."),
  summary: z.string().trim().max(240).nullable(),
  difficulty: z.string().trim().max(40).nullable(),
  content: z.object({
    sections: z.array(sectionSchema).min(1, "Ajoutez au moins une section."),
  }),
});

function normalizeCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function revalidateKnowledgePaths(): void {
  revalidatePath("/parent/knowledge");
  revalidatePath("/child/knowledge");
  revalidatePath("/child/my-day");
  revalidatePath("/parent/day-templates");
}

async function requireParentFamilyId(): Promise<string | null> {
  const context = await getCurrentProfile();
  if (context.role !== "parent" || !context.familyId) {
    return null;
  }

  return context.familyId;
}

async function requireChildContext(): Promise<{ familyId: string; childId: string } | null> {
  const context = await getCurrentProfile();
  if (context.role !== "child" || !context.familyId || !context.profile?.id) {
    return null;
  }

  return {
    familyId: context.familyId,
    childId: context.profile.id,
  };
}

export async function createKnowledgeSubjectAction(
  input: KnowledgeSubjectInput,
): Promise<ActionResult<{ id: string }>> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const payload = {
    code: normalizeCode(parsed.data.code || parsed.data.label),
    label: parsed.data.label,
  };

  if (!isSupabaseEnabled()) {
    const created = upsertDemoKnowledgeSubject(familyId, payload);
    revalidateKnowledgePaths();
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("knowledge_subjects")
    .insert({
      family_id: familyId,
      code: payload.code,
      label: payload.label,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible de creer la matiere." };
  }

  revalidateKnowledgePaths();
  return { success: true, data: { id: data.id } };
}

export async function updateKnowledgeSubjectAction(
  subjectId: string,
  input: KnowledgeSubjectInput,
): Promise<ActionResult> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    upsertDemoKnowledgeSubject(
      familyId,
      {
        code: normalizeCode(parsed.data.code || parsed.data.label),
        label: parsed.data.label,
      },
      subjectId,
    );
    revalidateKnowledgePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("knowledge_subjects")
    .update({
      code: normalizeCode(parsed.data.code || parsed.data.label),
      label: parsed.data.label,
    })
    .eq("id", subjectId)
    .eq("family_id", familyId);

  if (error) {
    return { success: false, error: "Impossible de modifier la matiere." };
  }

  revalidateKnowledgePaths();
  return { success: true };
}

export async function deleteKnowledgeSubjectAction(subjectId: string): Promise<ActionResult> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const deleted = deleteDemoKnowledgeSubject(familyId, subjectId);
    if (!deleted) {
      return { success: false, error: "Matiere introuvable." };
    }
    revalidateKnowledgePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("knowledge_subjects")
    .delete()
    .eq("id", subjectId)
    .eq("family_id", familyId);

  if (error) {
    return { success: false, error: "Impossible de supprimer cette matiere." };
  }

  revalidateKnowledgePaths();
  return { success: true };
}

export async function createKnowledgeCategoryAction(
  input: KnowledgeCategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const created = upsertDemoKnowledgeCategory(familyId, parsed.data);
    if (!created) {
      return { success: false, error: "Matiere introuvable." };
    }
    revalidateKnowledgePaths();
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("knowledge_categories")
    .insert({
      subject_id: parsed.data.subjectId,
      label: parsed.data.label,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible de creer la categorie." };
  }

  revalidateKnowledgePaths();
  return { success: true, data: { id: data.id } };
}

export async function updateKnowledgeCategoryAction(
  categoryId: string,
  input: KnowledgeCategoryInput,
): Promise<ActionResult> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const updated = upsertDemoKnowledgeCategory(familyId, parsed.data, categoryId);
    if (!updated) {
      return { success: false, error: "Categorie introuvable." };
    }
    revalidateKnowledgePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("knowledge_categories")
    .update({
      subject_id: parsed.data.subjectId,
      label: parsed.data.label,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", categoryId);

  if (error) {
    return { success: false, error: "Impossible de modifier la categorie." };
  }

  revalidateKnowledgePaths();
  return { success: true };
}

export async function deleteKnowledgeCategoryAction(categoryId: string): Promise<ActionResult> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const deleted = deleteDemoKnowledgeCategory(familyId, categoryId);
    if (!deleted) {
      return { success: false, error: "Categorie introuvable." };
    }

    revalidateKnowledgePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("knowledge_categories").delete().eq("id", categoryId);

  if (error) {
    return { success: false, error: "Impossible de supprimer cette categorie." };
  }

  revalidateKnowledgePaths();
  return { success: true };
}

export async function createKnowledgeCardAction(
  input: KnowledgeCardInput,
): Promise<ActionResult<{ id: string }>> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = cardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const payload = {
    categoryId: parsed.data.categoryId,
    title: parsed.data.title,
    summary: parsed.data.summary,
    difficulty: parsed.data.difficulty,
    content: normalizeKnowledgeContent(parsed.data.content),
  };

  if (!isSupabaseEnabled()) {
    const created = upsertDemoKnowledgeCard(familyId, payload);
    if (!created) {
      return { success: false, error: "Categorie introuvable." };
    }

    revalidateKnowledgePaths();
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("knowledge_cards")
    .insert({
      category_id: payload.categoryId,
      title: payload.title,
      summary: payload.summary,
      difficulty: payload.difficulty,
      content: payload.content as unknown as Json,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible de creer la fiche." };
  }

  revalidateKnowledgePaths();
  return { success: true, data: { id: data.id } };
}

export async function updateKnowledgeCardAction(
  cardId: string,
  input: KnowledgeCardInput,
): Promise<ActionResult> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = cardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const payload = {
    categoryId: parsed.data.categoryId,
    title: parsed.data.title,
    summary: parsed.data.summary,
    difficulty: parsed.data.difficulty,
    content: normalizeKnowledgeContent(parsed.data.content),
  };

  if (!isSupabaseEnabled()) {
    const updated = upsertDemoKnowledgeCard(familyId, payload, cardId);
    if (!updated) {
      return { success: false, error: "Fiche introuvable." };
    }

    revalidateKnowledgePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("knowledge_cards")
    .update({
      category_id: payload.categoryId,
      title: payload.title,
      summary: payload.summary,
      difficulty: payload.difficulty,
      content: payload.content as unknown as Json,
    })
    .eq("id", cardId);

  if (error) {
    return { success: false, error: "Impossible de modifier la fiche." };
  }

  revalidateKnowledgePaths();
  return { success: true };
}

export async function deleteKnowledgeCardAction(cardId: string): Promise<ActionResult> {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const deleted = deleteDemoKnowledgeCard(familyId, cardId);
    if (!deleted) {
      return { success: false, error: "Fiche introuvable." };
    }

    revalidateKnowledgePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("knowledge_cards").delete().eq("id", cardId);

  if (error) {
    return { success: false, error: "Impossible de supprimer cette fiche." };
  }

  revalidateKnowledgePaths();
  return { success: true };
}

export async function setKnowledgeFavoriteAction(
  cardId: string,
  isFavorite: boolean,
): Promise<ActionResult> {
  const context = await requireChildContext();
  if (!context) {
    return { success: false, error: "Action reservee a l'enfant." };
  }

  if (!isSupabaseEnabled()) {
    setDemoKnowledgeFavorite(context.familyId, context.childId, cardId, isFavorite);
    revalidatePath("/child/knowledge");
    revalidatePath("/child/my-day");
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();

  if (isFavorite) {
    const { error } = await supabase.from("knowledge_favorites").upsert(
      {
        child_profile_id: context.childId,
        card_id: cardId,
      },
      {
        onConflict: "child_profile_id,card_id",
      },
    );

    if (error) {
      return { success: false, error: "Impossible d'ajouter ce favori." };
    }
  } else {
    const { error } = await supabase
      .from("knowledge_favorites")
      .delete()
      .eq("child_profile_id", context.childId)
      .eq("card_id", cardId);

    if (error) {
      return { success: false, error: "Impossible de retirer ce favori." };
    }
  }

  revalidatePath("/child/knowledge");
  revalidatePath("/child/my-day");
  return { success: true };
}
