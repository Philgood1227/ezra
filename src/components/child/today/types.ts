import type * as React from "react";
import type { DaySegmentId } from "@/lib/time/day-segments";

export type TimeBlockId = DaySegmentId;

export type TimeBlockActivity = {
  id: string;
  label: string;
  type: "school" | "activity" | "homework" | "fun";
  durationMinutes?: number;
  note?: string;
};

export type TimeBlock = {
  id: TimeBlockId;
  label: string;
  icon: React.ReactNode;
  state: "past" | "current" | "upcoming";
  activities: TimeBlockActivity[];
};

export type DailyHighlight = {
  id: string;
  label: string;
  type: "activity" | "leisure";
};

export type RewardsSummary = {
  highlights: DailyHighlight[];
  emptyMessage: string;
};
