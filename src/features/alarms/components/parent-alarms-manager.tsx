"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ds";
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

interface ParentAlarmsManagerProps {
  childName: string;
  rules: AlarmRuleSummary[];
  events: AlarmEventWithRule[];
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
}: ParentAlarmsManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);
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
    setFeedback(null);
    const payload = toAlarmInput(draft);

    startTransition(async () => {
      const result = editingRuleId
        ? await updateAlarmRuleAction(editingRuleId, payload)
        : await createAlarmRuleAction(payload);

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer l'alarme." });
        return;
      }

      setFeedback({ tone: "success", message: editingRuleId ? "Alarme modifiee." : "Alarme creee." });
      resetDraft();
      router.refresh();
    });
  }

  function handleEdit(rule: AlarmRuleSummary): void {
    setFeedback(null);
    setEditingRuleId(rule.id);
    setDraft(toDraft(rule));
  }

  function handleToggle(ruleId: string, enabled: boolean): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await toggleAlarmRuleEnabledAction({ ruleId, enabled });
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de modifier l'alarme." });
        return;
      }

      setFeedback({ tone: "success", message: enabled ? "Alarme activee." : "Alarme desactivee." });
      router.refresh();
    });
  }

  function handleDelete(ruleId: string): void {
    if (!window.confirm("Supprimer cette alarme ?")) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await deleteAlarmRuleAction({ ruleId });
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer l'alarme." });
        return;
      }

      if (editingRuleId === ruleId) {
        resetDraft();
      }
      setFeedback({ tone: "success", message: "Alarme supprimee." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-brand-200 bg-brand-50">
        <CardHeader>
          <CardTitle>Vue rapide alarmes - {childName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Alarmes actives: <span className="font-semibold text-ink-strong">{activeRulesCount}</span>
          </p>
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Total regles: <span className="font-semibold text-ink-strong">{rules.length}</span>
          </p>
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            A acquitter: <span className="font-semibold text-ink-strong">{triggeredEventsCount}</span>
          </p>
        </CardContent>
      </Card>

      {feedback ? <ParentFeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {editingRuleId ? "Modifier une alarme" : "Nouvelle alarme"} pour {childName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 rounded-xl bg-surface-elevated px-3 py-2 text-sm text-ink-muted">
            Pattern parent: regler la recurrence, le son et le message, puis sauvegarder.
          </p>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="alarm-label" className="text-sm font-semibold text-ink-muted">
                  Nom
                </label>
                <Input
                  id="alarm-label"
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Reveil ecole"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="alarm-mode" className="text-sm font-semibold text-ink-muted">
                  Recurrence
                </label>
                <select
                  id="alarm-mode"
                  value={draft.mode}
                  onChange={(event) => handleModeChange(event.target.value as AlarmMode)}
                  className="h-11 w-full rounded-xl border border-accent-200 bg-white px-3 text-sm text-ink-strong"
                >
                  <option value="ponctuelle">Ponctuelle</option>
                  <option value="semaine_travail">Semaine de travail (sans week-end)</option>
                  <option value="semaine_complete">Semaine complete (avec week-end)</option>
                  <option value="personnalise">Personnalise</option>
                </select>
              </div>
            </div>

            {draft.mode === "ponctuelle" ? (
              <div className="space-y-1">
                <label htmlFor="alarm-one-shot" className="text-sm font-semibold text-ink-muted">
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
                  <label htmlFor="alarm-time" className="text-sm font-semibold text-ink-muted">
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
                    <p className="text-sm font-semibold text-ink-muted">Jours actifs</p>
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
                                ? "bg-brand-600 text-ink-inverse"
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
                <label htmlFor="alarm-sound" className="text-sm font-semibold text-ink-muted">
                  Son
                </label>
                <select
                  id="alarm-sound"
                  value={draft.soundKey}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, soundKey: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-accent-200 bg-white px-3 text-sm text-ink-strong"
                >
                  {ALARM_SOUND_OPTIONS.map((sound) => (
                    <option key={sound.key} value={sound.key}>
                      {sound.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-muted md:pt-8">
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
              <label htmlFor="alarm-message" className="text-sm font-semibold text-ink-muted">
                Message affiche en grand
              </label>
              <textarea
                id="alarm-message"
                value={draft.message}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, message: event.target.value }))
                }
                placeholder="C'est l'heure de te preparer."
                className="min-h-24 w-full rounded-xl border border-accent-200 bg-white px-3 py-2 text-sm text-ink-strong shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                required
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={isPending}>
                {editingRuleId ? "Enregistrer les modifications" : "Creer l'alarme"}
              </Button>
              {editingRuleId ? (
                <Button
                  type="button"
                  variant="ghost"
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

      <Card>
        <CardHeader>
          <CardTitle>Alarmes configurees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedRules.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune alarme configuree pour le moment.</p>
          ) : (
            sortedRules.map((rule) => (
              <div key={rule.id} className="rounded-xl border border-accent-100 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-ink-strong">{rule.label}</p>
                    <p className="text-xs text-ink-muted">{formatRuleSchedule(rule)}</p>
                    <p className="text-xs text-ink-muted">Son : {getSoundLabel(rule.soundKey)}</p>
                    <p className="text-sm text-ink-muted">{rule.message}</p>
                  </div>
                  <Badge variant={rule.enabled ? "success" : "neutral"}>
                    {rule.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(rule)}
                    disabled={isPending}
                  >
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant={rule.enabled ? "ghost" : "primary"}
                    onClick={() => handleToggle(rule.id, !rule.enabled)}
                    disabled={isPending}
                  >
                    {rule.enabled ? "Desactiver" : "Activer"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(rule.id)}
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

      <Card>
        <CardHeader>
          <CardTitle>Historique recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucun declenchement enregistre.</p>
          ) : (
            events.map((eventItem) => (
              <div key={eventItem.id} className="rounded-xl border border-accent-100 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-strong">{eventItem.ruleLabel}</p>
                  <Badge variant={eventItem.status === "acknowledged" ? "success" : "warning"}>
                    {eventItem.status === "acknowledged" ? "Acquittee" : "Declenchee"}
                  </Badge>
                </div>
                <p className="text-xs text-ink-muted">
                  Prevue:{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(eventItem.dueAt))}
                </p>
                <p className="text-sm text-ink-muted">{eventItem.ruleMessage}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
