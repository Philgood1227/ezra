"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  addDemoChecklistTemplateItem,
  deleteDemoChecklistTemplate,
  deleteDemoChecklistTemplateItem,
  moveDemoChecklistTemplateItem,
  toggleDemoChecklistItem,
  updateDemoChecklistTemplateItem,
  upsertDemoChecklistTemplate,
} from "@/lib/demo/school-diary-store";
import type {
  ActionResult,
  ChecklistTemplateInput,
  ChecklistTemplateItemInput,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const checklistTemplateSchema = z.object({
  type: z.enum(["piscine", "sortie", "evaluation", "quotidien", "autre"]),
  label: z.string().trim().min(2, "Le nom du modele est obligatoire."),
  description: z.string().trim().max(300).nullable(),
  isDefault: z.boolean(),
});

const checklistItemSchema = z.object({
  label: z.string().trim().min(2, "Le texte de l'item est obligatoire.").max(120),
});

const toggleItemSchema = z.object({
  itemId: z.string().uuid("Item invalide."),
  isChecked: z.boolean(),
});

interface ParentContext {
  familyId: string;
}

async function requireParentContext(): Promise<ParentContext | null> {
  const context = await getCurrentProfile();
  if (context.role !== "parent" || !context.familyId) {
    return null;
  }

  return { familyId: context.familyId };
}

function revalidateChecklistPages(): void {
  revalidatePath("/parent/checklists");
  revalidatePath("/parent/school-diary");
  revalidatePath("/child/checklists");
  revalidatePath("/child/my-day");
}

export async function createChecklistTemplateAction(
  input: ChecklistTemplateInput,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = checklistTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const created = upsertDemoChecklistTemplate(context.familyId, parsed.data);
    revalidateChecklistPages();
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();

  if (parsed.data.isDefault) {
    await supabase
      .from("checklist_templates")
      .update({ is_default: false })
      .eq("family_id", context.familyId)
      .eq("type", parsed.data.type)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("checklist_templates")
    .insert({
      family_id: context.familyId,
      type: parsed.data.type,
      label: parsed.data.label,
      description: parsed.data.description,
      is_default: parsed.data.isDefault,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible de creer ce modele de checklist." };
  }

  revalidateChecklistPages();
  return { success: true, data: { id: data.id } };
}

export async function updateChecklistTemplateAction(
  templateId: string,
  input: ChecklistTemplateInput,
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = checklistTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    upsertDemoChecklistTemplate(context.familyId, parsed.data, templateId);
    revalidateChecklistPages();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();

  if (parsed.data.isDefault) {
    await supabase
      .from("checklist_templates")
      .update({ is_default: false })
      .eq("family_id", context.familyId)
      .eq("type", parsed.data.type)
      .neq("id", templateId)
      .eq("is_default", true);
  }

  const { error } = await supabase
    .from("checklist_templates")
    .update({
      type: parsed.data.type,
      label: parsed.data.label,
      description: parsed.data.description,
      is_default: parsed.data.isDefault,
    })
    .eq("id", templateId)
    .eq("family_id", context.familyId);

  if (error) {
    return { success: false, error: "Impossible de modifier ce modele." };
  }

  revalidateChecklistPages();
  return { success: true };
}

export async function deleteChecklistTemplateAction(templateId: string): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const deleted = deleteDemoChecklistTemplate(context.familyId, templateId);
    if (!deleted) {
      return { success: false, error: "Modele introuvable." };
    }
    revalidateChecklistPages();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("checklist_templates")
    .delete()
    .eq("id", templateId)
    .eq("family_id", context.familyId);

  if (error) {
    return { success: false, error: "Impossible de supprimer ce modele." };
  }

  revalidateChecklistPages();
  return { success: true };
}

export async function addChecklistTemplateItemAction(
  templateId: string,
  input: ChecklistTemplateItemInput,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = checklistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const created = addDemoChecklistTemplateItem(context.familyId, templateId, parsed.data.label);
    if (!created) {
      return { success: false, error: "Modele introuvable." };
    }

    revalidateChecklistPages();
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("id", templateId)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!template) {
    return { success: false, error: "Modele introuvable." };
  }

  const { data: existingItems } = await supabase
    .from("checklist_items")
    .select("id")
    .eq("template_id", templateId);

  const sortOrder = existingItems?.length ?? 0;

  const { data, error } = await supabase
    .from("checklist_items")
    .insert({
      template_id: templateId,
      label: parsed.data.label,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible d'ajouter cet item." };
  }

  revalidateChecklistPages();
  return { success: true, data: { id: data.id } };
}

export async function updateChecklistTemplateItemAction(
  itemId: string,
  input: ChecklistTemplateItemInput,
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = checklistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const updated = updateDemoChecklistTemplateItem(context.familyId, itemId, parsed.data.label);
    if (!updated) {
      return { success: false, error: "Item introuvable." };
    }
    revalidateChecklistPages();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: item } = await supabase
    .from("checklist_items")
    .select("id, template_id")
    .eq("id", itemId)
    .maybeSingle();

  if (!item) {
    return { success: false, error: "Item introuvable." };
  }

  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("id", item.template_id)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!template) {
    return { success: false, error: "Action non autorisee." };
  }

  const { error } = await supabase
    .from("checklist_items")
    .update({ label: parsed.data.label })
    .eq("id", itemId);

  if (error) {
    return { success: false, error: "Impossible de modifier cet item." };
  }

  revalidateChecklistPages();
  return { success: true };
}

export async function moveChecklistTemplateItemAction(
  itemId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const moved = moveDemoChecklistTemplateItem(context.familyId, itemId, direction);
    if (!moved) {
      return { success: false, error: "Item introuvable." };
    }
    revalidateChecklistPages();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: item } = await supabase
    .from("checklist_items")
    .select("id, template_id, sort_order")
    .eq("id", itemId)
    .maybeSingle();

  if (!item) {
    return { success: false, error: "Item introuvable." };
  }

  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("id", item.template_id)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!template) {
    return { success: false, error: "Action non autorisee." };
  }

  const { data: siblings } = await supabase
    .from("checklist_items")
    .select("id, sort_order")
    .eq("template_id", item.template_id)
    .order("sort_order", { ascending: true });

  const currentIndex = (siblings ?? []).findIndex((entry) => entry.id === itemId);
  const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || !siblings || swapIndex < 0 || swapIndex >= siblings.length) {
    return { success: true };
  }

  const current = siblings[currentIndex];
  const swap = siblings[swapIndex];

  if (!current || !swap) {
    return { success: false, error: "Impossible de reordonner les items." };
  }

  const [first, second] = await Promise.all([
    supabase.from("checklist_items").update({ sort_order: swap.sort_order }).eq("id", current.id),
    supabase.from("checklist_items").update({ sort_order: current.sort_order }).eq("id", swap.id),
  ]);

  if (first.error || second.error) {
    return { success: false, error: "Impossible de reordonner les items." };
  }

  revalidateChecklistPages();
  return { success: true };
}

export async function deleteChecklistTemplateItemAction(itemId: string): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const deleted = deleteDemoChecklistTemplateItem(context.familyId, itemId);
    if (!deleted) {
      return { success: false, error: "Item introuvable." };
    }
    revalidateChecklistPages();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: item } = await supabase
    .from("checklist_items")
    .select("id, template_id")
    .eq("id", itemId)
    .maybeSingle();

  if (!item) {
    return { success: false, error: "Item introuvable." };
  }

  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("id", item.template_id)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!template) {
    return { success: false, error: "Action non autorisee." };
  }

  const { error } = await supabase.from("checklist_items").delete().eq("id", itemId);
  if (error) {
    return { success: false, error: "Impossible de supprimer cet item." };
  }

  revalidateChecklistPages();
  return { success: true };
}

export async function toggleChecklistInstanceItemAction(
  payload: unknown,
): Promise<ActionResult<{ checklistInstanceId: string; isChecked: boolean }>> {
  const parsed = toggleItemSchema.safeParse(payload);
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
    const updated = toggleDemoChecklistItem(
      context.familyId,
      context.role === "child" ? context.profile.id : "dev-child-id",
      parsed.data.itemId,
      parsed.data.isChecked,
    );

    if (!updated) {
      return { success: false, error: "Item introuvable." };
    }

    revalidateChecklistPages();

    return {
      success: true,
      data: {
        checklistInstanceId: updated.id,
        isChecked: parsed.data.isChecked,
      },
    };
  }

  const shouldUseAdminClientForChildPin =
    context.source === "child-pin" &&
    context.role === "child" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = shouldUseAdminClientForChildPin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { data: item } = await supabase
    .from("checklist_instance_items")
    .select("id, checklist_instance_id")
    .eq("id", parsed.data.itemId)
    .maybeSingle();

  if (!item) {
    return { success: false, error: "Item introuvable." };
  }

  const { data: instance } = await supabase
    .from("checklist_instances")
    .select("id, family_id, child_profile_id")
    .eq("id", item.checklist_instance_id)
    .maybeSingle();

  if (!instance || instance.family_id !== context.familyId) {
    return { success: false, error: "Action non autorisee." };
  }

  if (context.role === "child" && instance.child_profile_id !== context.profile.id) {
    return { success: false, error: "Action non autorisee." };
  }

  const { error } = await supabase
    .from("checklist_instance_items")
    .update({ is_checked: parsed.data.isChecked })
    .eq("id", parsed.data.itemId);

  if (error) {
    return { success: false, error: "Impossible de mettre a jour cet item." };
  }

  revalidateChecklistPages();

  return {
    success: true,
    data: {
      checklistInstanceId: item.checklist_instance_id,
      isChecked: parsed.data.isChecked,
    },
  };
}
