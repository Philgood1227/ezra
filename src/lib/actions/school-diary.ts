"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPrimaryChildProfileForCurrentFamily } from "@/lib/api/children";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  deleteDemoSchoolDiaryEntry,
  listDemoChecklistTemplates,
  upsertDemoChecklistInstanceForDiaryEntry,
  upsertDemoSchoolDiaryEntry,
} from "@/lib/demo/school-diary-store";
import { generateChecklistDraftForDiaryEntry } from "@/lib/domain/checklists";
import type {
  ActionResult,
  ChecklistTemplateSummary,
  SchoolDiaryEntryInput,
  SchoolDiaryEntrySummary,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ChecklistTemplateRow = Database["public"]["Tables"]["checklist_templates"]["Row"];
type ChecklistItemRow = Database["public"]["Tables"]["checklist_items"]["Row"];
type SchoolDiaryRow = Database["public"]["Tables"]["school_diary_entries"]["Row"];

const schoolDiarySchema = z.object({
  type: z.enum(["devoir", "evaluation", "sortie", "piscine", "info"]),
  subject: z.string().trim().max(120).nullable(),
  title: z.string().trim().min(2, "Le titre est obligatoire."),
  description: z.string().trim().max(500).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  recurrencePattern: z.enum(["none", "weekly", "biweekly", "monthly"]).default("none"),
  recurrenceUntilDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin invalide.").nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.recurrencePattern === "none") {
    return;
  }

  if (!value.recurrenceUntilDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrenceUntilDate"],
      message: "La date de fin est requise pour une recurrence.",
    });
    return;
  }

  if (value.recurrenceUntilDate < value.date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrenceUntilDate"],
      message: "La date de fin doit etre apres la date de debut.",
    });
  }
});

interface ParentContext {
  familyId: string;
  childProfileId: string;
}

function mapSchoolDiaryRow(row: SchoolDiaryRow): SchoolDiaryEntrySummary {
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    type: row.type,
    subject: row.subject,
    title: row.title,
    description: row.description,
    date: row.date,
    recurrencePattern: row.recurrence_pattern ?? "none",
    recurrenceUntilDate: row.recurrence_until_date ?? null,
    recurrenceGroupId: row.recurrence_group_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseDateKeyAsUTC(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

function toDateKeyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonthsUTCClamped(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const firstOfTargetMonth = new Date(Date.UTC(year, month + months, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth(),
      Math.min(day, lastDayOfTargetMonth),
    ),
  );
}

function buildRecurringDateKeys(input: {
  startDateKey: string;
  recurrencePattern: "none" | "weekly" | "biweekly" | "monthly";
  recurrenceUntilDateKey: string | null;
}): string[] {
  const start = parseDateKeyAsUTC(input.startDateKey);

  if (input.recurrencePattern === "none" || !input.recurrenceUntilDateKey) {
    return [toDateKeyUTC(start)];
  }

  const until = parseDateKeyAsUTC(input.recurrenceUntilDateKey);
  const dates: string[] = [];
  let cursor = start;

  while (cursor.getTime() <= until.getTime()) {
    dates.push(toDateKeyUTC(cursor));

    if (input.recurrencePattern === "weekly") {
      cursor = addDaysUTC(cursor, 7);
      continue;
    }

    if (input.recurrencePattern === "biweekly") {
      cursor = addDaysUTC(cursor, 14);
      continue;
    }

    cursor = addMonthsUTCClamped(cursor, 1);
  }

  return dates;
}

function revalidateSchoolDiaryPaths(): void {
  revalidatePath("/parent/school-diary");
  revalidatePath("/parent/checklists");
  revalidatePath("/child/checklists");
  revalidatePath("/child/my-day");
}

async function requireParentContext(): Promise<ParentContext | null> {
  const context = await getCurrentProfile();
  if (context.role !== "parent" || !context.familyId) {
    return null;
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return null;
  }

  return {
    familyId: context.familyId,
    childProfileId: child.id,
  };
}

function mapChecklistTemplateRows(
  templatesRows: ChecklistTemplateRow[],
  itemsRows: ChecklistItemRow[],
): ChecklistTemplateSummary[] {
  const itemsByTemplateId = new Map<string, ChecklistItemRow[]>();

  itemsRows.forEach((item) => {
    const current = itemsByTemplateId.get(item.template_id) ?? [];
    current.push(item);
    itemsByTemplateId.set(item.template_id, current);
  });

  return templatesRows.map((template) => ({
    id: template.id,
    familyId: template.family_id,
    type: template.type,
    label: template.label,
    description: template.description,
    isDefault: template.is_default,
    items: (itemsByTemplateId.get(template.id) ?? [])
      .map((item) => ({
        id: item.id,
        templateId: item.template_id,
        label: item.label,
        sortOrder: item.sort_order,
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder),
  }));
}

function ensureDraftItems(
  draft: ReturnType<typeof generateChecklistDraftForDiaryEntry>,
  entry: SchoolDiaryEntrySummary,
): Array<{ label: string; sortOrder: number }> {
  if (draft.items.length > 0) {
    return draft.items;
  }

  return [
    {
      label: entry.title,
      sortOrder: 0,
    },
  ];
}

async function syncChecklistInstanceForEntrySupabase(
  familyId: string,
  childProfileId: string,
  entry: SchoolDiaryEntrySummary,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { data: templateRows } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("family_id", familyId);

  const templateIds = (templateRows ?? []).map((template) => template.id);

  const { data: itemRows } = templateIds.length
    ? await supabase
        .from("checklist_items")
        .select("*")
        .in("template_id", templateIds)
    : { data: [] as ChecklistItemRow[] };

  const templates = mapChecklistTemplateRows(
    (templateRows ?? []) as ChecklistTemplateRow[],
    (itemRows ?? []) as ChecklistItemRow[],
  );

  const draft = generateChecklistDraftForDiaryEntry(entry, templates);
  const items = ensureDraftItems(draft, entry);

  const { data: existing } = await supabase
    .from("checklist_instances")
    .select("id")
    .eq("family_id", familyId)
    .eq("child_profile_id", childProfileId)
    .eq("diary_entry_id", entry.id)
    .maybeSingle();

  let instanceId = existing?.id ?? null;

  if (!instanceId) {
    const { data: created } = await supabase
      .from("checklist_instances")
      .insert({
        family_id: familyId,
        child_profile_id: childProfileId,
        diary_entry_id: entry.id,
        type: draft.type,
        label: draft.label,
        date: draft.date,
      })
      .select("id")
      .single();

    instanceId = created?.id ?? null;
  } else {
    await supabase
      .from("checklist_instances")
      .update({
        type: draft.type,
        label: draft.label,
        date: draft.date,
      })
      .eq("id", instanceId);

    await supabase.from("checklist_instance_items").delete().eq("checklist_instance_id", instanceId);
  }

  if (!instanceId) {
    return;
  }

  if (items.length > 0) {
    await supabase.from("checklist_instance_items").insert(
      items.map((item, index) => ({
        checklist_instance_id: instanceId,
        label: item.label,
        sort_order: Number.isFinite(item.sortOrder) ? item.sortOrder : index,
      })),
    );
  }
}

export async function createSchoolDiaryEntryAction(
  input: SchoolDiaryEntryInput,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = schoolDiarySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const recurrenceDates = buildRecurringDateKeys({
      startDateKey: parsed.data.date,
      recurrencePattern: parsed.data.recurrencePattern,
      recurrenceUntilDateKey: parsed.data.recurrenceUntilDate ?? null,
    });
    const recurrenceGroupId = recurrenceDates.length > 1 ? randomUUID() : null;
    const templates = listDemoChecklistTemplates(context.familyId);

    let firstCreatedId: string | null = null;

    recurrenceDates.forEach((dateKey) => {
      const created = upsertDemoSchoolDiaryEntry(context.familyId, context.childProfileId, {
        ...parsed.data,
        date: dateKey,
        recurrencePattern: parsed.data.recurrencePattern,
        recurrenceUntilDate:
          parsed.data.recurrencePattern === "none" ? null : parsed.data.recurrenceUntilDate ?? null,
        recurrenceGroupId,
      });

      if (!firstCreatedId) {
        firstCreatedId = created.id;
      }

      const draft = generateChecklistDraftForDiaryEntry(created, templates);
      const items = ensureDraftItems(draft, created);

      upsertDemoChecklistInstanceForDiaryEntry(context.familyId, context.childProfileId, created.id, {
        type: draft.type,
        label: draft.label,
        date: draft.date,
        items,
      });
    });

    revalidateSchoolDiaryPaths();
    return { success: true, data: { id: firstCreatedId ?? randomUUID() } };
  }

  const supabase = await createSupabaseServerClient();
  const recurrenceDates = buildRecurringDateKeys({
    startDateKey: parsed.data.date,
    recurrencePattern: parsed.data.recurrencePattern,
    recurrenceUntilDateKey: parsed.data.recurrenceUntilDate ?? null,
  });
  const recurrenceGroupId = recurrenceDates.length > 1 ? randomUUID() : null;

  const { data: createdRows, error } = await supabase
    .from("school_diary_entries")
    .insert(
      recurrenceDates.map((dateKey) => ({
        family_id: context.familyId,
        child_profile_id: context.childProfileId,
        type: parsed.data.type,
        subject: parsed.data.subject,
        title: parsed.data.title,
        description: parsed.data.description,
        date: dateKey,
        recurrence_pattern: parsed.data.recurrencePattern,
        recurrence_until_date:
          parsed.data.recurrencePattern === "none" ? null : parsed.data.recurrenceUntilDate ?? null,
        recurrence_group_id: recurrenceGroupId,
      })),
    )
    .select("*");

  if (error || !createdRows || createdRows.length === 0) {
    return { success: false, error: "Impossible de creer l'entree du carnet." };
  }

  for (const row of createdRows) {
    await syncChecklistInstanceForEntrySupabase(
      context.familyId,
      context.childProfileId,
      mapSchoolDiaryRow(row as SchoolDiaryRow),
    );
  }

  revalidateSchoolDiaryPaths();
  return { success: true, data: { id: createdRows[0]?.id ?? randomUUID() } };
}

export async function updateSchoolDiaryEntryAction(
  entryId: string,
  input: SchoolDiaryEntryInput,
): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = schoolDiarySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  if (!isSupabaseEnabled()) {
    const updated = upsertDemoSchoolDiaryEntry(
      context.familyId,
      context.childProfileId,
      {
        ...parsed.data,
        recurrencePattern: parsed.data.recurrencePattern,
        recurrenceUntilDate:
          parsed.data.recurrencePattern === "none" ? null : parsed.data.recurrenceUntilDate ?? null,
      },
      entryId,
    );
    const templates = listDemoChecklistTemplates(context.familyId);
    const draft = generateChecklistDraftForDiaryEntry(updated, templates);
    const items = ensureDraftItems(draft, updated);

    upsertDemoChecklistInstanceForDiaryEntry(context.familyId, context.childProfileId, updated.id, {
      type: draft.type,
      label: draft.label,
      date: draft.date,
      items,
    });

    revalidateSchoolDiaryPaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("school_diary_entries")
    .select("id")
    .eq("id", entryId)
    .eq("family_id", context.familyId)
    .eq("child_profile_id", context.childProfileId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Entree introuvable." };
  }

  const { data: updatedRow, error } = await supabase
    .from("school_diary_entries")
    .update({
      type: parsed.data.type,
      subject: parsed.data.subject,
      title: parsed.data.title,
      description: parsed.data.description,
      date: parsed.data.date,
      recurrence_pattern: parsed.data.recurrencePattern,
      recurrence_until_date:
        parsed.data.recurrencePattern === "none" ? null : parsed.data.recurrenceUntilDate ?? null,
    })
    .eq("id", entryId)
    .eq("family_id", context.familyId)
    .select("*")
    .single();

  if (error || !updatedRow) {
    return { success: false, error: "Impossible de modifier l'entree du carnet." };
  }

  await syncChecklistInstanceForEntrySupabase(
    context.familyId,
    context.childProfileId,
    mapSchoolDiaryRow(updatedRow as SchoolDiaryRow),
  );

  revalidateSchoolDiaryPaths();
  return { success: true };
}

export async function deleteSchoolDiaryEntryAction(entryId: string): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const deleted = deleteDemoSchoolDiaryEntry(context.familyId, entryId);
    if (!deleted) {
      return { success: false, error: "Entree introuvable." };
    }

    revalidateSchoolDiaryPaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("school_diary_entries")
    .delete()
    .eq("id", entryId)
    .eq("family_id", context.familyId)
    .eq("child_profile_id", context.childProfileId);

  if (error) {
    return { success: false, error: "Impossible de supprimer cette entree." };
  }

  revalidateSchoolDiaryPaths();
  return { success: true };
}
