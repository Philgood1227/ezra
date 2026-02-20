"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  createDemoCategory,
  createDemoTemplateBlock,
  createDemoTemplateTask,
  deleteDemoCategory,
  deleteDemoSchoolPeriod,
  deleteDemoTemplate,
  deleteDemoTemplateBlock,
  deleteDemoTemplateTask,
  listDemoCategories,
  listDemoTemplateBlocks,
  listDemoTemplateTasks,
  listDemoTemplates,
  moveDemoTemplateTask,
  updateDemoCategory,
  updateDemoTemplateBlock,
  updateDemoTemplateTask,
  upsertDemoSchoolPeriod,
  upsertDemoTemplate,
} from "@/lib/demo/day-templates-store";
import { timeToMinutes } from "@/lib/day-templates/time";
import type {
  ActionResult,
  CategoryInput,
  DayTemplateBlockInput,
  DayTemplateBlockSummary,
  SchoolPeriodInput,
  TemplateInput,
  TemplateTaskInput,
  TemplateTaskSummary,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Le nom de la categorie est obligatoire."),
  icon: z.string().trim().min(1, "L'icone est obligatoire."),
  colorKey: z.string().trim().min(1, "La couleur est obligatoire."),
  defaultItemKind: z.enum(["activity", "mission", "leisure"]).nullable().optional(),
});

const templateSchema = z.object({
  name: z.string().trim().min(2, "Le nom de la journee type est obligatoire."),
  weekday: z.number().int().min(0).max(6),
  isDefault: z.boolean(),
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const taskSchema = z.object({
  categoryId: z.string().uuid("Categorie invalide."),
  itemKind: z.enum(["activity", "mission", "leisure"]).optional(),
  itemSubkind: z.string().trim().max(60).nullable().optional(),
  assignedProfileId: z.string().trim().min(1, "Assignation invalide.").max(120).nullable(),
  title: z.string().trim().min(2, "Le titre est obligatoire."),
  description: z.string().trim().max(280).nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de debut invalide."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de fin invalide."),
  pointsBase: z.number().int().min(0).max(99),
  knowledgeCardId: z.string().uuid("Fiche invalide.").nullable(),
});

const blockSchema = z.object({
  blockType: z.enum(["school", "home", "transport", "club", "daycare", "free_time", "other"]),
  label: z.string().trim().max(100).nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de debut invalide."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de fin invalide."),
});

const schoolPeriodSchema = z.object({
  periodType: z.enum(["vacances", "jour_special"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de debut invalide."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin invalide."),
  label: z.string().trim().min(2, "Le libelle est obligatoire.").max(120),
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

function validateTimeRange(startTime: string, endTime: string): string | null {
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return "L'heure de fin doit etre apres l'heure de debut.";
  }

  return null;
}

interface ExistingTimeRange {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

function hasTimeOverlap(
  candidateStartTime: string,
  candidateEndTime: string,
  rangeStartTime: string,
  rangeEndTime: string,
): boolean {
  const candidateStart = timeToMinutes(candidateStartTime);
  const candidateEnd = timeToMinutes(candidateEndTime);
  const rangeStart = timeToMinutes(rangeStartTime);
  const rangeEnd = timeToMinutes(rangeEndTime);

  return candidateStart < rangeEnd && rangeStart < candidateEnd;
}

function findOverlapRange(input: {
  candidateStartTime: string;
  candidateEndTime: string;
  ranges: ExistingTimeRange[];
  excludeId?: string;
}): ExistingTimeRange | null {
  return (
    input.ranges.find((range) => {
      if (range.id === input.excludeId) {
        return false;
      }

      return hasTimeOverlap(input.candidateStartTime, input.candidateEndTime, range.startTime, range.endTime);
    }) ?? null
  );
}

function buildTaskOverlapError(range: ExistingTimeRange): string {
  return `Cette tache chevauche "${range.label}" (${range.startTime} - ${range.endTime}). Ajustez l'horaire.`;
}

function buildBlockOverlapError(range: ExistingTimeRange): string {
  return `Cette plage chevauche "${range.label}" (${range.startTime} - ${range.endTime}). Ajustez l'horaire.`;
}

function toTaskRangeSummary(task: Pick<TemplateTaskSummary, "id" | "title" | "startTime" | "endTime">): ExistingTimeRange {
  return {
    id: task.id,
    label: task.title.trim() || "Tache",
    startTime: task.startTime,
    endTime: task.endTime,
  };
}

function toBlockRangeSummary(
  block: Pick<DayTemplateBlockSummary, "id" | "label" | "startTime" | "endTime">,
): ExistingTimeRange {
  return {
    id: block.id,
    label: block.label?.trim() || "Plage",
    startTime: block.startTime,
    endTime: block.endTime,
  };
}

function sanitizeTaskInput(input: TemplateTaskInput): TemplateTaskInput {
  const sanitized: TemplateTaskInput = {
    categoryId: input.categoryId,
    itemSubkind: input.itemSubkind?.trim() ? input.itemSubkind.trim() : null,
    assignedProfileId: input.assignedProfileId ?? null,
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    startTime: input.startTime,
    endTime: input.endTime,
    pointsBase: Math.max(0, Math.trunc(input.pointsBase)),
    knowledgeCardId: input.knowledgeCardId ?? null,
  };

  if (input.itemKind) {
    sanitized.itemKind = input.itemKind;
  }

  return sanitized;
}

function sanitizeBlockInput(input: DayTemplateBlockInput): DayTemplateBlockInput {
  return {
    blockType: input.blockType,
    label: input.label?.trim() ? input.label.trim() : null,
    startTime: input.startTime,
    endTime: input.endTime,
  };
}

function validateDateRange(startDate: string, endDate: string): string | null {
  if (startDate > endDate) {
    return "La date de fin doit etre apres la date de debut.";
  }

  return null;
}

function revalidateTemplatePaths(templateId?: string): void {
  revalidatePath("/parent/day-templates");
  revalidatePath("/parent/categories");
  revalidatePath("/parent/dashboard");
  if (templateId) {
    revalidatePath(`/parent/day-templates/${templateId}`);
  }
  revalidatePath("/child");
  revalidatePath("/child/my-day");
}

const EZRA_CATEGORY_PACK: CategoryInput[] = [
  { name: "Routine", icon: "🧩", colorKey: "category-routine", defaultItemKind: "mission" },
  { name: "Ecole", icon: "📚", colorKey: "category-ecole", defaultItemKind: "mission" },
  { name: "Repas", icon: "🍽️", colorKey: "category-repas", defaultItemKind: "activity" },
  { name: "Hygiene", icon: "🪥", colorKey: "category-loisir", defaultItemKind: "mission" },
  { name: "Deplacements", icon: "🚌", colorKey: "category-ecole", defaultItemKind: "activity" },
  { name: "Activite physique", icon: "⚽", colorKey: "category-sport", defaultItemKind: "activity" },
  { name: "Temps calme", icon: "🌿", colorKey: "category-calme", defaultItemKind: "leisure" },
  { name: "Sommeil", icon: "🛏️", colorKey: "category-sommeil", defaultItemKind: "leisure" },
];

function firstIssueMessage(issues: z.ZodIssue[], fallback: string): string {
  return issues[0]?.message ?? fallback;
}

function supabaseWriteErrorMessage(
  error: PostgrestError | null,
  fallback: string,
  tableName: "day_template_blocks" | "school_periods",
): string {
  if (!error) {
    return fallback;
  }

  if (error.code === "PGRST205") {
    return `Configuration Supabase incomplete: table ${tableName} indisponible. Appliquez la migration 20260213170000_day_template_blocks_school_calendar.`;
  }

  if (error.code === "42501") {
    return "Action non autorisee (droits insuffisants).";
  }

  return fallback;
}

function isUuidLike(value: string): boolean {
  return uuidPattern.test(value);
}

export async function createCategoryAction(
  input: CategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstIssueMessage(parsed.error.issues, "Saisie invalide pour la categorie."),
    };
  }

  const categoryPayload: CategoryInput = {
    name: parsed.data.name,
    icon: parsed.data.icon,
    colorKey: parsed.data.colorKey,
    defaultItemKind: parsed.data.defaultItemKind ?? null,
  };

  if (!isSupabaseEnabled()) {
    const category = createDemoCategory(context.familyId, categoryPayload);
    revalidateTemplatePaths();
    return { success: true, data: { id: category.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("task_categories")
    .insert({
      family_id: context.familyId,
      name: categoryPayload.name,
      icon: categoryPayload.icon,
      color_key: categoryPayload.colorKey,
      default_item_kind: categoryPayload.defaultItemKind ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible de creer la categorie pour le moment." };
  }

  revalidateTemplatePaths();
  return { success: true, data: { id: data.id } };
}

export async function updateCategoryAction(
  categoryId: string,
  input: CategoryInput,
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstIssueMessage(parsed.error.issues, "Saisie invalide pour la categorie."),
    };
  }

  const categoryPayload: CategoryInput = {
    name: parsed.data.name,
    icon: parsed.data.icon,
    colorKey: parsed.data.colorKey,
    defaultItemKind: parsed.data.defaultItemKind ?? null,
  };

  if (!isSupabaseEnabled()) {
    const updated = updateDemoCategory(context.familyId, categoryId, categoryPayload);
    if (!updated) {
      return { success: false, error: "Categorie introuvable." };
    }
    revalidateTemplatePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("task_categories")
    .update({
      name: categoryPayload.name,
      icon: categoryPayload.icon,
      color_key: categoryPayload.colorKey,
      default_item_kind: categoryPayload.defaultItemKind ?? null,
    })
    .eq("id", categoryId)
    .eq("family_id", context.familyId);

  if (error) {
    return { success: false, error: "Impossible de modifier cette categorie." };
  }

  revalidateTemplatePaths();
  return { success: true };
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const result = deleteDemoCategory(context.familyId, categoryId);
    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "Impossible de supprimer cette categorie.",
      };
    }
    revalidateTemplatePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: linkedTask, error: linkedTaskError } = await supabase
    .from("template_tasks")
    .select("id")
    .eq("category_id", categoryId)
    .limit(1)
    .maybeSingle();

  if (linkedTaskError) {
    return { success: false, error: "Impossible de verifier l'utilisation de la categorie." };
  }

  if (linkedTask) {
    return { success: false, error: "Cette categorie est utilisee dans une journee type." };
  }

  const { error } = await supabase
    .from("task_categories")
    .delete()
    .eq("id", categoryId)
    .eq("family_id", context.familyId);

  if (error) {
    return { success: false, error: "Impossible de supprimer cette categorie." };
  }

  revalidateTemplatePaths();
  return { success: true };
}

export async function createTemplateAction(
  input: TemplateInput,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstIssueMessage(parsed.error.issues, "Saisie invalide pour la journee type."),
    };
  }

  if (!isSupabaseEnabled()) {
    const template = upsertDemoTemplate(context.familyId, parsed.data);
    revalidateTemplatePaths(template.id);
    return { success: true, data: { id: template.id } };
  }

  const supabase = await createSupabaseServerClient();

  if (parsed.data.isDefault) {
    await supabase
      .from("day_templates")
      .update({ is_default: false })
      .eq("family_id", context.familyId)
      .eq("weekday", parsed.data.weekday)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("day_templates")
    .insert({
      family_id: context.familyId,
      name: parsed.data.name,
      weekday: parsed.data.weekday,
      is_default: parsed.data.isDefault,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible de creer la journee type pour le moment." };
  }

  revalidateTemplatePaths(data.id);
  return { success: true, data: { id: data.id } };
}

export async function updateTemplateAction(
  templateId: string,
  input: TemplateInput,
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstIssueMessage(parsed.error.issues, "Saisie invalide pour la journee type."),
    };
  }

  if (!isSupabaseEnabled()) {
    const template = upsertDemoTemplate(context.familyId, {
      id: templateId,
      ...parsed.data,
    });
    revalidateTemplatePaths(template.id);
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();

  if (parsed.data.isDefault) {
    await supabase
      .from("day_templates")
      .update({ is_default: false })
      .eq("family_id", context.familyId)
      .eq("weekday", parsed.data.weekday)
      .neq("id", templateId)
      .eq("is_default", true);
  }

  const { error } = await supabase
    .from("day_templates")
    .update({
      name: parsed.data.name,
      weekday: parsed.data.weekday,
      is_default: parsed.data.isDefault,
    })
    .eq("id", templateId)
    .eq("family_id", context.familyId);

  if (error) {
    return { success: false, error: "Impossible de modifier cette journee type." };
  }

  revalidateTemplatePaths(templateId);
  return { success: true };
}

export async function deleteTemplateAction(templateId: string): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    deleteDemoTemplate(context.familyId, templateId);
    revalidateTemplatePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("day_templates")
    .delete()
    .eq("id", templateId)
    .eq("family_id", context.familyId);

  if (error) {
    return { success: false, error: "Impossible de supprimer cette journee type." };
  }

  revalidateTemplatePaths();
  return { success: true };
}

export async function createTemplateTaskAction(
  templateId: string,
  input: TemplateTaskInput,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const normalizedInput = sanitizeTaskInput(input);
  const parsed = taskSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return {
      success: false,
      error: firstIssueMessage(parsed.error.issues, "Saisie invalide pour le bloc."),
    };
  }

  const rangeError = validateTimeRange(normalizedInput.startTime, normalizedInput.endTime);
  if (rangeError) {
    return { success: false, error: rangeError };
  }

  if (!isSupabaseEnabled()) {
    const existingDemoTasks = listDemoTemplateTasks(context.familyId, templateId).map(toTaskRangeSummary);
    const overlap = findOverlapRange({
      candidateStartTime: normalizedInput.startTime,
      candidateEndTime: normalizedInput.endTime,
      ranges: existingDemoTasks,
    });
    if (overlap) {
      return { success: false, error: buildTaskOverlapError(overlap) };
    }

    const created = createDemoTemplateTask(context.familyId, templateId, normalizedInput);
    if (!created) {
      return { success: false, error: "Categorie ou template introuvable." };
    }

    revalidateTemplatePaths(templateId);
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: template }, { data: category }] = await Promise.all([
    supabase
      .from("day_templates")
      .select("id")
      .eq("id", templateId)
      .eq("family_id", context.familyId)
      .maybeSingle(),
    supabase
      .from("task_categories")
      .select("id, default_item_kind")
      .eq("id", normalizedInput.categoryId)
      .eq("family_id", context.familyId)
      .maybeSingle(),
  ]);

  if (!template || !category) {
    return { success: false, error: "Template ou categorie introuvable." };
  }

  const resolvedItemKind = normalizedInput.itemKind ?? category.default_item_kind ?? "mission";

  if (normalizedInput.assignedProfileId) {
    if (!isUuidLike(normalizedInput.assignedProfileId)) {
      return { success: false, error: "Assignation invalide." };
    }

    const { data: assignedProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", normalizedInput.assignedProfileId)
      .eq("family_id", context.familyId)
      .in("role", ["parent", "child"])
      .maybeSingle();

    if (!assignedProfile) {
      return { success: false, error: "Assignation invalide." };
    }
  }

  const { data: existingTasks, error: existingTasksError } = await supabase
    .from("template_tasks")
    .select("id, title, start_time, end_time")
    .eq("template_id", templateId);

  if (existingTasksError) {
    return { success: false, error: "Impossible de verifier les chevauchements de taches." };
  }

  const overlap = findOverlapRange({
    candidateStartTime: normalizedInput.startTime,
    candidateEndTime: normalizedInput.endTime,
    ranges: (existingTasks ?? []).map((task) => ({
      id: task.id,
      label: task.title?.trim() || "Tache",
      startTime: task.start_time,
      endTime: task.end_time,
    })),
  });
  if (overlap) {
    return { success: false, error: buildTaskOverlapError(overlap) };
  }

  const sortOrder = existingTasks?.length ?? 0;

  const { data, error } = await supabase
    .from("template_tasks")
    .insert({
      template_id: templateId,
      category_id: normalizedInput.categoryId,
      item_kind: resolvedItemKind,
      item_subkind: normalizedInput.itemSubkind ?? null,
      title: normalizedInput.title,
      description: normalizedInput.description,
      start_time: normalizedInput.startTime,
      end_time: normalizedInput.endTime,
      points_base: normalizedInput.pointsBase,
      knowledge_card_id: normalizedInput.knowledgeCardId ?? null,
      assigned_profile_id: normalizedInput.assignedProfileId ?? null,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible d'ajouter ce bloc pour le moment." };
  }

  revalidateTemplatePaths(templateId);
  return { success: true, data: { id: data.id } };
}

export async function updateTemplateTaskAction(
  taskId: string,
  input: TemplateTaskInput,
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const normalizedInput = sanitizeTaskInput(input);
  const parsed = taskSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return {
      success: false,
      error: firstIssueMessage(parsed.error.issues, "Saisie invalide pour le bloc."),
    };
  }

  const rangeError = validateTimeRange(normalizedInput.startTime, normalizedInput.endTime);
  if (rangeError) {
    return { success: false, error: rangeError };
  }

  if (!isSupabaseEnabled()) {
    const templates = listDemoTemplates(context.familyId);
    const linkedTemplate = templates.find((entry) =>
      listDemoTemplateTasks(context.familyId, entry.id).some((task) => task.id === taskId),
    );

    if (!linkedTemplate) {
      return { success: false, error: "Bloc introuvable." };
    }

    const existingDemoTasks = listDemoTemplateTasks(context.familyId, linkedTemplate.id).map(toTaskRangeSummary);
    const overlap = findOverlapRange({
      candidateStartTime: normalizedInput.startTime,
      candidateEndTime: normalizedInput.endTime,
      ranges: existingDemoTasks,
      excludeId: taskId,
    });
    if (overlap) {
      return { success: false, error: buildTaskOverlapError(overlap) };
    }

    const updated = updateDemoTemplateTask(context.familyId, taskId, normalizedInput);
    if (!updated) {
      return { success: false, error: "Bloc introuvable." };
    }
    revalidateTemplatePaths(updated.templateId);
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();

  const { data: taskRow, error: taskLookupError } = await supabase
    .from("template_tasks")
    .select("id, template_id")
    .eq("id", taskId)
    .maybeSingle();

  if (taskLookupError || !taskRow) {
    return { success: false, error: "Bloc introuvable." };
  }

  const [{ data: template }, { data: category }] = await Promise.all([
    supabase
      .from("day_templates")
      .select("id")
      .eq("id", taskRow.template_id)
      .eq("family_id", context.familyId)
      .maybeSingle(),
    supabase
      .from("task_categories")
      .select("id, default_item_kind")
      .eq("id", normalizedInput.categoryId)
      .eq("family_id", context.familyId)
      .maybeSingle(),
  ]);

  if (!template || !category) {
    return { success: false, error: "Template ou categorie introuvable." };
  }

  const resolvedItemKind = normalizedInput.itemKind ?? category.default_item_kind ?? "mission";

  if (normalizedInput.assignedProfileId) {
    if (!isUuidLike(normalizedInput.assignedProfileId)) {
      return { success: false, error: "Assignation invalide." };
    }

    const { data: assignedProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", normalizedInput.assignedProfileId)
      .eq("family_id", context.familyId)
      .in("role", ["parent", "child"])
      .maybeSingle();

    if (!assignedProfile) {
      return { success: false, error: "Assignation invalide." };
    }
  }

  const { data: siblingTasks, error: siblingTasksError } = await supabase
    .from("template_tasks")
    .select("id, title, start_time, end_time")
    .eq("template_id", taskRow.template_id)
    .neq("id", taskId);

  if (siblingTasksError) {
    return { success: false, error: "Impossible de verifier les chevauchements de taches." };
  }

  const overlap = findOverlapRange({
    candidateStartTime: normalizedInput.startTime,
    candidateEndTime: normalizedInput.endTime,
    ranges: (siblingTasks ?? []).map((task) => ({
      id: task.id,
      label: task.title?.trim() || "Tache",
      startTime: task.start_time,
      endTime: task.end_time,
    })),
  });
  if (overlap) {
    return { success: false, error: buildTaskOverlapError(overlap) };
  }

  const { error } = await supabase
    .from("template_tasks")
    .update({
      category_id: normalizedInput.categoryId,
      item_kind: resolvedItemKind,
      item_subkind: normalizedInput.itemSubkind ?? null,
      title: normalizedInput.title,
      description: normalizedInput.description,
      start_time: normalizedInput.startTime,
      end_time: normalizedInput.endTime,
      points_base: normalizedInput.pointsBase,
      knowledge_card_id: normalizedInput.knowledgeCardId ?? null,
      assigned_profile_id: normalizedInput.assignedProfileId ?? null,
    })
    .eq("id", taskId)
    .eq("template_id", taskRow.template_id);

  if (error) {
    return { success: false, error: "Impossible de modifier ce bloc." };
  }

  revalidateTemplatePaths(taskRow.template_id);
  return { success: true };
}

export async function deleteTemplateTaskAction(taskId: string): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const templates = listDemoTemplates(context.familyId);
    const linkedTemplate = templates.find((template) =>
      listDemoTemplateTasks(context.familyId, template.id).some((task) => task.id === taskId),
    );

    deleteDemoTemplateTask(context.familyId, taskId);
    revalidateTemplatePaths(linkedTemplate?.id);
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: taskRow, error: lookupError } = await supabase
    .from("template_tasks")
    .select("id, template_id")
    .eq("id", taskId)
    .maybeSingle();

  if (lookupError || !taskRow) {
    return { success: false, error: "Bloc introuvable." };
  }

  const { data: template } = await supabase
    .from("day_templates")
    .select("id")
    .eq("id", taskRow.template_id)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!template) {
    return { success: false, error: "Action non autorisee." };
  }

  const { error } = await supabase.from("template_tasks").delete().eq("id", taskId);

  if (error) {
    return { success: false, error: "Impossible de supprimer ce bloc." };
  }

  revalidateTemplatePaths(taskRow.template_id);
  return { success: true };
}

export async function createTemplateBlockAction(
  templateId: string,
  input: DayTemplateBlockInput,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const normalizedInput = sanitizeBlockInput(input);
  const parsed = blockSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return {
      success: false,
      error: firstIssueMessage(parsed.error.issues, "Saisie invalide pour la plage."),
    };
  }

  const rangeError = validateTimeRange(parsed.data.startTime, parsed.data.endTime);
  if (rangeError) {
    return { success: false, error: rangeError };
  }

  if (!isSupabaseEnabled()) {
    const existingDemoBlocks = listDemoTemplateBlocks(context.familyId, templateId).map(toBlockRangeSummary);
    const overlap = findOverlapRange({
      candidateStartTime: parsed.data.startTime,
      candidateEndTime: parsed.data.endTime,
      ranges: existingDemoBlocks,
    });
    if (overlap) {
      return { success: false, error: buildBlockOverlapError(overlap) };
    }

    const created = createDemoTemplateBlock(context.familyId, templateId, parsed.data);
    if (!created) {
      return { success: false, error: "Journee type introuvable." };
    }
    revalidateTemplatePaths(templateId);
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data: template } = await supabase
    .from("day_templates")
    .select("id")
    .eq("id", templateId)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!template) {
    return { success: false, error: "Journee type introuvable." };
  }

  const { data: existingBlocks, error: existingBlocksError } = await supabase
    .from("day_template_blocks")
    .select("id, label, start_time, end_time")
    .eq("day_template_id", templateId);

  if (existingBlocksError) {
    return { success: false, error: "Impossible de verifier les chevauchements des plages." };
  }

  const overlap = findOverlapRange({
    candidateStartTime: parsed.data.startTime,
    candidateEndTime: parsed.data.endTime,
    ranges: (existingBlocks ?? []).map((block) => ({
      id: block.id,
      label: block.label?.trim() || "Plage",
      startTime: block.start_time,
      endTime: block.end_time,
    })),
  });
  if (overlap) {
    return { success: false, error: buildBlockOverlapError(overlap) };
  }

  const sortOrder = existingBlocks?.length ?? 0;

  const { data, error } = await supabase
    .from("day_template_blocks")
    .insert({
      day_template_id: templateId,
      block_type: parsed.data.blockType,
      label: parsed.data.label,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: supabaseWriteErrorMessage(error, "Impossible d'ajouter cette plage.", "day_template_blocks"),
    };
  }

  revalidateTemplatePaths(templateId);
  return { success: true, data: { id: data.id } };
}

export async function updateTemplateBlockAction(
  blockId: string,
  input: DayTemplateBlockInput,
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const normalizedInput = sanitizeBlockInput(input);
  const parsed = blockSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return {
      success: false,
      error: firstIssueMessage(parsed.error.issues, "Saisie invalide pour la plage."),
    };
  }

  const rangeError = validateTimeRange(parsed.data.startTime, parsed.data.endTime);
  if (rangeError) {
    return { success: false, error: rangeError };
  }

  if (!isSupabaseEnabled()) {
    const templates = listDemoTemplates(context.familyId);
    const linkedTemplate = templates.find((entry) =>
      listDemoTemplateBlocks(context.familyId, entry.id).some((block) => block.id === blockId),
    );

    if (!linkedTemplate) {
      return { success: false, error: "Plage introuvable." };
    }

    const existingDemoBlocks = listDemoTemplateBlocks(context.familyId, linkedTemplate.id).map(toBlockRangeSummary);
    const overlap = findOverlapRange({
      candidateStartTime: parsed.data.startTime,
      candidateEndTime: parsed.data.endTime,
      ranges: existingDemoBlocks,
      excludeId: blockId,
    });
    if (overlap) {
      return { success: false, error: buildBlockOverlapError(overlap) };
    }

    const updated = updateDemoTemplateBlock(context.familyId, blockId, parsed.data);
    if (!updated) {
      return { success: false, error: "Plage introuvable." };
    }
    revalidateTemplatePaths(updated.dayTemplateId);
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: blockRow, error: lookupError } = await supabase
    .from("day_template_blocks")
    .select("id, day_template_id")
    .eq("id", blockId)
    .maybeSingle();

  if (lookupError || !blockRow) {
    return { success: false, error: "Plage introuvable." };
  }

  const { data: template } = await supabase
    .from("day_templates")
    .select("id")
    .eq("id", blockRow.day_template_id)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!template) {
    return { success: false, error: "Action non autorisee." };
  }

  const { data: siblingBlocks, error: siblingBlocksError } = await supabase
    .from("day_template_blocks")
    .select("id, label, start_time, end_time")
    .eq("day_template_id", blockRow.day_template_id)
    .neq("id", blockId);

  if (siblingBlocksError) {
    return { success: false, error: "Impossible de verifier les chevauchements des plages." };
  }

  const overlap = findOverlapRange({
    candidateStartTime: parsed.data.startTime,
    candidateEndTime: parsed.data.endTime,
    ranges: (siblingBlocks ?? []).map((block) => ({
      id: block.id,
      label: block.label?.trim() || "Plage",
      startTime: block.start_time,
      endTime: block.end_time,
    })),
  });
  if (overlap) {
    return { success: false, error: buildBlockOverlapError(overlap) };
  }

  const { error } = await supabase
    .from("day_template_blocks")
    .update({
      block_type: parsed.data.blockType,
      label: parsed.data.label,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
    })
    .eq("id", blockId)
    .eq("day_template_id", blockRow.day_template_id);

  if (error) {
    return {
      success: false,
      error: supabaseWriteErrorMessage(error, "Impossible de modifier cette plage.", "day_template_blocks"),
    };
  }

  revalidateTemplatePaths(blockRow.day_template_id);
  return { success: true };
}

export async function deleteTemplateBlockAction(blockId: string): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const templates = listDemoTemplates(context.familyId);
    const linkedTemplate = templates.find((template) =>
      listDemoTemplateBlocks(context.familyId, template.id).some((block) => block.id === blockId),
    );
    deleteDemoTemplateBlock(context.familyId, blockId);
    revalidateTemplatePaths(linkedTemplate?.id);
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: blockRow, error: lookupError } = await supabase
    .from("day_template_blocks")
    .select("id, day_template_id")
    .eq("id", blockId)
    .maybeSingle();

  if (lookupError || !blockRow) {
    return { success: false, error: "Plage introuvable." };
  }

  const { data: template } = await supabase
    .from("day_templates")
    .select("id")
    .eq("id", blockRow.day_template_id)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!template) {
    return { success: false, error: "Action non autorisee." };
  }

  const { error } = await supabase.from("day_template_blocks").delete().eq("id", blockId);
  if (error) {
    return {
      success: false,
      error: supabaseWriteErrorMessage(error, "Impossible de supprimer cette plage.", "day_template_blocks"),
    };
  }

  revalidateTemplatePaths(blockRow.day_template_id);
  return { success: true };
}

export async function createSchoolPeriodAction(
  input: SchoolPeriodInput,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = schoolPeriodSchema.safeParse({
    ...input,
    label: input.label.trim(),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: firstIssueMessage(parsed.error.issues, "Saisie invalide pour la periode scolaire."),
    };
  }

  const rangeError = validateDateRange(parsed.data.startDate, parsed.data.endDate);
  if (rangeError) {
    return { success: false, error: rangeError };
  }

  if (!isSupabaseEnabled()) {
    const created = upsertDemoSchoolPeriod(context.familyId, parsed.data);
    revalidateTemplatePaths();
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("school_periods")
    .insert({
      family_id: context.familyId,
      period_type: parsed.data.periodType,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      label: parsed.data.label,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: supabaseWriteErrorMessage(error, "Impossible d'ajouter cette periode scolaire.", "school_periods"),
    };
  }

  revalidateTemplatePaths();
  return { success: true, data: { id: data.id } };
}

export async function updateSchoolPeriodAction(
  periodId: string,
  input: SchoolPeriodInput,
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = schoolPeriodSchema.safeParse({
    ...input,
    label: input.label.trim(),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: firstIssueMessage(parsed.error.issues, "Saisie invalide pour la periode scolaire."),
    };
  }

  const rangeError = validateDateRange(parsed.data.startDate, parsed.data.endDate);
  if (rangeError) {
    return { success: false, error: rangeError };
  }

  if (!isSupabaseEnabled()) {
    upsertDemoSchoolPeriod(context.familyId, { id: periodId, ...parsed.data });
    revalidateTemplatePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("school_periods")
    .update({
      period_type: parsed.data.periodType,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      label: parsed.data.label,
    })
    .eq("id", periodId)
    .eq("family_id", context.familyId);

  if (error) {
    return {
      success: false,
      error: supabaseWriteErrorMessage(error, "Impossible de modifier cette periode scolaire.", "school_periods"),
    };
  }

  revalidateTemplatePaths();
  return { success: true };
}

export async function deleteSchoolPeriodAction(periodId: string): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    deleteDemoSchoolPeriod(context.familyId, periodId);
    revalidateTemplatePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("school_periods")
    .delete()
    .eq("id", periodId)
    .eq("family_id", context.familyId);

  if (error) {
    return {
      success: false,
      error: supabaseWriteErrorMessage(error, "Impossible de supprimer cette periode scolaire.", "school_periods"),
    };
  }

  revalidateTemplatePaths();
  return { success: true };
}

export async function moveTemplateTaskAction(
  taskId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    moveDemoTemplateTask(context.familyId, taskId, direction);
    revalidateTemplatePaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: taskRow, error: lookupError } = await supabase
    .from("template_tasks")
    .select("id, template_id, sort_order")
    .eq("id", taskId)
    .maybeSingle();

  if (lookupError || !taskRow) {
    return { success: false, error: "Bloc introuvable." };
  }

  const { data: template } = await supabase
    .from("day_templates")
    .select("id")
    .eq("id", taskRow.template_id)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!template) {
    return { success: false, error: "Action non autorisee." };
  }

  const { data: siblings, error: siblingsError } = await supabase
    .from("template_tasks")
    .select("id, sort_order")
    .eq("template_id", taskRow.template_id)
    .order("sort_order", { ascending: true });

  if (siblingsError || !siblings) {
    return { success: false, error: "Impossible de reordonner les blocs." };
  }

  const currentIndex = siblings.findIndex((sibling) => sibling.id === taskId);
  if (currentIndex === -1) {
    return { success: false, error: "Bloc introuvable." };
  }

  const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) {
    return { success: true };
  }

  const current = siblings[currentIndex];
  const swap = siblings[swapIndex];
  if (!current || !swap) {
    return { success: false, error: "Impossible de reordonner les blocs." };
  }

  const [firstUpdate, secondUpdate] = await Promise.all([
    supabase
      .from("template_tasks")
      .update({ sort_order: swap.sort_order })
      .eq("id", current.id)
      .eq("template_id", taskRow.template_id),
    supabase
      .from("template_tasks")
      .update({ sort_order: current.sort_order })
      .eq("id", swap.id)
      .eq("template_id", taskRow.template_id),
  ]);

  if (firstUpdate.error || secondUpdate.error) {
    return { success: false, error: "Impossible de reordonner les blocs." };
  }

  revalidateTemplatePaths(taskRow.template_id);
  return { success: true };
}

export async function seedEzraCategoryPackAction(): Promise<ActionResult<{ createdCount: number }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const existingNames = new Set(
      listDemoCategories(context.familyId).map((category) => category.name.toLocaleLowerCase("fr")),
    );
    let createdCount = 0;

    for (const category of EZRA_CATEGORY_PACK) {
      const key = category.name.toLocaleLowerCase("fr");
      if (existingNames.has(key)) {
        continue;
      }
      createDemoCategory(context.familyId, category);
      existingNames.add(key);
      createdCount += 1;
    }

    revalidateTemplatePaths();
    return { success: true, data: { createdCount } };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingCategories, error: existingError } = await supabase
    .from("task_categories")
    .select("name")
    .eq("family_id", context.familyId);

  if (existingError) {
    return { success: false, error: "Impossible de verifier les categories existantes." };
  }

  const existingNames = new Set(
    (existingCategories ?? []).map((category) => category.name.trim().toLocaleLowerCase("fr")),
  );

  const toInsert = EZRA_CATEGORY_PACK.filter(
    (category) => !existingNames.has(category.name.trim().toLocaleLowerCase("fr")),
  ).map((category) => ({
    family_id: context.familyId,
    name: category.name,
    icon: category.icon,
    color_key: category.colorKey,
    default_item_kind: category.defaultItemKind ?? null,
  }));

  if (toInsert.length === 0) {
    return { success: true, data: { createdCount: 0 } };
  }

  const { error: insertError } = await supabase.from("task_categories").insert(toInsert);
  if (insertError) {
    return { success: false, error: "Impossible d'installer le pack de categories." };
  }

  revalidateTemplatePaths();
  return { success: true, data: { createdCount: toInsert.length } };
}
