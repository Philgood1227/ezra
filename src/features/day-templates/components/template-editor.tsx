"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CategoryIcon,
  Input,
  RichTextEditor,
  Select,
  TextArea,
} from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  createTemplateAction,
  createTemplateBlockAction,
  createTemplateTaskAction,
  deleteTemplateAction,
  deleteTemplateBlockAction,
  deleteTemplateTaskAction,
  moveTemplateTaskAction,
  updateTemplateAction,
  updateTemplateBlockAction,
  updateTemplateTaskAction,
} from "@/lib/actions/day-templates";
import { useFormField } from "@/lib/hooks/useFormField";
import {
  CATEGORY_CODES,
  getCategoryCodeLabel,
  getCategoryColorOption,
  getSubkindSuggestionsForCategoryCode,
  normalizeSubkindInput,
  parseCategoryCode,
  WEEKDAY_OPTIONS,
} from "@/lib/day-templates/constants";
import { resolveTaskInstructionsEditorInitialHtml } from "@/lib/day-templates/instructions";
import {
  getChildTimeBlockForTimeRange,
  getChildTimeBlockLabel,
} from "@/lib/time/day-segments";
import type {
  CategoryCode,
  DayTemplateBlockInput,
  DayTemplateBlockSummary,
  PlanActionableKind,
  TaskCategorySummary,
  TemplateInput,
  TemplateTaskInput,
  TemplateTaskSummary,
  TemplateWithTasks,
} from "@/lib/day-templates/types";

interface DayTemplateEditorProps {
  categories: TaskCategorySummary[];
  template: TemplateWithTasks | null;
  initialWeekday: number;
  mode?: "all" | "structure" | "tasks";
  taskScope?: "all" | "school" | "extra";
  templateBasePath?: string;
  knowledgeCardOptions: Array<{
    id: string;
    title: string;
    subjectLabel: string;
    categoryLabel: string;
  }>;
}

const BLOCK_OPTIONS: Array<{ value: DayTemplateBlockInput["blockType"]; label: string }> = [
  { value: "school", label: "Ecole" },
  { value: "home", label: "Maison" },
  { value: "transport", label: "Trajet" },
  { value: "club", label: "Club" },
  { value: "daycare", label: "Garderie" },
  { value: "free_time", label: "Temps libre" },
  { value: "other", label: "Autre" },
];
const SCHOOL_CATEGORY_CODE_SET = new Set<CategoryCode>(["homework", "revision", "training"]);

function getCategoryById(categories: TaskCategorySummary[], categoryId: string): TaskCategorySummary | undefined {
  return categories.find((category) => category.id === categoryId);
}

function resolveCategoryDefaultTaskKind(
  categories: TaskCategorySummary[],
  categoryId: string,
): PlanActionableKind | undefined {
  return getCategoryById(categories, categoryId)?.defaultItemKind ?? undefined;
}

function resolveTaskKind(categories: TaskCategorySummary[], categoryId: string): PlanActionableKind {
  return resolveCategoryDefaultTaskKind(categories, categoryId) ?? "mission";
}

function defaultTask(categories: TaskCategorySummary[]): TemplateTaskInput {
  const categoryId = categories[0]?.id ?? "";
  const itemKind = resolveTaskKind(categories, categoryId);

  return {
    categoryId,
    itemKind,
    itemSubkind: null,
    title: "",
    description: null,
    instructionsHtml: null,
    startTime: "07:30",
    endTime: "08:00",
    pointsBase: 2,
    knowledgeCardId: null,
    recommendedChildTimeBlockId: getChildTimeBlockForTimeRange("07:30", "08:00"),
  };
}

function defaultBlock(): DayTemplateBlockInput {
  return {
    blockType: "school",
    label: "Ecole",
    startTime: "08:30",
    endTime: "12:00",
    childTimeBlockId: getChildTimeBlockForTimeRange("08:30", "12:00"),
  };
}

function templateNameError(value: string): string | null {
  return value.trim().length >= 2 ? null : "Nom requis";
}

function taskTitleError(value: string): string | null {
  return value.trim().length >= 2 ? null : "Titre requis";
}

function isValidRange(startTime: string, endTime: string): boolean {
  return startTime < endTime;
}

function isSchoolCategoryCode(code: CategoryCode | null): boolean {
  return code ? SCHOOL_CATEGORY_CODE_SET.has(code) : false;
}

function blockLabel(block: DayTemplateBlockSummary): string {
  return block.label ?? BLOCK_OPTIONS.find((option) => option.value === block.blockType)?.label ?? "Bloc";
}

function resolveBlockChildLabel(block: DayTemplateBlockSummary): string {
  const childBlockId =
    block.childTimeBlockId ?? getChildTimeBlockForTimeRange(block.startTime, block.endTime);
  return getChildTimeBlockLabel(childBlockId);
}

function resolveTaskChildLabel(task: TemplateTaskSummary): string {
  const childBlockId =
    task.recommendedChildTimeBlockId ?? getChildTimeBlockForTimeRange(task.startTime, task.endTime);
  return getChildTimeBlockLabel(childBlockId);
}

function taskSchoolContext(task: TemplateTaskSummary, blocks: DayTemplateBlockSummary[]): string {
  const schoolBlocks = blocks
    .filter((block) => block.blockType === "school")
    .sort((left, right) => left.startTime.localeCompare(right.startTime));

  if (schoolBlocks.length === 0) {
    return "Hors plage scolaire";
  }

  const first = schoolBlocks[0];
  const last = schoolBlocks[schoolBlocks.length - 1];

  if (first && task.endTime <= first.startTime) {
    return "Avant l'ecole";
  }

  if (last && task.startTime >= last.endTime) {
    return "Apres l'ecole";
  }

  return "Autour de l'ecole";
}

export function DayTemplateEditor({
  categories,
  template,
  initialWeekday,
  mode = "all",
  taskScope = "all",
  templateBasePath = "/parent/day-templates",
  knowledgeCardOptions,
}: DayTemplateEditorProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const templateNameField = useFormField({
    initialValue: template?.name ?? "",
    validate: templateNameError,
  });
  const resetTemplateNameField = templateNameField.reset;

  const taskTitleField = useFormField({
    initialValue: "",
    validate: taskTitleError,
  });
  const resetTaskTitleField = taskTitleField.reset;

  const [templateDraft, setTemplateDraft] = useState<TemplateInput>({
    name: template?.name ?? "",
    weekday: template?.weekday ?? initialWeekday,
    isDefault: template?.isDefault ?? true,
  });
  const [taskDraft, setTaskDraft] = useState<TemplateTaskInput>(() => defaultTask(categories));
  const [blockDraft, setBlockDraft] = useState<DayTemplateBlockInput>(() => defaultBlock());

  const orderedTasks = useMemo(() => template?.tasks ?? [], [template?.tasks]);
  const orderedBlocks = useMemo(
    () => [...(template?.blocks ?? [])].sort((left, right) => left.startTime.localeCompare(right.startTime)),
    [template?.blocks],
  );
  const selectableCategories = useMemo(() => {
    const byCode = new Map<CategoryCode, TaskCategorySummary>();

    for (const category of categories) {
      const categoryCode = parseCategoryCode(category.code ?? null);
      if (!categoryCode) {
        continue;
      }

      if (!byCode.has(categoryCode)) {
        byCode.set(categoryCode, category);
      }
    }

    return CATEGORY_CODES.map((code) => byCode.get(code)).filter(
      (category): category is TaskCategorySummary => Boolean(category),
    );
  }, [categories]);
  const schoolSelectableCategories = useMemo(
    () =>
      selectableCategories.filter((category) =>
        isSchoolCategoryCode(parseCategoryCode(category.code ?? null)),
      ),
    [selectableCategories],
  );
  const extraSelectableCategories = useMemo(
    () =>
      selectableCategories.filter(
        (category) => !isSchoolCategoryCode(parseCategoryCode(category.code ?? null)),
      ),
    [selectableCategories],
  );
  const scopedSelectableCategories = useMemo(() => {
    if (taskScope === "school") {
      return schoolSelectableCategories;
    }

    if (taskScope === "extra") {
      return extraSelectableCategories;
    }

    return selectableCategories;
  }, [extraSelectableCategories, schoolSelectableCategories, selectableCategories, taskScope]);

  const selectedTask = orderedTasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedBlock = orderedBlocks.find((block) => block.id === selectedBlockId) ?? null;

  useEffect(() => {
    if (!template) {
      return;
    }

    setTemplateDraft({
      name: template.name,
      weekday: template.weekday,
      isDefault: template.isDefault,
    });
    resetTemplateNameField(template.name);
  }, [template, resetTemplateNameField]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskDraft(defaultTask(scopedSelectableCategories));
      resetTaskTitleField("");
      return;
    }

    setTaskDraft({
      categoryId: selectedTask.categoryId,
      itemKind: selectedTask.itemKind ?? resolveTaskKind(scopedSelectableCategories, selectedTask.categoryId),
      itemSubkind: selectedTask.itemSubkind ?? null,
      title: selectedTask.title,
      description: selectedTask.description,
      instructionsHtml: resolveTaskInstructionsEditorInitialHtml({
        instructionsHtml: selectedTask.instructionsHtml,
        description: selectedTask.description,
      }),
      startTime: selectedTask.startTime,
      endTime: selectedTask.endTime,
      pointsBase: selectedTask.pointsBase,
      knowledgeCardId: selectedTask.knowledgeCardId ?? null,
      recommendedChildTimeBlockId:
        selectedTask.recommendedChildTimeBlockId ??
        getChildTimeBlockForTimeRange(selectedTask.startTime, selectedTask.endTime),
    });
    resetTaskTitleField(selectedTask.title);
  }, [resetTaskTitleField, scopedSelectableCategories, selectedTask]);

  useEffect(() => {
    if (!selectedBlock) {
      setBlockDraft(defaultBlock());
      return;
    }

    setBlockDraft({
      blockType: selectedBlock.blockType,
      label: selectedBlock.label,
      startTime: selectedBlock.startTime,
      endTime: selectedBlock.endTime,
      childTimeBlockId:
        selectedBlock.childTimeBlockId ??
        getChildTimeBlockForTimeRange(selectedBlock.startTime, selectedBlock.endTime),
    });
  }, [selectedBlock]);

  useEffect(() => {
    if (scopedSelectableCategories.length === 0) {
      return;
    }

    const hasCategory = scopedSelectableCategories.some((category) => category.id === taskDraft.categoryId);
    if (hasCategory) {
      return;
    }

    const nextCategory = scopedSelectableCategories[0];
    if (!nextCategory) {
      return;
    }

    const nextDefaultKind = resolveCategoryDefaultTaskKind(scopedSelectableCategories, nextCategory.id);
    setTaskDraft((current) => {
      const nextDraft: TemplateTaskInput = {
        ...current,
        categoryId: nextCategory.id,
        itemSubkind: null,
      };

      if (nextDefaultKind) {
        nextDraft.itemKind = nextDefaultKind;
      } else if (!nextDraft.itemKind) {
        delete nextDraft.itemKind;
      }

      return nextDraft;
    });
  }, [scopedSelectableCategories, taskDraft.categoryId]);

  function saveTemplate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);

    templateNameField.markTouched();
    if (templateNameField.validateNow()) {
      setFeedback({ tone: "error", message: "Le nom de la journee type est requis." });
      return;
    }

    startTransition(async () => {
      if (!template) {
        const created = await createTemplateAction({
          name: templateDraft.name.trim(),
          weekday: templateDraft.weekday,
          isDefault: templateDraft.isDefault,
        });
        if (!created.success || !created.data?.id) {
          setFeedback({ tone: "error", message: created.error ?? "Impossible de creer la journee type." });
          return;
        }

        const normalizedTemplateBasePath = templateBasePath.replace(/\/$/, "");
        router.push(`${normalizedTemplateBasePath}/${created.data.id}`);
        router.refresh();
        return;
      }

      const updated = await updateTemplateAction(template.id, {
        name: templateDraft.name.trim(),
        weekday: templateDraft.weekday,
        isDefault: templateDraft.isDefault,
      });

      if (!updated.success) {
        setFeedback({ tone: "error", message: updated.error ?? "Impossible d'enregistrer la journee type." });
        return;
      }

      setFeedback({ tone: "success", message: "Journee type mise a jour." });
      router.refresh();
    });
  }

  function removeTemplate(): void {
    if (!template) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTemplateAction(template.id);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer la journee type." });
        return;
      }

      router.push(templateBasePath);
      router.refresh();
    });
  }

  function saveBlock(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!template) {
      return;
    }

    if (!blockDraft.label?.trim()) {
      setFeedback({ tone: "error", message: "Le libelle de la plage est requis." });
      return;
    }

    if (!isValidRange(blockDraft.startTime, blockDraft.endTime)) {
      setFeedback({ tone: "error", message: "L'heure de fin doit etre apres l'heure de debut." });
      return;
    }

    startTransition(async () => {
      const payload: DayTemplateBlockInput = {
        blockType: blockDraft.blockType,
        label: blockDraft.label?.trim() ?? null,
        startTime: blockDraft.startTime,
        endTime: blockDraft.endTime,
        childTimeBlockId: blockDraftChildTimeBlockId,
      };

      const result = selectedBlock
        ? await updateTemplateBlockAction(selectedBlock.id, payload)
        : await createTemplateBlockAction(template.id, payload);

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer la plage." });
        return;
      }

      setSelectedBlockId(null);
      router.refresh();
    });
  }

  function removeBlock(blockId: string): void {
    startTransition(async () => {
      const result = await deleteTemplateBlockAction(blockId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer cette plage." });
        return;
      }

      if (selectedBlockId === blockId) {
        setSelectedBlockId(null);
      }
      router.refresh();
    });
  }

  function saveTask(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!template) {
      return;
    }

    taskTitleField.markTouched();
    if (taskTitleField.validateNow()) {
      setFeedback({ tone: "error", message: "Le titre de la tache est requis." });
      return;
    }

    if (!isValidRange(taskDraft.startTime, taskDraft.endTime)) {
      setFeedback({ tone: "error", message: "L'heure de fin doit etre apres l'heure de debut." });
      return;
    }

    startTransition(async () => {
      const resolvedItemKind = taskDraft.itemKind ?? resolveTaskKind(scopedSelectableCategories, taskDraft.categoryId);
      const normalizedSubkind = normalizeSubkindInput(taskDraft.itemSubkind ?? "");

      const payload: TemplateTaskInput = {
        categoryId: taskDraft.categoryId,
        itemKind: resolvedItemKind,
        itemSubkind: normalizedSubkind || null,
        title: taskDraft.title.trim(),
        description: taskDraft.description?.trim() ? taskDraft.description.trim() : null,
        instructionsHtml: taskDraft.instructionsHtml?.trim() ? taskDraft.instructionsHtml : null,
        startTime: taskDraft.startTime,
        endTime: taskDraft.endTime,
        pointsBase: Math.max(0, Math.trunc(taskDraft.pointsBase)),
        knowledgeCardId: taskDraft.knowledgeCardId ?? null,
        recommendedChildTimeBlockId: taskDraftRecommendedChildTimeBlockId,
      };

      const result = selectedTask
        ? await updateTemplateTaskAction(selectedTask.id, payload)
        : await createTemplateTaskAction(template.id, payload);

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer la tache." });
        return;
      }

      setSelectedTaskId(null);
      router.refresh();
    });
  }

  function removeTask(taskId: string): void {
    startTransition(async () => {
      const result = await deleteTemplateTaskAction(taskId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer cette tache." });
        return;
      }

      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
      router.refresh();
    });
  }

  function moveTask(taskId: string, direction: "up" | "down"): void {
    startTransition(async () => {
      const result = await moveTemplateTaskAction(taskId, direction);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de reordonner les taches." });
        return;
      }

      router.refresh();
    });
  }

  const taskDraftCategory = getCategoryById(scopedSelectableCategories, taskDraft.categoryId);
  const taskDraftCategoryCode = taskDraftCategory ? parseCategoryCode(taskDraftCategory.code ?? null) : null;
  const taskSubkindSuggestions = getSubkindSuggestionsForCategoryCode(taskDraftCategoryCode);
  const taskSubkindListId = taskDraftCategoryCode ? `task-subkind-${taskDraftCategoryCode}` : "task-subkind-none";
  const schoolTasks = orderedTasks.filter((task) =>
    isSchoolCategoryCode(parseCategoryCode(task.category.code ?? null)),
  );
  const extraTasks = orderedTasks.filter(
    (task) => !isSchoolCategoryCode(parseCategoryCode(task.category.code ?? null)),
  );
  const showSchoolTaskSection = taskScope !== "extra";
  const showExtraTaskSection = taskScope !== "school";
  const taskPanelTitle =
    taskScope === "school" ? "Missions d'ecole programmees" : taskScope === "extra" ? "Activites plaisir programmees" : "Taches programmees";
  const taskPanelDescription =
    taskScope === "school"
      ? "Taches scolaires (devoirs, revisions, entrainement)."
      : taskScope === "extra"
        ? "Activites plaisir et vie quotidienne."
        : "Gestion des taches hebdomadaires, separees par univers.";
  const taskFormTitle =
    taskScope === "school"
      ? selectedTask
        ? "Modifier la mission d'ecole"
        : "Ajouter une mission d'ecole"
      : taskScope === "extra"
        ? selectedTask
          ? "Modifier l'activite plaisir"
          : "Ajouter une activite plaisir"
        : selectedTask
          ? "Modifier la tache"
          : "Ajouter une tache";
  const showStructureSections = mode !== "tasks";
  const showTaskSections = mode !== "structure";
  const blockDraftChildTimeBlockId = getChildTimeBlockForTimeRange(
    blockDraft.startTime,
    blockDraft.endTime,
  );
  const taskDraftRecommendedChildTimeBlockId = getChildTimeBlockForTimeRange(
    taskDraft.startTime,
    taskDraft.endTime,
  );

  function renderTaskCard(task: TemplateTaskSummary): React.JSX.Element {
    const index = orderedTasks.findIndex((entry) => entry.id === task.id);
    const color = getCategoryColorOption(task.category.colorKey);
    const categoryLabel = task.category?.name?.trim() ?? "";
    const currentTaskSubkind = task.itemSubkind?.trim() ? task.itemSubkind.trim() : null;
    return (
      <div
        key={task.id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedTaskId(task.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSelectedTaskId(task.id);
          }
        }}
        className={`w-full rounded-radius-button border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${color.eventClass} ${
          selectedTaskId === task.id ? "ring-2 ring-brand-primary" : ""
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {categoryLabel ? (
              <Badge data-testid="parent-task-category-pill" className={color.badgeClass}>
                <CategoryIcon iconKey={task.category.icon} className="size-4" /> {categoryLabel}
              </Badge>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {currentTaskSubkind ? (
                <Badge className="bg-bg-surface-hover text-text-secondary">{currentTaskSubkind}</Badge>
              ) : null}
            </div>
            <p data-testid="parent-task-title" className="mt-1 font-semibold text-text-primary">
              {task.title}
            </p>
            <p className="text-xs text-text-secondary">
              {task.startTime} - {task.endTime} | +{task.pointsBase} pts
            </p>
            <p className="text-xs font-semibold text-text-secondary">{taskSchoolContext(task, orderedBlocks)}</p>
            <p className="text-xs text-text-muted">Bloc enfant : {resolveTaskChildLabel(task)}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={index <= 0 || isPending}
              onClick={(event) => {
                event.stopPropagation();
                moveTask(task.id, "up");
              }}
            >
              Monter
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={index < 0 || index === orderedTasks.length - 1 || isPending}
              onClick={(event) => {
                event.stopPropagation();
                moveTask(task.id, "down");
              }}
            >
              Descendre
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                removeTask(task.id);
              }}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showStructureSections ? (
        <Card>
          <CardHeader>
            <CardTitle>{template ? "Parametres de la journee type" : "Creer une journee type"}</CardTitle>
            <CardDescription>Nom, jour et statut par defaut.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveTemplate}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="template-name" className="text-sm font-semibold text-text-secondary">
                    Nom de la journee type
                  </label>
                  <Input
                    id="template-name"
                    value={templateDraft.name}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTemplateDraft((current) => ({ ...current, name: value }));
                      templateNameField.setValue(value);
                    }}
                    onBlur={templateNameField.markTouched}
                    errorMessage={templateNameField.hasError ? templateNameField.error ?? undefined : undefined}
                    successMessage={templateNameField.isValid ? "Champ valide" : undefined}
                    placeholder="Journee d'ecole"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="template-weekday" className="text-sm font-semibold text-text-secondary">
                    Jour de la semaine
                  </label>
                  <Select
                    id="template-weekday"
                    value={String(templateDraft.weekday)}
                    onChange={(event) =>
                      setTemplateDraft((current) => ({ ...current, weekday: Number(event.target.value) }))
                    }
                  >
                    {WEEKDAY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={templateDraft.isDefault}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({ ...current, isDefault: event.target.checked }))
                  }
                  className="size-4 rounded border-border-default"
                />
                Definir comme modele par defaut pour ce jour
              </label>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={isPending}>
                  {template ? "Enregistrer" : "Creer"}
                </Button>
                {template ? (
                  <Button type="button" variant="ghost" onClick={removeTemplate} disabled={isPending}>
                    Supprimer la journee type
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {feedback ? <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {showStructureSections ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Plages de la journee</CardTitle>
              <CardDescription>Plages structurelles (ecole, garderie, etc.).</CardDescription>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setSelectedBlockId(null)} disabled={!template}>
              Nouvelle plage
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {!template ? (
              <p className="text-sm text-text-secondary">Creez la journee type avant d&apos;ajouter des plages.</p>
            ) : orderedBlocks.length === 0 ? (
              <p className="text-sm text-text-secondary">Aucune plage pour l&apos;instant.</p>
            ) : (
              orderedBlocks.map((block) => (
                <div
                  key={block.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBlockId(block.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedBlockId(block.id);
                    }
                  }}
                  className={`w-full rounded-radius-button border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                    selectedBlockId === block.id ? "ring-2 ring-brand-primary" : ""
                  } ${block.blockType === "school" ? "border-category-ecole/40 bg-category-ecole/16" : "border-border-default bg-bg-surface-hover/60"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-primary">{blockLabel(block)}</p>
                      <p className="text-xs text-text-secondary">
                        {block.startTime} - {block.endTime}
                      </p>
                      <p className="text-xs text-text-muted">
                        Bloc enfant : {resolveBlockChildLabel(block)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeBlock(block.id);
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedBlock ? "Modifier une plage" : "Ajouter une plage"}</CardTitle>
          </CardHeader>
          <CardContent>
            {!template ? (
              <p className="text-sm text-text-secondary">Sauvegardez d&apos;abord la journee type.</p>
            ) : (
              <form className="space-y-4" onSubmit={saveBlock}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="block-type" className="text-sm font-semibold text-text-secondary">
                      Type
                    </label>
                    <Select
                      id="block-type"
                      value={blockDraft.blockType}
                      onChange={(event) =>
                        setBlockDraft((current) => ({
                          ...current,
                          blockType: event.target.value as DayTemplateBlockInput["blockType"],
                        }))
                      }
                    >
                      {BLOCK_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="block-label" className="text-sm font-semibold text-text-secondary">
                      Libelle
                    </label>
                    <Input
                      id="block-label"
                      value={blockDraft.label ?? ""}
                      onChange={(event) => setBlockDraft((current) => ({ ...current, label: event.target.value }))}
                      placeholder="Ecole matin"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="block-start" className="text-sm font-semibold text-text-secondary">
                      Debut
                    </label>
                    <Input
                      id="block-start"
                      type="time"
                      value={blockDraft.startTime}
                      onChange={(event) => setBlockDraft((current) => ({ ...current, startTime: event.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="block-end" className="text-sm font-semibold text-text-secondary">
                      Fin
                    </label>
                    <Input
                      id="block-end"
                      type="time"
                      value={blockDraft.endTime}
                      onChange={(event) => setBlockDraft((current) => ({ ...current, endTime: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <p className="text-xs text-text-secondary">
                  Cette plage apparaitra dans le bloc {getChildTimeBlockLabel(blockDraftChildTimeBlockId)} pour
                  l&apos;enfant.
                </p>

                <div className="flex gap-2">
                  <Button type="submit" loading={isPending}>
                    {selectedBlock ? "Enregistrer la plage" : "Ajouter la plage"}
                  </Button>
                  {selectedBlock ? (
                    <Button type="button" variant="ghost" onClick={() => setSelectedBlockId(null)}>
                      Nouvelle plage
                    </Button>
                  ) : null}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div> : null}

      {showTaskSections ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{taskPanelTitle}</CardTitle>
            <CardDescription>{taskPanelDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSchoolTaskSection ? (
              <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">Scolarite</p>
                <p className="text-xs text-text-secondary">{schoolTasks.length} tache(s)</p>
              </div>
              {schoolTasks.length === 0 ? (
                <p className="text-sm text-text-secondary">Aucune tache scolaire.</p>
              ) : (
                <div className="space-y-3">{schoolTasks.map((task) => renderTaskCard(task))}</div>
              )}
              </section>
            ) : null}

            {showExtraTaskSection ? (
              <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">Vie quotidienne & extras</p>
                <p className="text-xs text-text-secondary">{extraTasks.length} tache(s)</p>
              </div>
              {extraTasks.length === 0 ? (
                <p className="text-sm text-text-secondary">Aucune tache extra-scolaire.</p>
              ) : (
                <div className="space-y-3">{extraTasks.map((task) => renderTaskCard(task))}</div>
              )}
              </section>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{taskFormTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {!template ? (
              <p className="text-sm text-text-secondary">Sauvegardez d&apos;abord la journee type.</p>
            ) : scopedSelectableCategories.length === 0 ? (
              <p className="text-sm text-text-secondary">Ajoutez d&apos;abord une categorie de tache.</p>
            ) : (
              <form className="space-y-4" onSubmit={saveTask}>
                <div className="space-y-1">
                  <label htmlFor="task-title" className="text-sm font-semibold text-text-secondary">
                    Titre
                  </label>
                  <Input
                    id="task-title"
                    value={taskDraft.title}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTaskDraft((current) => ({ ...current, title: value }));
                      taskTitleField.setValue(value);
                    }}
                    onBlur={taskTitleField.markTouched}
                    errorMessage={taskTitleField.hasError ? taskTitleField.error ?? undefined : undefined}
                    successMessage={taskTitleField.isValid ? "Champ valide" : undefined}
                    placeholder="Petit dejeuner"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="task-category" className="text-sm font-semibold text-text-secondary">
                    Categorie
                  </label>
                  <Select
                    id="task-category"
                    value={taskDraft.categoryId}
                    onChange={(event) =>
                      setTaskDraft((current) => {
                        const nextCategoryId = event.target.value;
                        const nextDefaultKind = resolveCategoryDefaultTaskKind(scopedSelectableCategories, nextCategoryId);
                        const nextDraft: TemplateTaskInput = {
                          ...current,
                          categoryId: nextCategoryId,
                          itemSubkind: null,
                        };

                        if (nextDefaultKind) {
                          nextDraft.itemKind = nextDefaultKind;
                        } else {
                          delete nextDraft.itemKind;
                        }

                        return nextDraft;
                      })
                    }
                  >
                    {taskScope === "all" ? (
                      <>
                        {schoolSelectableCategories.length > 0 ? (
                          <optgroup label="Scolarite">
                            {schoolSelectableCategories.map((category) => {
                              const categoryCode = parseCategoryCode(category.code ?? null);
                              if (!categoryCode) {
                                return null;
                              }

                              return (
                                <option key={category.id} value={category.id}>
                                  {getCategoryCodeLabel(categoryCode)}
                                </option>
                              );
                            })}
                          </optgroup>
                        ) : null}
                        {extraSelectableCategories.length > 0 ? (
                          <optgroup label="Vie quotidienne & extras">
                            {extraSelectableCategories.map((category) => {
                              const categoryCode = parseCategoryCode(category.code ?? null);
                              if (!categoryCode) {
                                return null;
                              }

                              return (
                                <option key={category.id} value={category.id}>
                                  {getCategoryCodeLabel(categoryCode)}
                                </option>
                              );
                            })}
                          </optgroup>
                        ) : null}
                      </>
                    ) : (
                      scopedSelectableCategories.map((category) => {
                        const categoryCode = parseCategoryCode(category.code ?? null);
                        if (!categoryCode) {
                          return null;
                        }

                        return (
                          <option key={category.id} value={category.id}>
                            {getCategoryCodeLabel(categoryCode)}
                          </option>
                        );
                      })
                    )}
                  </Select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="task-subkind" className="text-sm font-semibold text-text-secondary">
                    Sous-type (optionnel)
                  </label>
                  <Input
                    id="task-subkind"
                    value={taskDraft.itemSubkind ?? ""}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, itemSubkind: event.target.value || null }))
                    }
                    list={taskSubkindListId}
                    autoComplete="off"
                    maxLength={60}
                    placeholder={
                      taskDraftCategory
                        ? "Ex: Mathematiques, Chorale, Film..."
                        : "Choisis d'abord une categorie"
                    }
                  />
                  <p data-testid="task-subkind-hint" className="text-xs text-text-secondary">
                    {!taskDraftCategory
                      ? "Choisis d'abord une categorie."
                      : taskSubkindSuggestions.length === 0
                        ? "Sous-type libre (optionnel)."
                        : "Sous-type (optionnel) - suggere selon la categorie."}
                  </p>
                  <datalist id={taskSubkindListId} data-testid="task-subkind-suggestions">
                    {taskSubkindSuggestions.map((subkind) => (
                      <option key={subkind} value={subkind} />
                    ))}
                  </datalist>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <label htmlFor="task-start" className="text-sm font-semibold text-text-secondary">
                      Debut
                    </label>
                    <Input
                      id="task-start"
                      type="time"
                      value={taskDraft.startTime}
                      onChange={(event) =>
                        setTaskDraft((current) => ({ ...current, startTime: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="task-end" className="text-sm font-semibold text-text-secondary">
                      Fin
                    </label>
                    <Input
                      id="task-end"
                      type="time"
                      value={taskDraft.endTime}
                      onChange={(event) =>
                        setTaskDraft((current) => ({ ...current, endTime: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="task-points" className="text-sm font-semibold text-text-secondary">
                      Points
                    </label>
                    <Input
                      id="task-points"
                      type="number"
                      min={0}
                      max={99}
                      value={taskDraft.pointsBase}
                      onChange={(event) =>
                        setTaskDraft((current) => ({
                          ...current,
                          pointsBase: Number(event.target.value || 0),
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <p className="text-xs text-text-secondary">
                  Cette mission apparaitra dans le bloc{" "}
                  {getChildTimeBlockLabel(taskDraftRecommendedChildTimeBlockId)} pour l&apos;enfant.
                </p>

                <div className="space-y-1">
                  <label htmlFor="task-description" className="text-sm font-semibold text-text-secondary">
                    Description
                  </label>
                  <TextArea
                    id="task-description"
                    rows={3}
                    value={taskDraft.description ?? ""}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Consigne ou contexte de la tache"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-text-secondary">Instructions (rich text)</label>
                  <p className="text-xs text-text-secondary">
                    Source principale affichee a Ezra dans le mode mission et Focus.
                  </p>
                  <RichTextEditor
                    valueHtml={taskDraft.instructionsHtml ?? ""}
                    onChangeHtml={(html) =>
                      setTaskDraft((current) => ({
                        ...current,
                        instructionsHtml: html || null,
                      }))
                    }
                    placeholder="Ex: Commence par lire la consigne, puis coche chaque etape."
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="task-knowledge-card" className="text-sm font-semibold text-text-secondary">
                    Fiche d&apos;aide (optionnel)
                  </label>
                  <Select
                    id="task-knowledge-card"
                    value={taskDraft.knowledgeCardId ?? ""}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        knowledgeCardId: event.target.value || null,
                      }))
                    }
                  >
                    <option value="">Aucune fiche</option>
                    {knowledgeCardOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.subjectLabel} - {option.title}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" loading={isPending}>
                    {selectedTask ? "Enregistrer la tache" : "Ajouter la tache"}
                  </Button>
                  {selectedTask ? (
                    <Button type="button" variant="ghost" onClick={() => setSelectedTaskId(null)}>
                      Nouvelle tache
                    </Button>
                  ) : null}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div> : null}

      {showStructureSections ? <Card>
        <CardHeader>
          <CardTitle>Previsualisation de la structure</CardTitle>
          <CardDescription>Plages structurelles de la journee type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {orderedBlocks.length === 0 ? (
            <p className="text-sm text-text-secondary">Aucun contenu planifie.</p>
          ) : (
            <>
              {orderedBlocks.map((block) => (
                <div
                  key={`preview-block-${block.id}`}
                  className={`rounded-radius-button border px-3 py-2 ${
                    block.blockType === "school" ? "border-category-ecole/40 bg-category-ecole/16" : "border-border-default bg-bg-surface-hover/60"
                  }`}
                >
                  <p className="text-xs text-text-secondary">
                    {block.startTime} - {block.endTime}
                  </p>
                  <p className="font-semibold text-text-primary">{blockLabel(block)}</p>
                  <p className="text-xs text-text-muted">Bloc enfant : {resolveBlockChildLabel(block)}</p>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card> : null}
    </div>
  );
}
