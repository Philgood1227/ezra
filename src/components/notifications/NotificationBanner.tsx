"use client";

import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ds";
import type { InAppNotificationSummary } from "@/lib/day-templates/types";

interface NotificationBannerProps {
  notification: InAppNotificationSummary;
  onMarkRead: (notificationId: string) => void;
  isPending?: boolean;
}

export function NotificationBanner({
  notification,
  onMarkRead,
  isPending = false,
}: NotificationBannerProps): React.JSX.Element {
  return (
    <Card className="border-accent-200 bg-white">
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-bold text-ink-strong">{notification.title}</p>
            <p className="text-sm text-ink-muted">{notification.message}</p>
          </div>
          {!notification.isRead ? (
            <Button
              size="sm"
              variant="ghost"
              loading={isPending}
              onClick={() => onMarkRead(notification.id)}
            >
              Marquer comme lu
            </Button>
          ) : null}
        </div>

        {notification.linkUrl ? (
          <Link href={notification.linkUrl} className="text-sm font-semibold text-accent-700 hover:underline">
            Ouvrir
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
