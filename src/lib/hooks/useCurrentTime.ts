"use client";

import { useEffect, useMemo, useState } from "react";

export interface CurrentTime {
  date: Date;
  hours24: number;
  minutes: number;
  seconds: number;
}

export function useCurrentTime(initialDate?: Date, tickMs = 1000): CurrentTime {
  const [date, setDate] = useState<Date>(() => initialDate ?? new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDate(new Date());
    }, tickMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [tickMs]);

  return useMemo(
    () => ({
      date,
      hours24: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    }),
    [date],
  );
}
