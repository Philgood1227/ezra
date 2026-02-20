"use client";

import { useMemo, useState, useTransition } from "react";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import { canTransitionTaskStatus } from "@/lib/domain/task-status";
import type { TaskInstanceStatus, TaskInstanceSummary } from "@/lib/day-templates/types";

interface UseTaskInstanceStatusInput {
  initialInstances: TaskInstanceSummary[];
  initialDailyPointsTotal: number;
}

interface UseTaskInstanceStatusResult {
  instances: TaskInstanceSummary[];
  dailyPointsTotal: number;
  isPending: boolean;
  pendingInstanceId: string | null;
  errorMessage: string | null;
  updateStatus: (
    instanceId: string,
    nextStatus: TaskInstanceStatus,
  ) => Promise<{ pointsDelta: number; unlockedAchievementLabels: string[] } | null>;
  clearError: () => void;
}

export function useTaskInstanceStatus({
  initialInstances,
  initialDailyPointsTotal,
}: UseTaskInstanceStatusInput): UseTaskInstanceStatusResult {
  const [instances, setInstances] = useState<TaskInstanceSummary[]>(initialInstances);
  const [dailyPointsTotal, setDailyPointsTotal] = useState(initialDailyPointsTotal);
  const [pendingInstanceId, setPendingInstanceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedInstances = useMemo(
    () =>
      [...instances].sort((left, right) => {
        if (left.startTime !== right.startTime) {
          return left.startTime.localeCompare(right.startTime);
        }

        return left.sortOrder - right.sortOrder;
      }),
    [instances],
  );

  async function updateStatus(
    instanceId: string,
    nextStatus: TaskInstanceStatus,
  ): Promise<{ pointsDelta: number; unlockedAchievementLabels: string[] } | null> {
    const current = instances.find((instance) => instance.id === instanceId);
    if (!current) {
      setErrorMessage("Tâche introuvable.");
      return null;
    }

    if (!canTransitionTaskStatus(current.status, nextStatus)) {
      setErrorMessage("Transition de statut non autorisée.");
      return null;
    }

    setErrorMessage(null);
    setPendingInstanceId(instanceId);

    const previousInstances = instances;
    const previousDailyPoints = dailyPointsTotal;

    setInstances((currentInstances) =>
      currentInstances.map((instance) =>
        instance.id === instanceId ? { ...instance, status: nextStatus } : instance,
      ),
    );

    return await new Promise<{ pointsDelta: number; unlockedAchievementLabels: string[] } | null>((resolve) => {
      startTransition(async () => {
        const result = await updateTaskStatusAction({ instanceId, newStatus: nextStatus });
        if (!result.success || !result.data) {
          setInstances(previousInstances);
          setDailyPointsTotal(previousDailyPoints);
          setErrorMessage(result.error ?? "Impossible de mettre à jour la tâche.");
          setPendingInstanceId(null);
          resolve(null);
          return;
        }

        setInstances((currentInstances) =>
          currentInstances.map((instance) =>
            instance.id === instanceId
              ? {
                  ...instance,
                  status: result.data?.status ?? instance.status,
                  pointsEarned: result.data?.pointsEarnedTask ?? instance.pointsEarned,
                }
              : instance,
          ),
        );
        setDailyPointsTotal(result.data.dailyPointsTotal);
        setPendingInstanceId(null);
        resolve({
          pointsDelta: result.data.pointsDelta,
          unlockedAchievementLabels: result.data.unlockedAchievementLabels ?? [],
        });
      });
    });
  }

  return {
    instances: sortedInstances,
    dailyPointsTotal,
    isPending,
    pendingInstanceId,
    errorMessage,
    updateStatus,
    clearError: () => setErrorMessage(null),
  };
}
