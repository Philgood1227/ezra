"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ds";
import { formatDateShort } from "./dashboard-date";

interface DiaryEntryPreview {
  id: string;
  type: string;
  date: string;
  title: string;
}

interface SchoolDiaryWidgetProps {
  totalCount: number;
  entries: DiaryEntryPreview[];
}

export function SchoolDiaryWidget({ totalCount, entries }: SchoolDiaryWidgetProps): React.JSX.Element {
  const router = useRouter();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Carnet scolaire</CardTitle>
        <CardDescription>{totalCount} entree(s) sur la semaine</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2 text-sm text-text-secondary">
            Aucune entree a venir.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/70 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{entry.type}</p>
                <p className="text-sm font-semibold text-text-primary">{entry.title}</p>
                <p className="text-xs text-text-secondary">{formatDateShort(entry.date)}</p>
              </li>
            ))}
          </ul>
        )}
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => router.push("/parent/school-diary")}>
          Voir le carnet
        </Button>
      </CardContent>
    </Card>
  );
}
