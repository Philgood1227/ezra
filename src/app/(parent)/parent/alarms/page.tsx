import { Card, CardContent, PageLayout } from "@/components/ds";
import { ParentAlarmsManager } from "@/features/alarms/components";
import { getParentAlarmPageData } from "@/lib/api/alarms";

export default async function ParentAlarmsPage(): Promise<React.JSX.Element> {
  const data = await getParentAlarmPageData();

  return (
    <PageLayout hideHeader
      title="Alarmes"
      subtitle="Configuration parent des alarmes ponctuelles et recurrentes."
    >
      {data.child ? (
        <ParentAlarmsManager childName={data.child.displayName} rules={data.rules} events={data.events} />
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-ink-muted">Aucun profil enfant trouve pour configurer les alarmes.</p>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}

