"use client";

import { useMemo, useState, useTransition } from "react";
import { markInAppNotificationReadAction } from "@/lib/actions/notifications";
import type { InAppNotificationSummary } from "@/lib/day-templates/types";
import { NotificationBanner } from "@/components/notifications/NotificationBanner";

interface NotificationCenterProps {
  notifications: InAppNotificationSummary[];
}

export function NotificationCenter({ notifications }: NotificationCenterProps): React.JSX.Element {
  const [items, setItems] = useState<InAppNotificationSummary[]>(notifications);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  function handleMarkRead(notificationId: string): void {
    setFeedback(null);
    setPendingId(notificationId);

    startTransition(async () => {
      const result = await markInAppNotificationReadAction({ notificationId });
      if (!result.success) {
        setFeedback(result.error ?? "Impossible de marquer la notification.");
        setPendingId(null);
        return;
      }

      setItems((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)),
      );
      setPendingId(null);
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl bg-accent-50 px-3 py-2 text-sm text-ink-muted">
        Aucun rappel pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ink-muted">Rappels non lus : {unreadCount}</p>

      {feedback ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{feedback}</p> : null}

      {items.map((notification) => (
        <NotificationBanner
          key={notification.id}
          notification={notification}
          onMarkRead={handleMarkRead}
          isPending={isPending && pendingId === notification.id}
        />
      ))}
    </div>
  );
}
