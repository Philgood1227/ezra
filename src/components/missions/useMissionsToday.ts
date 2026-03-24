"use client";

import * as React from "react";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import { mapMissionStatusToTaskStatus, mapTaskStatusToMissionStatus } from "./mappers";
import type { MissionStatus, MissionUI } from "./types";

interface UseMissionsTodayInput {
  initialMissions: MissionUI[];
}

interface UseMissionsTodayResult {
  missions: MissionUI[];
  pendingMissionId: string | null;
  errorMessage: string | null;
  updateMissionStatus: (missionId: string, nextStatus: MissionStatus) => Promise<boolean>;
  clearError: () => void;
}

export function useMissionsToday({ initialMissions }: UseMissionsTodayInput): UseMissionsTodayResult {
  const [missions, setMissions] = React.useState<MissionUI[]>(initialMissions);
  const [pendingMissionId, setPendingMissionId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMissions(initialMissions);
  }, [initialMissions]);

  const updateMissionStatus = React.useCallback(
    async (missionId: string, nextStatus: MissionStatus): Promise<boolean> => {
      if (pendingMissionId) {
        return false;
      }

      const currentMission = missions.find((mission) => mission.id === missionId);
      if (!currentMission) {
        setErrorMessage("Mission introuvable.");
        return false;
      }

      if (currentMission.status === nextStatus) {
        return true;
      }

      setErrorMessage(null);
      setPendingMissionId(missionId);

      const previousMissions = missions;
      setMissions((current) =>
        current.map((mission) =>
          mission.id === missionId
            ? {
                ...mission,
                status: nextStatus,
                sourceStatus: mapMissionStatusToTaskStatus(nextStatus),
              }
            : mission,
        ),
      );

      try {
        const result = await updateTaskStatusAction({
          instanceId: missionId,
          newStatus: mapMissionStatusToTaskStatus(nextStatus),
        });

        if (!result.success || !result.data) {
          setMissions(previousMissions);
          setErrorMessage(result.error ?? "Impossible de mettre a jour la mission.");
          setPendingMissionId(null);
          return false;
        }

        setMissions((current) =>
          current.map((mission) =>
            mission.id === missionId
              ? {
                  ...mission,
                  status: mapTaskStatusToMissionStatus(result.data?.status),
                  sourceStatus: result.data?.status ?? mission.sourceStatus,
                }
              : mission,
          ),
        );
        setPendingMissionId(null);
        return true;
      } catch {
        setMissions(previousMissions);
        setErrorMessage("Impossible de mettre a jour la mission.");
        setPendingMissionId(null);
        return false;
      }
    },
    [missions, pendingMissionId],
  );

  return {
    missions,
    pendingMissionId,
    errorMessage,
    updateMissionStatus,
    clearError: () => setErrorMessage(null),
  };
}

