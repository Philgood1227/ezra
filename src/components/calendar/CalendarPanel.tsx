import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { DateDisplay } from "@/components/calendar/DateDisplay";
import { MonthStrip } from "@/components/calendar/MonthStrip";
import { SeasonBadge } from "@/components/calendar/SeasonBadge";

export interface CalendarPanelProps {
  date: Date;
}

export function CalendarPanel({ date }: CalendarPanelProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repères du calendrier</CardTitle>
        <DateDisplay date={date} />
      </CardHeader>
      <CardContent className="space-y-4">
        <SeasonBadge date={date} />
        <MonthStrip currentMonthIndex={date.getMonth()} />
      </CardContent>
    </Card>
  );
}
