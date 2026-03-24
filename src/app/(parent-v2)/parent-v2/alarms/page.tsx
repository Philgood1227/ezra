import { Card, CardContent } from "@/components/ds";
import { ParentAlarmsManager } from "@/features/alarms/components";
import { getParentAlarmPageData } from "@/lib/api/alarms";

export default async function ParentV2AlarmsPage(): Promise<React.JSX.Element> {
  const data = await getParentAlarmPageData();

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      {data.child ? (
        <ParentAlarmsManager childName={data.child.displayName} rules={data.rules} events={data.events} />
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-ink-muted">Aucun profil enfant trouve pour configurer les alarmes.</p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

