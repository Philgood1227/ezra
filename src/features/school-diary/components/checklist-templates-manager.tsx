"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Modal,
  Select,
  TextArea,
} from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  addChecklistTemplateItemAction,
  createChecklistTemplateAction,
  deleteScheduledChecklistInstanceAction,
  deleteChecklistTemplateAction,
  deleteChecklistTemplateItemAction,
  moveChecklistTemplateItemAction,
  scheduleChecklistTemplateForDateAction,
  updateChecklistTemplateAction,
  updateChecklistTemplateItemAction,
} from "@/lib/actions/checklists";
import type { ScheduledChecklistInstanceSummary } from "@/lib/api/checklists";
import { useFormField } from "@/lib/hooks/useFormField";
import { cn } from "@/lib/utils";
import type {
  ChecklistRecurrenceRule,
  ChecklistTemplateInput,
  ChecklistTemplateSummary,
  ChecklistTemplateType,
} from "@/lib/day-templates/types";

interface ChecklistTemplatesManagerProps {
  templates: ChecklistTemplateSummary[];
  scheduledInstances: ScheduledChecklistInstanceSummary[];
}

interface TemplateVisual {
  emoji: string;
  cardClassName: string;
  badgeClassName: string;
}

const TEMPLATE_TYPES: Array<{ value: ChecklistTemplateType; label: string }> = [
  { value: "piscine", label: "Piscine" },
  { value: "sortie", label: "Sortie" },
  { value: "evaluation", label: "Evaluation" },
  { value: "quotidien", label: "Quotidien" },
  { value: "routine", label: "Routine" },
  { value: "autre", label: "Autre" },
];

const TEMPLATE_VISUALS: Record<ChecklistTemplateType, TemplateVisual> = {
  piscine: {
    emoji: "\uD83C\uDFCA",
    cardClassName: "from-cyan-50 via-sky-50 to-blue-50 border-cyan-200",
    badgeClassName: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  sortie: {
    emoji: "\uD83C\uDF33",
    cardClassName: "from-emerald-50 via-green-50 to-lime-50 border-emerald-200",
    badgeClassName: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  evaluation: {
    emoji: "\uD83C\uDF93",
    cardClassName: "from-indigo-50 via-violet-50 to-fuchsia-50 border-indigo-200",
    badgeClassName: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  quotidien: {
    emoji: "\uD83D\uDCCC",
    cardClassName: "from-orange-50 via-amber-50 to-yellow-50 border-orange-200",
    badgeClassName: "bg-orange-100 text-orange-800 border-orange-200",
  },
  routine: {
    emoji: "\u23F0",
    cardClassName: "from-sky-50 via-cyan-50 to-teal-50 border-sky-200",
    badgeClassName: "bg-sky-100 text-sky-800 border-sky-200",
  },
  autre: {
    emoji: "\uD83D\uDCCB",
    cardClassName: "from-slate-50 via-zinc-50 to-gray-100 border-slate-200",
    badgeClassName: "bg-slate-100 text-slate-800 border-slate-200",
  },
};

const EMPTY_DRAFT: ChecklistTemplateInput = {
  type: "piscine",
  label: "",
  description: null,
  isDefault: false,
  recurrenceRule: "none",
  recurrenceDays: [],
  recurrenceStartDate: null,
  recurrenceEndDate: null,
};

const WEEKDAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 7, label: "Dim" },
];

const RECURRENCE_OPTIONS: Array<{ value: ChecklistRecurrenceRule; label: string }> = [
  { value: "daily", label: "Tous les jours" },
  { value: "weekdays", label: "Jours de semaine" },
  { value: "school_days", label: "Jours d'ecole" },
  { value: "weekly_days", label: "Jours choisis" },
];

function SparklesIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.6 14.2 8l5.2 2.2-5.2 2.2L12 17.8l-2.2-5.4L4.6 10.2 9.8 8 12 2.6Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M19 3.5v3M20.5 5h-3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ListChecksIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m4.5 6.4 1.6 1.6 2.2-2.2M10.5 7h9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="m4.5 12.2 1.6 1.6 2.2-2.2M10.5 12.8h9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="m4.5 18 1.6 1.6 2.2-2.2M10.5 18.6h9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4.5 19.5h4.3l9.2-9.2-4.3-4.3-9.2 9.2v4.3Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m12.8 6.8 4.3 4.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5.5 7h13M9.5 7V5h5v2M8.5 7l.7 11h5.6l.7-11" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function GripIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="8" cy="7" r="1.4" fill="currentColor" />
      <circle cx="8" cy="12" r="1.4" fill="currentColor" />
      <circle cx="8" cy="17" r="1.4" fill="currentColor" />
      <circle cx="16" cy="7" r="1.4" fill="currentColor" />
      <circle cx="16" cy="12" r="1.4" fill="currentColor" />
      <circle cx="16" cy="17" r="1.4" fill="currentColor" />
    </svg>
  );
}

function CheckSquareIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.8 12 2.2 2.2 4.3-4.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function typeLabel(value: ChecklistTemplateType): string {
  return TEMPLATE_TYPES.find((option) => option.value === value)?.label ?? value;
}

function typeVisual(value: ChecklistTemplateType): TemplateVisual {
  return TEMPLATE_VISUALS[value] ?? TEMPLATE_VISUALS.autre;
}

function normalizeChecklistTemplateDraft(input: ChecklistTemplateInput): ChecklistTemplateInput {
  const uniqueDays = [...new Set(input.recurrenceDays)]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((left, right) => left - right);

  if (input.type !== "routine") {
    return {
      ...input,
      recurrenceRule: "none",
      recurrenceDays: [],
      recurrenceStartDate: null,
      recurrenceEndDate: null,
    };
  }

  return {
    ...input,
    recurrenceRule: input.recurrenceRule === "none" ? "daily" : input.recurrenceRule,
    recurrenceDays: uniqueDays,
    recurrenceStartDate: input.recurrenceStartDate?.trim() ? input.recurrenceStartDate : null,
    recurrenceEndDate: input.recurrenceEndDate?.trim() ? input.recurrenceEndDate : null,
  };
}

export function ChecklistTemplatesManager({
  templates,
  scheduledInstances,
}: ChecklistTemplatesManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [draft, setDraft] = useState<ChecklistTemplateInput>(EMPTY_DRAFT);
  const [createScheduleDate, setCreateScheduleDate] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [expandedByTemplateId, setExpandedByTemplateId] = useState<Record<string, boolean>>({});
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateDraft, setEditingTemplateDraft] = useState<ChecklistTemplateInput>(EMPTY_DRAFT);

  const [itemDraftByTemplateId, setItemDraftByTemplateId] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemLabel, setEditingItemLabel] = useState("");
  const [scheduleTemplateId, setScheduleTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [scheduleDate, setScheduleDate] = useState("");

  const nameField = useFormField({
    initialValue: "",
    validate: (value) => (value.trim().length >= 2 ? null : "Nom du modele requis"),
  });

  const defaultTemplateCount = useMemo(
    () => templates.filter((template) => template.isDefault).length,
    [templates],
  );

  function resetCreateDraft(closeModal = false): void {
    setDraft(EMPTY_DRAFT);
    setCreateScheduleDate("");
    nameField.reset("");
    if (closeModal) {
      setIsCreateModalOpen(false);
    }
  }

  function openCreateModal(): void {
    setFeedback(null);
    resetCreateDraft(false);
    setIsCreateModalOpen(true);
  }

  function closeCreateModal(): void {
    if (isPending) {
      return;
    }
    resetCreateDraft(true);
  }

  function toggleTemplateExpanded(templateId: string): void {
    setExpandedByTemplateId((current) => ({ ...current, [templateId]: !current[templateId] }));
  }

  function createTemplate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);
    nameField.markTouched();
    const error = nameField.validateNow();
    if (error) {
      setFeedback({ tone: "error", message: error });
      return;
    }

    startTransition(async () => {
      const result = await createChecklistTemplateAction(
        normalizeChecklistTemplateDraft({
        ...draft,
        label: draft.label.trim(),
        description: draft.description?.trim() ? draft.description.trim() : null,
        }),
      );

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de creer le modele." });
        return;
      }

      if (createScheduleDate && result.data?.id) {
        const scheduleResult = await scheduleChecklistTemplateForDateAction({
          templateId: result.data.id,
          date: createScheduleDate,
        });

        if (!scheduleResult.success) {
          setFeedback({
            tone: "error",
            message: scheduleResult.error ?? "Modele cree, mais programmation de date impossible.",
          });
          router.refresh();
          return;
        }
      }

      resetCreateDraft(true);
      setFeedback({ tone: "success", message: "Modele ajoute." });
      router.refresh();
    });
  }

  function saveTemplate(templateId: string): void {
    if (!editingTemplateDraft.label.trim()) {
      setFeedback({ tone: "error", message: "Le nom du modele est requis." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await updateChecklistTemplateAction(
        templateId,
        normalizeChecklistTemplateDraft({
          ...editingTemplateDraft,
          label: editingTemplateDraft.label.trim(),
          description: editingTemplateDraft.description?.trim()
            ? editingTemplateDraft.description.trim()
            : null,
        }),
      );

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de modifier le modele." });
        return;
      }

      setEditingTemplateId(null);
      setFeedback({ tone: "success", message: "Modele mis a jour." });
      router.refresh();
    });
  }

  function deleteTemplate(templateId: string): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteChecklistTemplateAction(templateId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer le modele." });
        return;
      }

      setFeedback({ tone: "success", message: "Modele supprime." });
      router.refresh();
    });
  }

  function addItem(templateId: string): void {
    const value = itemDraftByTemplateId[templateId]?.trim() ?? "";
    if (!value) {
      setFeedback({ tone: "error", message: "Le nom de l'item est requis." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await addChecklistTemplateItemAction(templateId, { label: value });
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'ajouter l'item." });
        return;
      }

      setItemDraftByTemplateId((current) => ({ ...current, [templateId]: "" }));
      setFeedback({ tone: "success", message: "Item ajoute." });
      router.refresh();
    });
  }

  function saveItem(itemId: string): void {
    const value = editingItemLabel.trim();
    if (!value) {
      setFeedback({ tone: "error", message: "Le nom de l'item est requis." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await updateChecklistTemplateItemAction(itemId, { label: value });
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de renommer l'item." });
        return;
      }

      setEditingItemId(null);
      setEditingItemLabel("");
      setFeedback({ tone: "success", message: "Item renomme." });
      router.refresh();
    });
  }

  function moveItem(itemId: string, direction: "up" | "down"): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await moveChecklistTemplateItemAction(itemId, direction);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de reordonner cet item." });
        return;
      }

      router.refresh();
    });
  }

  function scheduleChecklist(): void {
    if (!scheduleTemplateId || !scheduleDate) {
      setFeedback({ tone: "error", message: "Choisissez un modele et une date." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await scheduleChecklistTemplateForDateAction({
        templateId: scheduleTemplateId,
        date: scheduleDate,
      });

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de programmer la checklist." });
        return;
      }

      setFeedback({ tone: "success", message: "Checklist programmee." });
      router.refresh();
    });
  }

  function deleteScheduledInstance(instanceId: string): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteScheduledChecklistInstanceAction(instanceId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Suppression impossible." });
        return;
      }

      setFeedback({ tone: "success", message: "Checklist programmee supprimee." });
      router.refresh();
    });
  }

  function deleteItem(itemId: string): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteChecklistTemplateItemAction(itemId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer l'item." });
        return;
      }

      setFeedback({ tone: "success", message: "Item supprime." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-0 shadow-elevated">
        <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 py-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="font-display text-3xl font-black tracking-tight">Mes checklists</h2>
              <p className="max-w-2xl text-sm text-white/90">
                Cree des modeles visuels, ajoute des items, puis reutilise-les rapidement pour les preparations
                quotidiennes.
              </p>
            </div>
            <Button
              type="button"
              variant="glass"
              className="border-white/40 bg-white/20 text-white hover:bg-white/30"
              onClick={openCreateModal}
            >
              <SparklesIcon className="size-4" />
              Nouveau modele
            </Button>
          </div>
        </div>
        <CardContent className="grid gap-3 bg-bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Modeles</p>
            <p className="mt-1 text-2xl font-black text-text-primary">{templates.length}</p>
          </div>
          <div className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Par defaut</p>
            <p className="mt-1 text-2xl font-black text-text-primary">{defaultTemplateCount}</p>
          </div>
          <div className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/70 p-3 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Astuce</p>
            <p className="mt-1 text-sm font-medium text-text-secondary">
              Ouvre une carte pour organiser les items et gagner du temps.
            </p>
          </div>
        </CardContent>
      </Card>

      {feedback ? <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {templates.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon="CL"
              title="Aucun modele configure"
              description="Cree ton premier modele pour reutiliser les memes listes plus rapidement."
              action={{
                label: "Nouveau modele",
                onClick: openCreateModal,
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Programmer a une date precise</CardTitle>
          <CardDescription>
            Programme une checklist pour un jour donne. Elle apparaitra la veille dans l&apos;app enfant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              value={scheduleTemplateId}
              onChange={(event) => setScheduleTemplateId(event.target.value)}
            >
              <option value="">Choisir un modele</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </Select>
            <Input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
            <Button onClick={scheduleChecklist} loading={isPending}>
              Programmer
            </Button>
          </div>

          {scheduledInstances.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {scheduledInstances.map((instance) => (
                <div
                  key={instance.id}
                  className={cn(
                    "rounded-radius-card border-2 bg-gradient-to-br p-4 shadow-card transition-all duration-200 hover:shadow-elevated",
                    typeVisual(instance.type as ChecklistTemplateType).cardClassName,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {typeVisual(instance.type as ChecklistTemplateType).emoji}
                        </span>
                        <p className="truncate text-base font-black text-text-primary">
                          {instance.label}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className="border bg-white/70 text-xs text-text-secondary">
                          {instance.date}
                        </Badge>
                        <Badge className={cn("border text-xs", typeVisual(instance.type as ChecklistTemplateType).badgeClassName)}>
                          {typeLabel(instance.type as ChecklistTemplateType)}
                        </Badge>
                        <Badge className="border bg-white/70 text-xs text-text-secondary">
                          {instance.itemCount} items
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteScheduledInstance(instance.id)}
                      disabled={isPending}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Aucune checklist programmee.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {templates.map((template) => {
          const isEditingTemplate = editingTemplateId === template.id;
          const isExpanded = Boolean(expandedByTemplateId[template.id]) || isEditingTemplate;
          const visual = typeVisual(template.type);
          return (
            <Card
              key={template.id}
              className={cn(
                "overflow-hidden border-2 bg-gradient-to-br shadow-card transition-all duration-200 hover:shadow-elevated",
                visual.cardClassName,
              )}
            >
              <CardHeader className="space-y-3">
                {isEditingTemplate ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        value={editingTemplateDraft.type}
                        onChange={(event) => {
                          const nextType = event.target.value as ChecklistTemplateType;
                          setEditingTemplateDraft((current) => ({
                            ...current,
                            type: nextType,
                            recurrenceRule:
                              nextType === "routine"
                                ? current.recurrenceRule === "none"
                                  ? "daily"
                                  : current.recurrenceRule
                                : "none",
                            recurrenceDays: nextType === "routine" ? current.recurrenceDays : [],
                            recurrenceStartDate:
                              nextType === "routine" ? current.recurrenceStartDate : null,
                            recurrenceEndDate:
                              nextType === "routine" ? current.recurrenceEndDate : null,
                          }));
                        }}
                      >
                        {TEMPLATE_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={editingTemplateDraft.label}
                        onChange={(event) =>
                          setEditingTemplateDraft((current) => ({ ...current, label: event.target.value }))
                        }
                      />
                    </div>
                    <TextArea
                      value={editingTemplateDraft.description ?? ""}
                      onChange={(event) =>
                        setEditingTemplateDraft((current) => ({ ...current, description: event.target.value }))
                      }
                      className="min-h-20"
                    />
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={editingTemplateDraft.isDefault}
                        onChange={(event) =>
                          setEditingTemplateDraft((current) => ({ ...current, isDefault: event.target.checked }))
                        }
                        className="size-4 rounded border-border-default"
                      />
                      Defaut pour ce type
                    </label>
                    {editingTemplateDraft.type === "routine" ? (
                      <div className="space-y-3 rounded-radius-button border border-border-subtle bg-bg-surface p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Recurrence
                        </p>
                        <Select
                          value={
                            editingTemplateDraft.recurrenceRule === "none"
                              ? "daily"
                              : editingTemplateDraft.recurrenceRule
                          }
                          onChange={(event) =>
                            setEditingTemplateDraft((current) => ({
                              ...current,
                              recurrenceRule: event.target.value as ChecklistRecurrenceRule,
                            }))
                          }
                        >
                          {RECURRENCE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                        {editingTemplateDraft.recurrenceRule === "weekly_days" ? (
                          <div className="flex flex-wrap gap-2">
                            {WEEKDAY_OPTIONS.map((day) => {
                              const active = editingTemplateDraft.recurrenceDays.includes(day.value);
                              return (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() =>
                                    setEditingTemplateDraft((current) => {
                                      const days = current.recurrenceDays.includes(day.value)
                                        ? current.recurrenceDays.filter((value) => value !== day.value)
                                        : [...current.recurrenceDays, day.value];
                                      return { ...current, recurrenceDays: days.sort((a, b) => a - b) };
                                    })
                                  }
                                  className={cn(
                                    "rounded-full border px-3 py-1 text-xs font-semibold",
                                    active
                                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                                      : "border-border-default text-text-secondary",
                                  )}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            type="date"
                            value={editingTemplateDraft.recurrenceStartDate ?? ""}
                            onChange={(event) =>
                              setEditingTemplateDraft((current) => ({
                                ...current,
                                recurrenceStartDate: event.target.value || null,
                              }))
                            }
                          />
                          <Input
                            type="date"
                            value={editingTemplateDraft.recurrenceEndDate ?? ""}
                            onChange={(event) =>
                              setEditingTemplateDraft((current) => ({
                                ...current,
                                recurrenceEndDate: event.target.value || null,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" loading={isPending} onClick={() => saveTemplate(template.id)}>
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTemplateId(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-radius-card border border-white/70 bg-white/70 text-2xl shadow-card">
                        {visual.emoji}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="truncate text-xl">{template.label}</CardTitle>
                          <Badge className={cn("border text-xs", visual.badgeClassName)}>
                            {typeLabel(template.type)}
                          </Badge>
                          {template.isDefault ? <Badge variant="success">Par defaut</Badge> : null}
                        </div>
                        {template.description ? (
                          <CardDescription className="text-sm text-text-secondary">
                            {template.description}
                          </CardDescription>
                        ) : null}
                        <p className="text-xs font-semibold text-text-secondary">
                          {template.items.length} item{template.items.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTemplateId(template.id);
                          setEditingTemplateDraft({
                            type: template.type,
                            label: template.label,
                            description: template.description,
                            isDefault: template.isDefault,
                            recurrenceRule: template.recurrenceRule,
                            recurrenceDays: template.recurrenceDays,
                            recurrenceStartDate: template.recurrenceStartDate,
                            recurrenceEndDate: template.recurrenceEndDate,
                          });
                          setExpandedByTemplateId((current) => ({ ...current, [template.id]: true }));
                        }}
                      >
                        <EditIcon className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isPending} onClick={() => deleteTemplate(template.id)}>
                        <TrashIcon className="size-4 text-status-error" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleTemplateExpanded(template.id)}>
                        {isExpanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>

              {isExpanded ? (
                <CardContent className="space-y-3 border-t border-white/70 bg-white/65">
                  <div className="rounded-radius-button border border-border-subtle bg-bg-surface/75 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Items du modele
                    </p>
                    {template.items.length === 0 ? (
                      <p className="text-sm text-text-secondary">Aucun item.</p>
                    ) : (
                      <div className="space-y-2">
                        {template.items.map((item, index) => {
                          const isEditingItem = editingItemId === item.id;
                          return (
                            <div
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-radius-button border border-border-subtle bg-bg-surface px-3 py-2"
                            >
                              {isEditingItem ? (
                                <div className="flex w-full flex-wrap items-center gap-2">
                                  <Input
                                    value={editingItemLabel}
                                    onChange={(event) => setEditingItemLabel(event.target.value)}
                                  />
                                  <Button size="sm" loading={isPending} onClick={() => saveItem(item.id)}>
                                    OK
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingItemId(null)}>
                                    Annuler
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex min-w-0 items-center gap-2">
                                    <GripIcon className="size-4 shrink-0 text-text-muted" />
                                    <CheckSquareIcon className="size-4 shrink-0 text-brand-primary" />
                                    <p className="truncate text-sm font-medium text-text-primary">{item.label}</p>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={index === 0 || isPending}
                                      onClick={() => moveItem(item.id, "up")}
                                    >
                                      Monter
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={index === template.items.length - 1 || isPending}
                                      onClick={() => moveItem(item.id, "down")}
                                    >
                                      Descendre
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => {
                                        setEditingItemId(item.id);
                                        setEditingItemLabel(item.label);
                                      }}
                                    >
                                      Renommer
                                    </Button>
                                    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => deleteItem(item.id)}>
                                      Supprimer
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={itemDraftByTemplateId[template.id] ?? ""}
                      onChange={(event) =>
                        setItemDraftByTemplateId((current) => ({
                          ...current,
                          [template.id]: event.target.value,
                        }))
                      }
                      placeholder="Ajouter un item"
                    />
                    <Button size="sm" loading={isPending} onClick={() => addItem(template.id)}>
                      <PlusIcon className="size-4" />
                      Ajouter
                    </Button>
                  </div>
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Modal
        open={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Nouveau modele de checklist"
        description="Nom, type, description et statut par defaut."
        className="max-w-2xl"
      >
        <form className="space-y-4" onSubmit={createTemplate}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-secondary">Type de checklist</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATE_TYPES.map((option) => {
                const visual = typeVisual(option.value);
                const isSelected = draft.type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        type: option.value,
                        recurrenceRule:
                          option.value === "routine"
                            ? current.recurrenceRule === "none"
                              ? "daily"
                              : current.recurrenceRule
                            : "none",
                        recurrenceDays: option.value === "routine" ? current.recurrenceDays : [],
                      }))
                    }
                    className={cn(
                      "rounded-radius-button border-2 p-3 text-left transition-all",
                      visual.cardClassName,
                      isSelected ? "ring-2 ring-brand-primary shadow-card" : "hover:shadow-card",
                    )}
                  >
                    <p className="text-xl">{visual.emoji}</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{option.label}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-text-secondary">
              La section recurrence apparait quand le type <strong>Routine</strong> est selectionne.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="checklist-template-label-modal" className="text-sm font-semibold text-text-secondary">
              Nom du modele
            </label>
            <Input
              id="checklist-template-label-modal"
              value={draft.label}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((current) => ({ ...current, label: value }));
                nameField.setValue(value);
              }}
              onBlur={nameField.markTouched}
              errorMessage={nameField.hasError ? nameField.error ?? undefined : undefined}
              placeholder="Sac de piscine"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="checklist-template-description-modal" className="text-sm font-semibold text-text-secondary">
              Description (optionnel)
            </label>
            <TextArea
              id="checklist-template-description-modal"
              value={draft.description ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              className="min-h-24"
              placeholder="Affaires a preparer"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="checklist-template-schedule-date-modal" className="text-sm font-semibold text-text-secondary">
              Programmer directement pour une date (optionnel)
            </label>
            <Input
              id="checklist-template-schedule-date-modal"
              type="date"
              value={createScheduleDate}
              onChange={(event) => setCreateScheduleDate(event.target.value)}
            />
          </div>

          <div className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/70 p-3">
            <label className="flex items-start gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))}
                className="mt-0.5 size-4 rounded border-border-default"
              />
              Definir comme modele par defaut pour ce type.
            </label>
          </div>

          {draft.type === "routine" ? (
            <div className="space-y-3 rounded-radius-button border border-border-subtle bg-bg-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Recurrence</p>
              <Select
                value={draft.recurrenceRule === "none" ? "daily" : draft.recurrenceRule}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    recurrenceRule: event.target.value as ChecklistRecurrenceRule,
                  }))
                }
              >
                {RECURRENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {draft.recurrenceRule === "weekly_days" ? (
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const active = draft.recurrenceDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          setDraft((current) => {
                            const days = current.recurrenceDays.includes(day.value)
                              ? current.recurrenceDays.filter((value) => value !== day.value)
                              : [...current.recurrenceDays, day.value];
                            return { ...current, recurrenceDays: days.sort((a, b) => a - b) };
                          })
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          active
                            ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                            : "border-border-default text-text-secondary",
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="date"
                  value={draft.recurrenceStartDate ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, recurrenceStartDate: event.target.value || null }))
                  }
                />
                <Input
                  type="date"
                  value={draft.recurrenceEndDate ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, recurrenceEndDate: event.target.value || null }))
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="tertiary" onClick={closeCreateModal} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" loading={isPending}>
              <ListChecksIcon className="size-4" />
              Creer le modele
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

