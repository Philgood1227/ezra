"use client";

import { useState, useTransition } from "react";
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
} from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  addChecklistTemplateItemAction,
  createChecklistTemplateAction,
  deleteChecklistTemplateAction,
  deleteChecklistTemplateItemAction,
  moveChecklistTemplateItemAction,
  updateChecklistTemplateAction,
  updateChecklistTemplateItemAction,
} from "@/lib/actions/checklists";
import { useFormField } from "@/lib/hooks/useFormField";
import type {
  ChecklistTemplateInput,
  ChecklistTemplateSummary,
  ChecklistTemplateType,
} from "@/lib/day-templates/types";

interface ChecklistTemplatesManagerProps {
  templates: ChecklistTemplateSummary[];
}

const TEMPLATE_TYPES: Array<{ value: ChecklistTemplateType; label: string }> = [
  { value: "piscine", label: "Piscine" },
  { value: "sortie", label: "Sortie" },
  { value: "evaluation", label: "Evaluation" },
  { value: "quotidien", label: "Quotidien" },
  { value: "autre", label: "Autre" },
];

const EMPTY_DRAFT: ChecklistTemplateInput = {
  type: "piscine",
  label: "",
  description: null,
  isDefault: false,
};

function typeLabel(value: string): string {
  return TEMPLATE_TYPES.find((option) => option.value === value)?.label ?? value;
}

export function ChecklistTemplatesManager({ templates }: ChecklistTemplatesManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [draft, setDraft] = useState<ChecklistTemplateInput>(EMPTY_DRAFT);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateDraft, setEditingTemplateDraft] = useState<ChecklistTemplateInput>(EMPTY_DRAFT);
  const [itemDraftByTemplateId, setItemDraftByTemplateId] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemLabel, setEditingItemLabel] = useState("");

  const nameField = useFormField({
    initialValue: "",
    validate: (value) => (value.trim().length >= 2 ? null : "Nom du modele requis"),
  });

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
      const result = await createChecklistTemplateAction({
        ...draft,
        label: draft.label.trim(),
        description: draft.description?.trim() ? draft.description.trim() : null,
      });
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de creer le modele." });
        return;
      }

      setDraft(EMPTY_DRAFT);
      nameField.reset("");
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
      const result = await updateChecklistTemplateAction(templateId, {
        ...editingTemplateDraft,
        label: editingTemplateDraft.label.trim(),
        description: editingTemplateDraft.description?.trim() ? editingTemplateDraft.description.trim() : null,
      });
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter un modele de checklist</CardTitle>
          <CardDescription>Nom, type, et statut par defaut.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={createTemplate}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="checklist-template-type" className="text-sm font-semibold text-text-secondary">
                  Type
                </label>
                <Select
                  id="checklist-template-type"
                  value={draft.type}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, type: event.target.value as ChecklistTemplateType }))
                  }
                >
                  {TEMPLATE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="checklist-template-label" className="text-sm font-semibold text-text-secondary">
                  Nom du modele
                </label>
                <Input
                  id="checklist-template-label"
                  value={draft.label}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((current) => ({ ...current, label: value }));
                    nameField.setValue(value);
                  }}
                  onBlur={nameField.markTouched}
                  errorMessage={nameField.hasError ? nameField.error ?? undefined : undefined}
                  successMessage={nameField.isValid ? "Champ valide" : undefined}
                  placeholder="Sac de piscine"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="checklist-template-description" className="text-sm font-semibold text-text-secondary">
                Description (optionnel)
              </label>
              <Input
                id="checklist-template-description"
                value={draft.description ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Affaires a preparer"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))}
                className="size-4 rounded border-border-default"
              />
              Definir comme modele par defaut
            </label>

            <Button type="submit" loading={isPending}>
              Ajouter le modele
            </Button>
          </form>
        </CardContent>
      </Card>

      {feedback ? <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {templates.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Aucun modele configure.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {templates.map((template) => {
          const isEditingTemplate = editingTemplateId === template.id;
          return (
            <Card key={template.id}>
              <CardHeader className="space-y-3">
                {isEditingTemplate ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select
                      value={editingTemplateDraft.type}
                      onChange={(event) =>
                        setEditingTemplateDraft((current) => ({
                          ...current,
                          type: event.target.value as ChecklistTemplateType,
                        }))
                      }
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
                    <div className="md:col-span-2">
                      <Input
                        value={editingTemplateDraft.description ?? ""}
                        onChange={(event) =>
                          setEditingTemplateDraft((current) => ({ ...current, description: event.target.value }))
                        }
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-text-secondary md:col-span-2">
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
                    <div className="flex gap-2 md:col-span-2">
                      <Button size="sm" loading={isPending} onClick={() => saveTemplate(template.id)}>
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTemplateId(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">{template.label}</CardTitle>
                        <Badge variant="neutral">{typeLabel(template.type)}</Badge>
                        {template.isDefault ? <Badge variant="success">Par defaut</Badge> : null}
                      </div>
                      {template.description ? <p className="text-sm text-text-secondary">{template.description}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingTemplateId(template.id);
                          setEditingTemplateDraft({
                            type: template.type,
                            label: template.label,
                            description: template.description,
                            isDefault: template.isDefault,
                          });
                        }}
                      >
                        Modifier
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isPending} onClick={() => deleteTemplate(template.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm font-semibold text-text-secondary">Items du modele</p>
                {template.items.length === 0 ? (
                  <p className="text-sm text-text-secondary">Aucun item.</p>
                ) : (
                  <div className="space-y-2">
                    {template.items.map((item, index) => {
                      const isEditingItem = editingItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 px-3 py-2"
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
                              <div className="flex items-center gap-2">
                                <span className="text-text-muted">⋮⋮</span>
                                <p className="text-sm font-medium text-text-primary">{item.label}</p>
                              </div>
                              <div className="flex flex-wrap gap-1">
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
                    Ajouter item
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

