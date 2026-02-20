"use client";

import * as React from "react";
import { ChecklistIcon as PremiumChecklistIcon } from "@/components/child/icons/child-premium-icons";
import { ChecklistCard } from "@/components/child/checklists/checklist-card";
import { EmptyState, ProgressBar, Skeleton } from "@/components/ds";
import { useToast } from "@/components/ds/toast";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { toggleChecklistInstanceItemAction } from "@/lib/actions/checklists";
import type { ChecklistByDay, ChecklistInstanceSummary } from "@/lib/day-templates/types";
import { haptic } from "@/lib/utils/haptic";
import { isOnline } from "@/lib/utils/network";

interface ChildChecklistsViewProps {
  byDay: ChecklistByDay;
  isLoading?: boolean;
}

function ChecklistSection({
  title,
  instances,
  pendingItemId,
  onToggleItem,
}: {
  title: string;
  instances: ChecklistInstanceSummary[];
  pendingItemId: string | null;
  onToggleItem: (itemId: string, checked: boolean) => void;
}): React.JSX.Element {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-black tracking-tight text-text-primary">{title}</h2>
        <p className="text-xs font-semibold text-text-secondary">{instances.length} liste(s)</p>
      </div>
      <StaggerContainer className="space-y-3">
        {instances.map((instance) => {
          const totalItems = instance.items.length;
          const checkedItems = instance.items.filter((item) => item.isChecked).length;
          const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

          return (
            <StaggerItem key={instance.id}>
              <ChecklistCard
                label={instance.label}
                type={instance.type}
                items={instance.items}
                progress={progress}
                pendingItemId={pendingItemId}
                onToggleItem={onToggleItem}
              />
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </section>
  );
}

function ChecklistsLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-radius-card" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-radius-card border border-border-subtle bg-bg-surface/80 p-4 shadow-card backdrop-blur-sm">
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-touch-lg w-full rounded-radius-button" count={2} />
          </div>
        </div>
      ))}
    </div>
  );
}

function flattenItems(instances: ChecklistInstanceSummary[]): { id: string; isChecked: boolean }[] {
  return instances.flatMap((instance) => instance.items.map((item) => ({ id: item.id, isChecked: item.isChecked })));
}

function updateItemStatus(byDay: ChecklistByDay, itemId: string, checked: boolean): ChecklistByDay {
  return {
    today: byDay.today.map((instance) => ({
      ...instance,
      items: instance.items.map((item) => (item.id === itemId ? { ...item, isChecked: checked } : item)),
    })),
    tomorrow: byDay.tomorrow.map((instance) => ({
      ...instance,
      items: instance.items.map((item) => (item.id === itemId ? { ...item, isChecked: checked } : item)),
    })),
  };
}

export function ChildChecklistsView({
  byDay,
  isLoading = false,
}: ChildChecklistsViewProps): React.JSX.Element {
  const toast = useToast();
  const [sections, setSections] = React.useState<ChecklistByDay>(byDay);
  const [pendingItemId, setPendingItemId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSections(byDay);
  }, [byDay]);

  const allInstances = React.useMemo(() => [...sections.today, ...sections.tomorrow], [sections.today, sections.tomorrow]);
  const allItems = React.useMemo(() => flattenItems(allInstances), [allInstances]);
  const checkedItems = React.useMemo(() => allItems.filter((item) => item.isChecked).length, [allItems]);
  const totalItems = allItems.length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  const hasNoChecklist = sections.today.length === 0 && sections.tomorrow.length === 0;

  const handleToggleItem = React.useCallback(
    (itemId: string, checked: boolean) => {
      if (pendingItemId) {
        return;
      }

      if (!isOnline()) {
        toast.error("Mode hors-ligne active, impossible de mettre a jour.");
        return;
      }

      const previousState = sections;
      setPendingItemId(itemId);
      setSections((current) => updateItemStatus(current, itemId, checked));
      haptic("tap");

      void (async () => {
        const result = await toggleChecklistInstanceItemAction({ itemId, isChecked: checked });
        if (!result.success) {
          setSections(previousState);
          toast.error("Erreur lors de la mise a jour de la checklist.");
          haptic("error");
        }
        setPendingItemId(null);
      })();
    },
    [pendingItemId, sections, toast],
  );

  return (
    <section className="mx-auto w-full max-w-[860px] space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-black tracking-tight text-text-primary">Mes checklists</h1>
        <p className="text-sm text-text-secondary">Ce que je dois preparer.</p>
      </header>

      {isLoading ? <ChecklistsLoadingSkeleton /> : null}

      {!isLoading ? (
        <>
          <div className="rounded-radius-card border border-border-subtle bg-bg-surface/80 p-4 shadow-card backdrop-blur-sm">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text-primary">
                {checkedItems}/{totalItems} etapes terminees
              </p>
              <ProgressBar value={progress} variant={progress === 100 ? "success" : "primary"} />
            </div>
          </div>

          {hasNoChecklist ? (
            <EmptyState
              icon={<PremiumChecklistIcon className="size-8" />}
              title="Aucune checklist"
              description="Tes parents peuvent en ajouter depuis le carnet scolaire."
            />
          ) : (
            <div className="space-y-5">
              <ChecklistSection
                title="Aujourd'hui"
                instances={sections.today}
                pendingItemId={pendingItemId}
                onToggleItem={handleToggleItem}
              />
              <ChecklistSection
                title="Demain"
                instances={sections.tomorrow}
                pendingItemId={pendingItemId}
                onToggleItem={handleToggleItem}
              />
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
