"use client";

import * as React from "react";
import { Badge, Card } from "@/components/ds";
import { EmotionPicker } from "@/components/child/emotions/emotion-picker";
import type { EmotionLogSummary, EmotionMoment, EmotionValue } from "@/lib/day-templates/types";
import { getEmotionEmoji, getEmotionLabel } from "@/lib/domain/emotion-logs";

interface EmotionCheckInCardProps {
  moment: EmotionMoment;
  log: EmotionLogSummary | null;
  isPending?: boolean;
  onSave: (emotion: EmotionValue, note: string | null) => void;
}

export function EmotionCheckInCard({
  moment,
  log,
  isPending = false,
  onSave,
}: EmotionCheckInCardProps): React.JSX.Element {
  const [isEditing, setIsEditing] = React.useState(!log);
  const title = moment === "matin" ? "Matin" : "Soir";
  const isCompleted = Boolean(log);

  React.useEffect(() => {
    setIsEditing(!log);
  }, [log]);

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-black text-text-primary">{title}</h2>
        <Badge variant={isCompleted ? "success" : "warning"}>
          {isCompleted ? "Enregistre" : "A faire"}
        </Badge>
      </div>

      {isCompleted && !isEditing && log ? (
        <div className="space-y-2">
          <p className="text-3xl">{getEmotionEmoji(log.emotion)}</p>
          <p className="text-sm font-semibold text-text-primary">{getEmotionLabel(log.emotion)}</p>
          {log.note ? <p className="text-sm text-text-secondary">{log.note}</p> : null}
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Modifier
          </button>
        </div>
      ) : (
        <EmotionPicker
          moment={moment}
          selectedEmotion={log?.emotion ?? null}
          initialNote={log?.note ?? null}
          isCompleted={isCompleted}
          isPending={isPending}
          onSelect={(emotion, note) => {
            onSave(emotion, note);
            setIsEditing(false);
          }}
        />
      )}
    </Card>
  );
}
