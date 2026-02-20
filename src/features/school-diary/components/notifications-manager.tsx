"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { NotificationCenter } from "@/components/notifications";
import {
  savePushSubscriptionAction,
  sendTestRemindersNowAction,
  updateNotificationRuleAction,
} from "@/lib/actions/notifications";
import type {
  InAppNotificationSummary,
  NotificationChannel,
  NotificationRuleSummary,
} from "@/lib/day-templates/types";

interface NotificationsManagerProps {
  childName: string;
  rules: NotificationRuleSummary[];
  notifications: InAppNotificationSummary[];
}

const RULE_LABELS: Record<NotificationRuleSummary["type"], string> = {
  rappel_devoir: "Rappel devoir",
  rappel_checklist: "Rappel checklist",
  rappel_journee: "Rappel journee",
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "In-app",
  push: "Push",
  both: "Les deux",
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

export function NotificationsManager({
  childName,
  rules,
  notifications,
}: NotificationsManagerProps): React.JSX.Element {
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, NotificationRuleSummary>>(
    Object.fromEntries(rules.map((rule) => [rule.id, rule])),
  );
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [isRulePending, startRuleTransition] = useTransition();
  const [isGlobalPending, startGlobalTransition] = useTransition();

  const sortedRules = useMemo(
    () =>
      rules
        .map((rule) => ruleDrafts[rule.id] ?? rule)
        .sort((left, right) => left.type.localeCompare(right.type)),
    [ruleDrafts, rules],
  );

  function updateRuleDraft(
    ruleId: string,
    patch: Partial<Pick<NotificationRuleSummary, "channel" | "timeOfDay" | "enabled">>,
  ): void {
    setRuleDrafts((current) => {
      const source = current[ruleId];
      if (!source) {
        return current;
      }
      return {
        ...current,
        [ruleId]: {
          ...source,
          ...patch,
        },
      };
    });
  }

  function saveRule(ruleId: string): void {
    const draft = ruleDrafts[ruleId];
    if (!draft) {
      return;
    }

    setFeedback(null);
    setActiveRuleId(ruleId);
    startRuleTransition(async () => {
      try {
        const result = await updateNotificationRuleAction(ruleId, {
          type: draft.type,
          channel: draft.channel,
          timeOfDay: draft.timeOfDay,
          enabled: draft.enabled,
        });

        if (!result.success) {
          setFeedback({ type: "error", message: result.error ?? "Impossible d'enregistrer la regle." });
          return;
        }

        setFeedback({ type: "success", message: "Regle enregistree." });
      } finally {
        setActiveRuleId(null);
      }
    });
  }

  function triggerTestReminders(): void {
    setFeedback(null);
    startGlobalTransition(async () => {
      const result = await sendTestRemindersNowAction();
      if (!result.success) {
        setFeedback({ type: "error", message: result.error ?? "Impossible d'envoyer les rappels." });
        return;
      }

      setFeedback({
        type: "success",
        message: `Rappels crees: ${result.data?.created ?? 0}. Cibles push: ${result.data?.pushEligible ?? 0}.`,
      });
    });
  }

  function activatePushOnDevice(): void {
    setFeedback(null);
    startGlobalTransition(async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        setFeedback({ type: "error", message: "Service Worker non disponible sur cet appareil." });
        return;
      }

      if (!("PushManager" in window)) {
        setFeedback({ type: "error", message: "Push non supporte sur ce navigateur." });
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setFeedback({ type: "error", message: "Autorisation de notification refusee." });
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setFeedback({
          type: "error",
          message: "Cle VAPID publique absente. Ajoutez NEXT_PUBLIC_VAPID_PUBLIC_KEY.",
        });
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const ready = await navigator.serviceWorker.ready;
      const existing = await ready.pushManager.getSubscription();
      const subscription =
        existing ??
        (await ready.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
        }));

      const json = subscription.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;

      if (!p256dh || !auth) {
        setFeedback({ type: "error", message: "Abonnement push incomplet." });
        return;
      }

      const result = await savePushSubscriptionAction({
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        userAgent: navigator.userAgent,
      });

      if (!result.success) {
        setFeedback({ type: "error", message: result.error ?? "Impossible d'activer le push." });
        return;
      }

      // keep registration referenced to avoid lint about unused variable in some bundlers
      if (!registration.active && !registration.installing && !registration.waiting) {
        setFeedback({ type: "success", message: "Push active, mais service worker en attente." });
        return;
      }

      setFeedback({ type: "success", message: "Rappels push actives sur cet appareil." });
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Rappels pour {childName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedRules.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune regle pour le moment.</p>
          ) : (
            sortedRules.map((rule) => (
              <div key={rule.id} className="rounded-xl border border-accent-100 bg-white p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_160px_120px_auto] md:items-center">
                  <p className="text-sm font-semibold text-ink-strong">{RULE_LABELS[rule.type]}</p>

                  <select
                    value={rule.channel}
                    onChange={(event) =>
                      updateRuleDraft(rule.id, { channel: event.target.value as NotificationChannel })
                    }
                    className="h-10 rounded-xl border border-accent-200 bg-white px-2 text-sm text-ink-strong"
                  >
                    <option value="in_app">{CHANNEL_LABELS.in_app}</option>
                    <option value="push">{CHANNEL_LABELS.push}</option>
                    <option value="both">{CHANNEL_LABELS.both}</option>
                  </select>

                  <input
                    type="time"
                    value={rule.timeOfDay}
                    onChange={(event) => updateRuleDraft(rule.id, { timeOfDay: event.target.value })}
                    className="h-10 rounded-xl border border-accent-200 bg-white px-2 text-sm text-ink-strong"
                  />

                  <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) => updateRuleDraft(rule.id, { enabled: event.target.checked })}
                      className="size-4 rounded border-accent-200"
                    />
                    Actif
                  </label>
                </div>

                <div className="mt-2">
                  <Button
                    size="sm"
                    loading={isRulePending && activeRuleId === rule.id}
                    onClick={() => saveRule(rule.id)}
                  >
                    Enregistrer la regle
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canaux de notification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button loading={isGlobalPending} onClick={activatePushOnDevice}>
            Activer les rappels sur cet appareil
          </Button>
          <Button variant="secondary" loading={isGlobalPending} onClick={triggerTestReminders}>
            Tester les rappels maintenant
          </Button>
        </CardContent>
      </Card>

      {feedback ? (
        <p
          className={
            feedback.type === "error"
              ? "rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
              : "rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          }
        >
          {feedback.message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Notifications in-app</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationCenter notifications={notifications} />
        </CardContent>
      </Card>
    </div>
  );
}
