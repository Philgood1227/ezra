"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import { createMovieSessionAction } from "@/lib/actions/cinema";
import type { MovieSessionInput } from "@/lib/day-templates/types";
import type { MovieSessionBundle } from "@/lib/api/cinema";

interface ParentCinemaManagerProps {
  sessions: MovieSessionBundle[];
  members: Array<{ id: string; displayName: string; role: "parent" | "child" | "viewer" }>;
  suggestedRotation: { proposerProfileId: string | null; pickerProfileId: string | null };
}

function getDefaultDraft(
  suggestedRotation: { proposerProfileId: string | null; pickerProfileId: string | null },
): MovieSessionInput {
  return {
    date: new Date().toISOString().slice(0, 10),
    time: "20:30",
    proposerProfileId: suggestedRotation.proposerProfileId,
    pickerProfileId: suggestedRotation.pickerProfileId,
    options: [
      { title: "", platform: "", durationMinutes: 90, description: "" },
      { title: "", platform: "", durationMinutes: 90, description: "" },
      { title: "", platform: "", durationMinutes: 90, description: "" },
    ],
  };
}

export function ParentCinemaManager({
  sessions,
  members,
  suggestedRotation,
}: ParentCinemaManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [draft, setDraft] = useState<MovieSessionInput>(() => getDefaultDraft(suggestedRotation));
  const plannedCount = sessions.filter((session) => session.session.status === "planifiee").length;
  const chosenCount = sessions.filter((session) => session.session.status === "choisie").length;

  function updateOption(
    index: number,
    patch: Partial<MovieSessionInput["options"][number]>,
  ): void {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const result = await createMovieSessionAction({
        ...draft,
        options: draft.options.map((option) => ({
          title: option.title.trim(),
          platform: option.platform?.trim() ? option.platform.trim() : null,
          durationMinutes: option.durationMinutes ? Number(option.durationMinutes) : null,
          description: option.description?.trim() ? option.description.trim() : null,
        })),
      });

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de creer la session cinema." });
        return;
      }

      setFeedback({ tone: "success", message: "Session cinema enregistree." });
      setDraft(getDefaultDraft(suggestedRotation));
      router.refresh();
    });
  }

  function getProfileName(profileId: string | null): string {
    if (!profileId) {
      return "-";
    }

    return members.find((member) => member.id === profileId)?.displayName ?? "-";
  }

  return (
    <div className="space-y-4">
      <Card className="border-brand-200 bg-brand-50">
        <CardHeader>
          <CardTitle>Vue rapide cinema familial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Sessions a venir: <span className="font-semibold text-ink-strong">{sessions.length}</span>
          </p>
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Planifiees: <span className="font-semibold text-ink-strong">{plannedCount}</span>
          </p>
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Choisies: <span className="font-semibold text-ink-strong">{chosenCount}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle session cinema</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 rounded-xl bg-surface-elevated px-3 py-2 text-sm text-ink-muted">
            Pattern parent: fixer la date, designer les roles, proposer 3 films, puis enregistrer.
          </p>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="cinema-date" className="text-sm font-semibold text-ink-muted">
                  Date
                </label>
                <Input
                  id="cinema-date"
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="cinema-time" className="text-sm font-semibold text-ink-muted">
                  Heure
                </label>
                <Input
                  id="cinema-time"
                  type="time"
                  value={draft.time ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, time: event.target.value || null }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="cinema-proposer" className="text-sm font-semibold text-ink-muted">
                  Proposeur
                </label>
                <select
                  id="cinema-proposer"
                  value={draft.proposerProfileId ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      proposerProfileId: event.target.value || null,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-accent-200 bg-white px-3 text-sm text-ink-strong"
                >
                  <option value="">Aucun</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="cinema-picker" className="text-sm font-semibold text-ink-muted">
                  Decideur
                </label>
                <select
                  id="cinema-picker"
                  value={draft.pickerProfileId ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      pickerProfileId: event.target.value || null,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-accent-200 bg-white px-3 text-sm text-ink-strong"
                >
                  <option value="">Vote de famille</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-accent-100 bg-surface-elevated p-3">
              <p className="text-sm font-semibold text-ink-strong">Films proposes (3)</p>
              {draft.options.map((option, index) => (
                <div key={`movie-option-${index}`} className="grid gap-2 md:grid-cols-4">
                  <Input
                    value={option.title}
                    onChange={(event) => updateOption(index, { title: event.target.value })}
                    placeholder={`Film ${index + 1}`}
                    required
                  />
                  <Input
                    value={option.platform ?? ""}
                    onChange={(event) => updateOption(index, { platform: event.target.value })}
                    placeholder="Plateforme"
                  />
                  <Input
                    type="number"
                    min={30}
                    max={300}
                    value={option.durationMinutes ?? ""}
                    onChange={(event) =>
                      updateOption(index, {
                        durationMinutes: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    placeholder="Duree"
                  />
                  <Input
                    value={option.description ?? ""}
                    onChange={(event) => updateOption(index, { description: event.target.value })}
                    placeholder="Description"
                  />
                </div>
              ))}
            </div>

            <Button type="submit" loading={isPending}>
              Enregistrer la session
            </Button>
          </form>
        </CardContent>
      </Card>

      {feedback ? <ParentFeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Sessions a venir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune session planifiee.</p>
          ) : (
            sessions.map((bundle) => (
              <div key={bundle.session.id} className="rounded-xl border border-accent-100 bg-white p-3">
                <p className="font-semibold text-ink-strong">
                  {bundle.session.date} {bundle.session.time ? `- ${bundle.session.time.slice(0, 5)}` : ""}
                </p>
                <p className="text-xs text-ink-muted">Statut : {bundle.session.status}</p>
                <p className="text-xs text-ink-muted">
                  Proposeur : {getProfileName(bundle.session.proposerProfileId)} | Decideur : {getProfileName(bundle.session.pickerProfileId)}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                  {bundle.options.map((option) => (
                    <li key={option.id}>
                      {option.title}
                      {option.platform ? ` (${option.platform})` : ""}
                      {bundle.session.chosenOptionId === option.id ? " - choisi" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
