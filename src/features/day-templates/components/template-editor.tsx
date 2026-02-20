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
  Input,
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
import { getParentAssignmentLabel } from "@/lib/domain/assignments";
import { useFormField } from "@/lib/hooks/useFormField";
import {
  getCategoryColorOption,
  getPlanActionableKindLabel,
  PLAN_ACTIONABLE_KIND_OPTIONS,
  PLAN_SUBKIND_SUGGESTIONS,
  WEEKDAY_OPTIONS,
} from "@/lib/day-templates/constants";
import type {
  DayTemplateBlockInput,
  DayTemplateBlockSummary,
  FamilyMemberSummary,
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
  familyMembers: FamilyMemberSummary[];
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

function getCategoryById(categories: TaskCategorySummary[], categoryId: string): TaskCategorySummary | undefined {
  return categories.find((category) => category.id === categoryId);
}

function resolveTaskKind(categories: TaskCategorySummary[], categoryId: string): PlanActionableKind {
  return getCategoryById(categories, categoryId)?.defaultItemKind ?? "mission";
}

function taskKindBadgeClass(kind: PlanActionableKind): string {
  return (
    PLAN_ACTIONABLE_KIND_OPTIONS.find((option) => option.value === kind)?.badgeClass ??
    "bg-accent-100 text-accent-900"
  );
}

function defaultTask(categories: TaskCategorySummary[]): TemplateTaskInput {
  const categoryId = categories[0]?.id ?? "";
  const itemKind = resolveTaskKind(categories, categoryId);

  return {
    categoryId,
    itemKind,
    itemSubkind: null,
    assignedProfileId: null,
    title: "",
    description: null,
    startTime: "07:30",
    endTime: "08:00",
    pointsBase: 2,
    knowledgeCardId: null,
  };
}

function defaultBlock(): DayTemplateBlockInput {
  return {
    blockType: "school",
    label: "Ecole",
    startTime: "08:30",
    endTime: "12:00",
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

function toAssignedLabel(member: FamilyMemberSummary): string {
  return member.role === "child" ? "Enfant" : member.displayName;
}

function blockLabel(block: DayTemplateBlockSummary): string {
  return block.label ?? BLOCK_OPTIONS.find((option) => option.value === block.blockType)?.label ?? "Bloc";
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
  familyMembers,
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
      setTaskDraft(defaultTask(categories));
      resetTaskTitleField("");
      return;
    }

    setTaskDraft({
      categoryId: selectedTask.categoryId,
      itemKind: selectedTask.itemKind ?? resolveTaskKind(categories, selectedTask.categoryId),
      itemSubkind: selectedTask.itemSubkind ?? null,
      assignedProfileId: selectedTask.assignedProfileId ?? null,
      title: selectedTask.title,
      description: selectedTask.description,
      startTime: selectedTask.startTime,
      endTime: selectedTask.endTime,
      pointsBase: selectedTask.pointsBase,
      knowledgeCardId: selectedTask.knowledgeCardId ?? null,
    });
    resetTaskTitleField(selectedTask.title);
  }, [categories, resetTaskTitleField, selectedTask]);

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
    });
  }, [selectedBlock]);

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

        router.push(`/parent/day-templates/${created.data.id}`);
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

      router.push("/parent/day-templates");
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
      const resolvedItemKind = taskDraft.itemKind ?? resolveTaskKind(categories, taskDraft.categoryId);

      const payload: TemplateTaskInput = {
        categoryId: taskDraft.categoryId,
        itemKind: resolvedItemKind,
        itemSubkind: taskDraft.itemSubkind?.trim() ? taskDraft.itemSubkind.trim() : null,
        assignedProfileId: taskDraft.assignedProfileId ?? null,
        title: taskDraft.title.trim(),
        description: taskDraft.description?.trim() ? taskDraft.description.trim() : null,
        startTime: taskDraft.startTime,
        endTime: taskDraft.endTime,
        pointsBase: Math.max(0, Math.trunc(taskDraft.pointsBase)),
        knowledgeCardId: taskDraft.knowledgeCardId ?? null,
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

  function previewColor(task: TemplateTaskSummary): string {
    const color = getCategoryColorOption(task.category.colorKey);
    return color.eventClass;
  }

  const taskDraftKind = taskDraft.itemKind ?? resolveTaskKind(categories, taskDraft.categoryId);
  const taskSubkindSuggestions = PLAN_SUBKIND_SUGGESTIONS[taskDraftKind];
  const taskSubkindListId = `task-subkind-${taskDraftKind}`;

  return (
    <div className="space-y-4">
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

      {feedback ? <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Taches / activites</CardTitle>
            <CardDescription>Taches cochables autour des plages scolaires.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderedTasks.length === 0 ? (
              <p className="text-sm text-text-secondary">Aucune tache pour l&apos;instant.</p>
            ) : (
              orderedTasks.map((task, index) => {
                const color = getCategoryColorOption(task.category.colorKey);
                const currentTaskKind = task.itemKind ?? resolveTaskKind(categories, task.categoryId);
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
                        <Badge className={color.badgeClass}>
                          {task.category.icon} {task.category.name}
                        </Badge>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <Badge className={taskKindBadgeClass(currentTaskKind)}>
                            {getPlanActionableKindLabel(currentTaskKind)}
                          </Badge>
                          {currentTaskSubkind ? (
                            <Badge className="bg-bg-surface-hover text-text-secondary">{currentTaskSubkind}</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 font-semibold text-text-primary">{task.title}</p>
                        <p className="text-xs text-text-secondary">
                          {task.startTime} - {task.endTime} | +{task.pointsBase} pts
                        </p>
                        <p className="text-xs text-text-muted">Assigne a : {getParentAssignmentLabel(task)}</p>
                        <p className="text-xs font-semibold text-text-secondary">{taskSchoolContext(task, orderedBlocks)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={index === 0 || isPending}
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
                          disabled={index === orderedTasks.length - 1 || isPending}
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
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedTask ? "Modifier la tache" : "Ajouter une tache"}</CardTitle>
          </CardHeader>
          <CardContent>
            {!template ? (
              <p className="text-sm text-text-secondary">Sauvegardez d&apos;abord la journee type.</p>
            ) : categories.length === 0 ? (
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

                <div className="grid gap-4 md:grid-cols-2">
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
                          const previousDefaultKind = resolveTaskKind(categories, current.categoryId);
                          const nextDefaultKind = resolveTaskKind(categories, nextCategoryId);
                          const shouldFollowCategoryDefault =
                            !current.itemKind || current.itemKind === previousDefaultKind;
                          const resolvedItemKind: PlanActionableKind = shouldFollowCategoryDefault
                            ? nextDefaultKind
                            : current.itemKind ?? previousDefaultKind;
                          const resolvedItemSubkind: string | null = shouldFollowCategoryDefault
                            ? null
                            : current.itemSubkind ?? null;

                          return {
                            ...current,
                            categoryId: nextCategoryId,
                            itemKind: resolvedItemKind,
                            itemSubkind: resolvedItemSubkind,
                          };
                        })
                      }
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="task-assignee" className="text-sm font-semibold text-text-secondary">
                      Assigne a
                    </label>
                    <Select
                      id="task-assignee"
                      value={taskDraft.assignedProfileId ?? ""}
                      onChange={(event) =>
                        setTaskDraft((current) => ({
                          ...current,
                          assignedProfileId: event.target.value || null,
                        }))
                      }
                    >
                      <option value="">Famille</option>
                      {familyMembers
                        .filter((member) => member.role === "child" || member.role === "parent")
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {toAssignedLabel(member)}
                          </option>
                        ))}
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-text-secondary">Type de tache</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {PLAN_ACTIONABLE_KIND_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setTaskDraft((current) => ({
                            ...current,
                            itemKind: option.value,
                            itemSubkind: current.itemKind === option.value ? (current.itemSubkind ?? null) : null,
                          }))
                        }
                        className={`rounded-radius-button border px-3 py-2 text-left text-sm transition-all ${
                          option.badgeClass
                        } ${taskDraftKind === option.value ? "ring-2 ring-brand-primary" : "opacity-90 hover:opacity-100"}`}
                      >
                        <span className="block font-semibold">{option.label}</span>
                        <span className="block text-xs text-text-secondary">{option.description}</span>
                      </button>
                    ))}
                  </div>
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
                    maxLength={60}
                    placeholder="ex: devoirs, sport, jeu video..."
                  />
                  <datalist id={taskSubkindListId}>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Previsualisation de la journee</CardTitle>
          <CardDescription>Plages structurelles puis taches.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {orderedBlocks.length === 0 && orderedTasks.length === 0 ? (
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
                </div>
              ))}

              {orderedTasks.map((task) => (
                (() => {
                  const previewTaskKind = task.itemKind ?? resolveTaskKind(categories, task.categoryId);
                  const previewTaskSubkind = task.itemSubkind?.trim() ? task.itemSubkind.trim() : null;

                  return (
                    <div
                      key={`preview-task-${task.id}`}
                      className={`rounded-radius-button border px-3 py-2 ${previewColor(task)}`}
                    >
                      <p className="text-xs text-text-secondary">
                        {task.startTime} - {task.endTime}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge className={taskKindBadgeClass(previewTaskKind)}>
                          {getPlanActionableKindLabel(previewTaskKind)}
                        </Badge>
                        {previewTaskSubkind ? (
                          <Badge className="bg-bg-surface-hover text-text-secondary">{previewTaskSubkind}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 font-semibold text-text-primary">{task.title}</p>
                    </div>
                  );
                })()
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
