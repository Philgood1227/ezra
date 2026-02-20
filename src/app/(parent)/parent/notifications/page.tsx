import { Card, CardContent, PageLayout } from "@/components/ds";
import { NotificationsManager } from "@/features/school-diary/components";
import {
  getInAppNotificationsForCurrentChild,
  getNotificationRulesForCurrentFamily,
} from "@/lib/api/notifications";

export default async function ParentNotificationsPage(): Promise<React.JSX.Element> {
  const [{ child, rules }, notifications] = await Promise.all([
    getNotificationRulesForCurrentFamily(),
    getInAppNotificationsForCurrentChild({ limit: 8, includeRead: true }),
  ]);

  return (
    <PageLayout hideHeader title="Notifications" subtitle="Configurez les rappels in-app et push pour les moments importants.">
      {child ? (
        <NotificationsManager childName={child.displayName} rules={rules} notifications={notifications} />
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-ink-muted">Aucun profil enfant trouve pour configurer les rappels.</p>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}

