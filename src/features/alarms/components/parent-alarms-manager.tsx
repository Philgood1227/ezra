"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
  Select,
  TextArea,
} from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  createAlarmRuleAction,
  deleteAlarmRuleAction,
  toggleAlarmRuleEnabledAction,
  updateAlarmRuleAction,
} from "@/lib/actions/alarms";
import type {
  AlarmEventWithRule,
  AlarmMode,
  AlarmRuleInput,
  AlarmRuleSummary,
} from "@/lib/day-templates/types";
import {
  ALARM_DAY_OPTIONS,
  ALARM_SOUND_OPTIONS,
  describeAlarmMode,
  formatDaysMask,
  getDefaultAlarmInput,
  getModeDaysMask,
} from "@/lib/domain/alarms";
import { useParentFeedback } from "@/lib/hooks/useParentFeedback";

interface ParentAlarmsManagerProps {
  childName: string;
  rules: AlarmRuleSummary[];
  events: AlarmEventWithRule[];
  ruleKind?: "alarm" | "time_timer";
}

interface AlarmDraft {
  label: string;
  mode: AlarmMode;
  oneShotLocal: string;
  timeOfDay: string;
  daysMask: number;
  soundKey: string;
  message: string;
  enabled: boolean;
}

function toLocalDateTimeInputValue(isoValue: string | null): string {
  if (!isoValue) {
    return "";
  }

  const asDate = new Date(isoValue);
  if (Number.isNaN(asDate.getTime())) {
    return "";
  }

  const shifted = new Date(asDate.getTime() - asDate.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function getInitialDraft(): AlarmDraft {
  const defaults = getDefaultAlarmInput();
  return {
    label: defaults.label,
    mode: defaults.mode,
    oneShotLocal: "",
    timeOfDay: defaults.timeOfDay ?? "07:30",
    daysMask: defaults.daysMask,
    soundKey: defaults.soundKey,
    message: defaults.message,
    enabled: defaults.enabled,
  };
}

function toAlarmInput(draft: AlarmDraft): AlarmRuleInput {
  const oneShotAt = (() => {
    if (!draft.oneShotLocal) {
      return null;
    }

    const parsed = new Date(draft.oneShotLocal);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
  })();

  return {
    label: draft.label.trim(),
    mode: draft.mode,
    oneShotAt,
    timeOfDay: draft.mode === "ponctuelle" ? null : draft.timeOfDay,
    daysMask: getModeDaysMask(draft.mode, draft.daysMask),
    soundKey: draft.soundKey,
    message: draft.message.trim(),
    enabled: draft.enabled,
  };
}

function toDraft(rule: AlarmRuleSummary): AlarmDraft {
  return {
    label: rule.label,
    mode: rule.mode,
    oneShotLocal: toLocalDateTimeInputValue(rule.oneShotAt),
    timeOfDay: rule.timeOfDay?.slice(0, 5) ?? "07:30",
    daysMask: rule.daysMask,
    soundKey: rule.soundKey,
    message: rule.message,
    enabled: rule.enabled,
  };
}

function formatRuleSchedule(rule: AlarmRuleSummary): string {
  if (rule.mode === "ponctuelle") {
    if (!rule.oneShotAt) {
      return "Ponctuelle";
    }

    const date = new Date(rule.oneShotAt);
    return Number.isNaN(date.getTime())
      ? "Ponctuelle"
      : `Ponctuelle - ${new Intl.DateTimeFormat("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(date)}`;
  }

  const timeLabel = rule.timeOfDay?.slice(0, 5) ?? "--:--";
  if (rule.mode === "personnalise") {
    return `${describeAlarmMode(rule.mode)} - ${timeLabel} (${formatDaysMask(rule.daysMask)})`;
  }

  return `${describeAlarmMode(rule.mode)} - ${timeLabel}`;
}

function getSoundLabel(soundKey: string): string {
  return ALARM_SOUND_OPTIONS.find((sound) => sound.key === soundKey)?.label ?? soundKey;
}

export function ParentAlarmsManager({
  childName,
  rules,
  events,
  ruleKind = "alarm",
}: ParentAlarmsManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const { feedback, showFeedback, clearFeedback } = useParentFeedback();
  const [ruleToDelete, setRuleToDelete] = useState<AlarmRuleSummary | null>(null);
  const [draft, setDraft] = useState<AlarmDraft>(() => getInitialDraft());

  const sortedRules = useMemo(
    () =>
      rules
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [rules],
  );
  const activeRulesCount = useMemo(
    () => rules.filter((rule) => rule.enabled).length,
    [rules],
  );
  const triggeredEventsCount = useMemo(
    () => events.filter((eventItem) => eventItem.status === "declenchee").length,
    [events],
  );

  function resetDraft(): void {
    setEditingRuleId(null);
    setDraft(getInitialDraft());
  }

  function handleModeChange(mode: AlarmMode): void {
    setDraft((current) => ({
      ...current,
      mode,
      daysMask: getModeDaysMask(mode, current.daysMask),
      oneShotLocal: mode === "ponctuelle" ? current.oneShotLocal : "",
      timeOfDay: mode === "ponctuelle" ? current.timeOfDay : current.timeOfDay || "07:30",
    }));
  }

  function handleDayToggle(bit: number): void {
    setDraft((current) => {
      const hasBit = (current.daysMask & bit) !== 0;
      return {
        ...current,
        daysMask: hasBit ? current.daysMask & ~bit : current.daysMask | bit,
      };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    clearFeedback();
    const payload = toAlarmInput(draft);

    startTransition(async () => {
      const requestPayload = { ...payload, ruleKind };
      const result = editingRuleId
        ? await updateAlarmRuleAction(editingRuleId, requestPayload)
        : await createAlarmRuleAction(requestPayload);

      if (!result.success) {
        showFeedback({
          tone: "error",
          message:
            result.error ??
            (ruleKind === "time_timer"
              ? "Impossible d'enregistrer le Time Timer."
              : "Impossible d'enregistrer l'alarme."),
        });
        return;
      }

      showFeedback({
        tone: "success",
        message:
          editingRuleId
            ? ruleKind === "time_timer"
              ? "Time Timer modifie."
              : "Alarme modifiee."
            : ruleKind === "time_timer"
              ? "Time Timer cree."
              : "Alarme creee.",
      });
      resetDraft();
      router.refresh();
    });
  }

  function handleEdit(rule: AlarmRuleSummary): void {
    clearFeedback();
    setEditingRuleId(rule.id);
    setDraft(toDraft(rule));
  }

  function handleToggle(ruleId: string, enabled: boolean): void {
    clearFeedback();
    startTransition(async () => {
      const result = await toggleAlarmRuleEnabledAction({ ruleId, enabled });
      if (!result.success) {
        showFeedback({ tone: "error", message: result.error ?? "Impossible de modifier l'alarme." });
        return;
      }

      showFeedback({ tone: "success", message: enabled ? "Alarme activee." : "Alarme desactivee." });
      router.refresh();
    });
  }

  function handleRequestDelete(rule: AlarmRuleSummary): void {
    if (isPending) {
      return;
    }
    setRuleToDelete(rule);
  }

  function handleCancelDelete(): void {
    if (isPending) {
      return;
    }
    setRuleToDelete(null);
  }

  function handleConfirmDelete(): void {
    if (!ruleToDelete) {
      return;
    }

    clearFeedback();
    startTransition(async () => {
      const result = await deleteAlarmRuleAction({ ruleId: ruleToDelete.id });
      if (!result.success) {
        showFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer l'alarme." });
        return;
      }

      if (editingRuleId === ruleToDelete.id) {
        resetDraft();
      }
      showFeedback({ tone: "success", message: "Alarme supprimee." });
      setRuleToDelete(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card surface="child">
        <CardHeader>
          <CardTitle>
            {ruleKind === "time_timer" ? "Vue rapide Time Timers" : "Vue rapide alarmes"} - {childName}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <p className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2 text-sm text-text-secondary">
            {ruleKind === "time_timer" ? "Time Timers actifs" : "Alarmes actives"}:{" "}
            <span className="font-semibold text-text-primary">{activeRulesCount}</span>
          </p>
          <p className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2 text-sm text-text-secondary">
            Total regles: <span className="font-semibold text-text-primary">{rules.length}</span>
          </p>
          <p className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2 text-sm text-text-secondary">
            A acquitter: <span className="font-semibold text-text-primary">{triggeredEventsCount}</span>
          </p>
        </CardContent>
      </Card>

      {feedback ? <ParentFeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}

      <Card surface="glass">
        <CardHeader>
          <CardTitle>
            {editingRuleId
              ? ruleKind === "time_timer"
                ? "Modifier un Time Timer"
                : "Modifier une alarme"
              : ruleKind === "time_timer"
                ? "Nouveau Time Timer"
                : "Nouvelle alarme"}{" "}
            pour {childName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 rounded-radius-button bg-bg-surface-hover/60 px-3 py-2 text-sm text-text-secondary">
            Pattern parent: regler la recurrence, le son et le message, puis sauvegarder.
          </p>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="alarm-label" className="text-sm font-semibold text-text-secondary">
                  Nom
                </label>
                <Input
                  id="alarm-label"
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder={ruleKind === "time_timer" ? "Preparation matin" : "Reveil ecole"}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="alarm-mode" className="text-sm font-semibold text-text-secondary">
                  Recurrence
                </label>
                <Select
                  id="alarm-mode"
                  value={draft.mode}
                  onChange={(event) => handleModeChange(event.target.value as AlarmMode)}
                >
                  <option value="ponctuelle">Ponctuelle</option>
                  <option value="semaine_travail">Semaine de travail (sans week-end)</option>
                  <option value="semaine_complete">Semaine complete (avec week-end)</option>
                  <option value="personnalise">Personnalise</option>
                </Select>
              </div>
            </div>

            {draft.mode === "ponctuelle" ? (
              <div className="space-y-1">
                <label htmlFor="alarm-one-shot" className="text-sm font-semibold text-text-secondary">
                  Date et heure
                </label>
                <Input
                  id="alarm-one-shot"
                  type="datetime-local"
                  value={draft.oneShotLocal}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, oneShotLocal: event.target.value }))
                  }
                  required
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="alarm-time" className="text-sm font-semibold text-text-secondary">
                    Heure
                  </label>
                  <Input
                    id="alarm-time"
                    type="time"
                    value={draft.timeOfDay}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, timeOfDay: event.target.value }))
                    }
                    required
                  />
                </div>

                {draft.mode === "personnalise" ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-text-secondary">Jours actifs</p>
                    <div className="flex flex-wrap gap-2">
                      {ALARM_DAY_OPTIONS.map((day) => {
                        const isActive = (draft.daysMask & day.bit) !== 0;
                        return (
                          <button
                            key={day.bit}
                            type="button"
                            onClick={() => handleDayToggle(day.bit)}
                            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              isActive
                                ? "bg-brand-600 text-text-inverse"
                                : "bg-accent-100 text-accent-900 hover:bg-accent-200"
                            }`}
                          >
                            {day.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="alarm-sound" className="text-sm font-semibold text-text-secondary">
                  Son
                </label>
                <Select
                  id="alarm-sound"
                  value={draft.soundKey}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, soundKey: event.target.value }))
                  }
                >
                  {ALARM_SOUND_OPTIONS.map((sound) => (
                    <option key={sound.key} value={sound.key}>
                      {sound.label}
                    </option>
                  ))}
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary md:pt-8">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, enabled: event.target.checked }))
                  }
                  className="size-4 rounded border-accent-200"
                />
                Alarme active
              </label>
            </div>

            <div className="space-y-1">
              <label htmlFor="alarm-message" className="text-sm font-semibold text-text-secondary">
                  Message affiche en grand
              </label>
              <TextArea
                id="alarm-message"
                value={draft.message}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, message: event.target.value }))
                }
                placeholder="C'est l'heure de te preparer."
                rows={4}
                required
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="premium" loading={isPending}>
                {editingRuleId
                  ? "Enregistrer les modifications"
                  : ruleKind === "time_timer"
                    ? "Creer le Time Timer"
                    : "Creer l'alarme"}
              </Button>
              {editingRuleId ? (
                <Button
                  type="button"
                  variant="glass"
                  onClick={resetDraft}
                  disabled={isPending}
                >
                  Annuler
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card surface="glass">
        <CardHeader>
          <CardTitle>Alarmes configurees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedRules.length === 0 ? (
            <p className="text-sm text-text-secondary">Aucune alarme configuree pour le moment.</p>
          ) : (
            sortedRules.map((rule) => (
              <div key={rule.id} className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-text-primary">{rule.label}</p>
                    <p className="text-xs text-text-secondary">{formatRuleSchedule(rule)}</p>
                    <p className="text-xs text-text-secondary">Son : {getSoundLabel(rule.soundKey)}</p>
                    <p className="text-sm text-text-secondary">{rule.message}</p>
                  </div>
                  <Badge variant={rule.enabled ? "success" : "neutral"}>
                    {rule.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => handleEdit(rule)}
                    disabled={isPending}
                  >
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant={rule.enabled ? "glass" : "premium"}
                    onClick={() => handleToggle(rule.id, !rule.enabled)}
                    disabled={isPending}
                  >
                    {rule.enabled ? "Desactiver" : "Activer"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRequestDelete(rule)}
                    disabled={isPending}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card surface="glass">
        <CardHeader>
          <CardTitle>Historique recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-text-secondary">Aucun declenchement enregistre.</p>
          ) : (
            events.map((eventItem) => (
              <div key={eventItem.id} className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">{eventItem.ruleLabel}</p>
                  <Badge variant={eventItem.status === "acknowledged" ? "success" : "warning"}>
                    {eventItem.status === "acknowledged" ? "Acquittee" : "Declenchee"}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary">
                  Prevue:{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(eventItem.dueAt))}
                </p>
                <p className="text-sm text-text-secondary">{eventItem.ruleMessage}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={ruleToDelete !== null}
        title="Supprimer cette alarme ?"
        {...(ruleToDelete
          ? {
              description: `L'alarme "${ruleToDelete.label}" sera supprimee.`,
            }
          : {})}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={isPending}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
