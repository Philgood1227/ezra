"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { useCurrentTime } from "@/lib/hooks/useCurrentTime";
import { AnalogClock } from "@/components/time/AnalogClock";
import { DigitalClock } from "@/components/time/DigitalClock";

export interface ClockPanelProps {
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
}

export function ClockPanel({ initialDate, onDateChange }: ClockPanelProps): React.JSX.Element {
  const { date } = useCurrentTime(initialDate);

  useEffect(() => {
    onDateChange?.(date);
  }, [date, onDateChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regarde l&apos;heure</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 md:items-stretch">
        <DigitalClock date={date} showSeconds />
        <AnalogClock date={date} />
      </CardContent>
    </Card>
  );
}
