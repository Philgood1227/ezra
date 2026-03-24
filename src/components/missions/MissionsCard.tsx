"use client";

import * as React from "react";
import { Button } from "@/components/ds";
import { cn } from "@/lib/utils";
import { FocusModeMission } from "./FocusModeMission";
import { MissionDrawer } from "./MissionDrawer";
import { MissionRow } from "./MissionRow";
import type { MissionDrawerView, MissionUI } from "./types";
import { useMissionsToday } from "./useMissionsToday";

interface MissionsCardProps {
  missions: MissionUI[];
  className?: string;
}

function pluralizeMission(count: number): string {
  return `${count} mission${count > 1 ? "s" : ""} aujourd'hui`;
}

export function MissionsCard({ missions, className }: MissionsCardProps): React.JSX.Element {
  const {
    missions: liveMissions,
    pendingMissionId,
    errorMessage,
    updateMissionStatus,
    clearError,
  } = useMissionsToday({ initialMissions: missions });

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerView, setDrawerView] = React.useState<MissionDrawerView>("mission");
  const [selectedMissionId, setSelectedMissionId] = React.useState<string | null>(
    missions[0]?.id ?? null,
  );
  const [focusMissionId, setFocusMissionId] = React.useState<string | null>(null);
  const [suggestedFocusMissionId, setSuggestedFocusMissionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedMissionId) {
      setSelectedMissionId(liveMissions[0]?.id ?? null);
      return;
    }

    const stillExists = liveMissions.some((mission) => mission.id === selectedMissionId);
    if (!stillExists) {
      setSelectedMissionId(liveMissions[0]?.id ?? null);
    }
  }, [liveMissions, selectedMissionId]);

  React.useEffect(() => {
    if (!focusMissionId) {
      return;
    }

    const exists = liveMissions.some((mission) => mission.id === focusMissionId);
    if (!exists) {
      setFocusMissionId(null);
    }
  }, [focusMissionId, liveMissions]);

  const displayedMissions = liveMissions.slice(0, 4);
  const hiddenCount = Math.max(0, liveMissions.length - displayedMissions.length);
  const focusMission = liveMissions.find((mission) => mission.id === focusMissionId) ?? null;
  const suggestedFocusMission =
    liveMissions.find((mission) => mission.id === suggestedFocusMissionId) ?? null;

  async function handleToggleDone(missionId: string): Promise<void> {
    const success = await updateMissionStatus(missionId, "done");
    if (success) {
      setSuggestedFocusMissionId(null);
    }
  }

  async function handleStart(missionId: string): Promise<void> {
    const success = await updateMissionStatus(missionId, "in_progress");
    if (success) {
      setSuggestedFocusMissionId(missionId);
    }
  }

  async function handlePause(missionId: string): Promise<void> {
    const success = await updateMissionStatus(missionId, "todo");
    if (success && focusMissionId === missionId) {
      setFocusMissionId(null);
    }
  }

  async function handleComplete(missionId: string): Promise<void> {
    const success = await updateMissionStatus(missionId, "done");
    if (success) {
      if (focusMissionId === missionId) {
        setFocusMissionId(null);
      }
      setSuggestedFocusMissionId(null);
    }
  }

  async function handleOpenFocus(missionId: string): Promise<void> {
    const mission = liveMissions.find((entry) => entry.id === missionId);
    if (!mission) {
      return;
    }

    if (mission.status === "todo") {
      const success = await updateMissionStatus(missionId, "in_progress");
      if (!success) {
        return;
      }
    }

    setFocusMissionId(missionId);
    setSuggestedFocusMissionId(null);
  }

  return (
    <>
      <section className={cn("mission-card-surface p-5 sm:p-6", className)} data-testid="missions-card">
        <header className="space-y-1">
          <h2 className="text-card-title font-display tracking-[0.01em] text-text-primary">
            Tes missions du jour
          </h2>
          <p className="text-section-title text-text-secondary">{pluralizeMission(liveMissions.length)}</p>
        </header>

        <div className="mt-4 space-y-2.5">
          {displayedMissions.length > 0 ? (
            displayedMissions.map((mission) => (
              <MissionRow
                key={mission.id}
                mission={mission}
                onOpen={(missionId) => {
                  setSelectedMissionId(missionId);
                  setDrawerView("mission");
                  setDrawerOpen(true);
                }}
                onToggleDone={handleToggleDone}
                onStart={handleStart}
                onFocus={handleOpenFocus}
                isPending={pendingMissionId === mission.id}
              />
            ))
          ) : (
            <p className="rounded-[22px] border border-border-subtle bg-bg-surface px-4 py-5 text-[1.05rem] text-text-secondary">
              Aucune mission aujourd&apos;hui.
            </p>
          )}
        </div>

        {hiddenCount > 0 ? (
          <div className="mt-3 border-t border-dashed border-brand-primary/25 pt-3" data-testid="missions-overflow-count">
            <p className="text-[1.05rem] font-semibold text-text-secondary">+{hiddenCount} autres missions</p>
            <button
              type="button"
              className="mt-2 inline-flex min-h-touch-sm items-center rounded-radius-pill border border-brand-primary/18 bg-brand-50 px-4 text-[1.3rem] font-semibold text-brand-primary"
              onClick={() => {
                setDrawerView("all");
                if (!selectedMissionId && liveMissions[0]) {
                  setSelectedMissionId(liveMissions[0].id);
                }
                setDrawerOpen(true);
              }}
            >
              Voir toutes les missions
            </button>
          </div>
        ) : null}

        {suggestedFocusMission ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[18px] border border-brand-primary/20 bg-brand-50/75 px-3 py-2.5">
            <p className="text-sm font-semibold text-brand-primary">
              Mission demarree: passe en Focus pour rester concentre.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-radius-pill"
              onClick={() => void handleOpenFocus(suggestedFocusMission.id)}
            >
              Ouvrir Focus
            </Button>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-status-error/20 bg-status-error/12 px-3 py-2 text-sm text-status-error">
            <p>{errorMessage}</p>
            <button
              type="button"
              className="inline-flex min-h-touch-sm items-center rounded-radius-pill border border-status-error/25 px-3 font-semibold"
              onClick={clearError}
            >
              Fermer
            </button>
          </div>
        ) : null}
      </section>

      <MissionDrawer
        open={drawerOpen}
        missions={liveMissions}
        selectedMissionId={selectedMissionId}
        view={drawerView}
        onClose={() => setDrawerOpen(false)}
        onSelectMission={setSelectedMissionId}
        onViewChange={setDrawerView}
        onStart={handleStart}
        onPause={handlePause}
        onComplete={handleComplete}
        onOpenFocus={async (missionId) => {
          await handleOpenFocus(missionId);
          setDrawerOpen(false);
        }}
        pendingMissionId={pendingMissionId}
      />

      <FocusModeMission
        open={Boolean(focusMission)}
        mission={focusMission}
        onClose={() => setFocusMissionId(null)}
        onComplete={async (missionId) => {
          await handleComplete(missionId);
          setFocusMissionId(null);
        }}
        onPauseMission={async (missionId) => {
          await handlePause(missionId);
        }}
      />
    </>
  );
}

