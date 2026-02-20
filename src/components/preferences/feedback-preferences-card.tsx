"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ds";
import { useFeedbackPreferences } from "@/lib/hooks/useFeedbackPreferences";
import type { FeedbackPreferencesScope } from "@/lib/preferences/feedback";
import { cn } from "@/lib/utils";

interface FeedbackPreferencesCardProps {
  scope?: FeedbackPreferencesScope;
  title?: string;
  description?: string;
  className?: string;
}

interface PreferenceToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: PreferenceToggleProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 px-3 py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "inline-flex h-touch-sm min-w-[86px] items-center justify-center rounded-radius-pill border px-3 text-xs font-black transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
          checked
            ? "border-brand-primary bg-brand-primary/14 text-brand-primary"
            : "border-border-default bg-bg-surface text-text-secondary",
        )}
      >
        {checked ? "Active" : "Inactive"}
      </button>
    </div>
  );
}

export function FeedbackPreferencesCard({
  scope = "global",
  title = "Feedback tactile et audio",
  description = "Personnalisez les vibrations et les sons pour l'appareil actuel.",
  className,
}: FeedbackPreferencesCardProps): React.JSX.Element {
  const { preferences, setHapticsEnabled, setSoundsEnabled } = useFeedbackPreferences(scope);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <PreferenceToggle
          label="Vibrations (feedback haptique)"
          description="Confirmation tactile sur les actions importantes."
          checked={preferences.hapticsEnabled}
          onChange={setHapticsEnabled}
        />
        <PreferenceToggle
          label="Sons"
          description="Sons courts pour les validations et les succès."
          checked={preferences.soundsEnabled}
          onChange={setSoundsEnabled}
        />
      </CardContent>
    </Card>
  );
}

