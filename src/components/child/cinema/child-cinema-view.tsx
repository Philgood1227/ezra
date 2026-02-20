"use client";

import * as React from "react";
import { CinemaIcon } from "@/components/child/icons/child-premium-icons";
import { EmptyState, Skeleton } from "@/components/ds";
import { useToast } from "@/components/ds/toast";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { MovieOptionCard } from "@/components/child/cinema/movie-option-card";
import { voteMovieOptionAction } from "@/lib/actions/cinema";
import type { MovieSessionBundle } from "@/lib/api/cinema";
import { haptic } from "@/lib/utils/haptic";
import { isOnline } from "@/lib/utils/network";

interface ChildCinemaViewProps {
  session: MovieSessionBundle | null;
  myVoteOptionId: string | null;
  proposerLabel?: string | null;
  pickerLabel?: string | null;
  isLoading?: boolean;
}

function formatSessionDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

function CinemaLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-radius-card" />
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-[300px] rounded-radius-card" count={3} />
      </div>
    </div>
  );
}

export function ChildCinemaView({
  session,
  myVoteOptionId,
  proposerLabel = null,
  pickerLabel = null,
  isLoading = false,
}: ChildCinemaViewProps): React.JSX.Element {
  const toast = useToast();
  const [localVoteOptionId, setLocalVoteOptionId] = React.useState<string | null>(myVoteOptionId);
  const [pendingOptionId, setPendingOptionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalVoteOptionId(myVoteOptionId);
  }, [myVoteOptionId]);

  const handleVote = React.useCallback(
    (optionId: string) => {
      if (!session || session.session.status !== "planifiee" || pendingOptionId) {
        return;
      }

      if (!isOnline()) {
        toast.error("Mode hors-ligne active, vote indisponible.");
        return;
      }

      const previousVote = localVoteOptionId;
      setPendingOptionId(optionId);
      setLocalVoteOptionId(optionId);
      haptic("tap");

      void (async () => {
        const result = await voteMovieOptionAction({ sessionId: session.session.id, movieOptionId: optionId });
        if (!result.success) {
          setLocalVoteOptionId(previousVote);
          toast.error("Impossible d'enregistrer ton vote.");
          haptic("error");
          setPendingOptionId(null);
          return;
        }

        if (result.data?.chosenOptionId) {
          toast.success("Film choisi pour la semaine");
          haptic("success");
        } else {
          toast.success("Ton choix est enregistre");
        }

        setPendingOptionId(null);
      })();
    },
    [localVoteOptionId, pendingOptionId, session, toast],
  );

  let statusLine = "Aucune session cinema prevue.";
  let statusHint = "Demande une nouvelle session.";

  if (session) {
    const dateLabel = formatSessionDate(session.session.date);
    const timeLabel = session.session.time ? ` a ${session.session.time.slice(0, 5)}` : "";
    if (session.session.status === "planifiee") {
      statusLine = `Session: ${dateLabel}${timeLabel}`;
      statusHint = "Fais ton choix";
    } else if (session.session.status === "choisie") {
      statusLine = `Film choisi: ${session.chosenOption?.title ?? "Film"}`;
      statusHint = "Pret pour la seance";
    } else {
      statusLine = `Derniere session: ${session.chosenOption?.title ?? "Film"}`;
      statusHint = "On attend la prochaine";
    }
  }

  return (
    <section className="mx-auto w-full max-w-[920px] space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-black tracking-tight text-text-primary">Cinema</h1>
        <p className="text-sm text-text-secondary">Quel film on choisit ?</p>
      </header>

      {isLoading ? <CinemaLoadingSkeleton /> : null}

      {!isLoading ? (
        <>
          {!session ? (
            <EmptyState
              icon={<CinemaIcon className="size-8" />}
              title="Aucune session"
              description="Demande a tes parents d'en organiser une."
            />
          ) : (
            <>
              <div className="rounded-radius-card border border-border-subtle bg-bg-surface/80 p-4 shadow-card backdrop-blur-sm">
                <p className="text-sm font-black text-text-primary">{statusLine}</p>
                <p className="mt-1 text-sm text-text-secondary">{statusHint}</p>
                <p className="mt-2 text-xs text-text-muted">
                  Propose par: {proposerLabel ?? "-"} | Choix final: {pickerLabel ?? "-"}
                </p>
              </div>

              <StaggerContainer className="grid gap-3 md:grid-cols-3">
                {session.options.map((option, index) => (
                  <StaggerItem key={option.id}>
                    <MovieOptionCard
                      title={option.title}
                      platform={option.platform}
                      durationMinutes={option.durationMinutes}
                      description={option.description}
                      isSelected={localVoteOptionId === option.id}
                      isChosen={session.session.chosenOptionId === option.id}
                      disabled={Boolean(pendingOptionId) || session.session.status !== "planifiee"}
                      onVote={() => handleVote(option.id)}
                      index={index}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
