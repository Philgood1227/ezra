"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChecklistIcon as PremiumChecklistIcon,
  DayPlannerIcon,
  LeisureIcon,
  SportIcon,
} from "@/components/child/icons/child-premium-icons";
import { ChecklistItemRow } from "@/components/child/checklists/checklist-item-row";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ds";
import { useToast } from "@/components/ds/toast";
import { toggleChecklistInstanceItemAction } from "@/lib/actions/checklists";
import type { TomorrowKeyMomentSummary, TomorrowPreparationSummary } from "@/lib/api/checklists";
import type {
  ChecklistInstanceItemSummary,
  ChecklistInstanceSummary,
} from "@/lib/day-templates/types";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/utils/haptic";
import { isOnline } from "@/lib/utils/network";

interface ChildTomorrowViewProps {
  tomorrow: TomorrowPreparationSummary;
  checklistInstances: ChecklistInstanceSummary[];
  isLoading?: boolean;
}

interface TomorrowChecklistItem extends ChecklistInstanceItemSummary {
  checklistLabel: string;
}

function formatSubtitle(tomorrow: TomorrowPreparationSummary): string {
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(tomorrow.date);

  return `${dateLabel} - ${tomorrow.dayTypeLabel}`;
}

function getMomentKindLabel(kind: TomorrowKeyMomentSummary["kind"]): string {
  if (kind === "activity") {
    return "Activite";
  }

  if (kind === "leisure") {
    return "Loisir";
  }

  return "Mission";
}

function getMomentIcon(
  kind: TomorrowKeyMomentSummary["kind"],
): (props: React.ComponentProps<typeof DayPlannerIcon>) => React.JSX.Element {
  if (kind === "activity") {
    return SportIcon;
  }

  if (kind === "leisure") {
    return LeisureIcon;
  }

  return DayPlannerIcon;
}

function flattenTomorrowChecklistItems(
  instances: ChecklistInstanceSummary[],
): TomorrowChecklistItem[] {
  return instances.flatMap((instance) =>
    instance.items.map((item) => ({
      ...item,
      checklistLabel: instance.label,
    })),
  );
}

function updateChecklistItemState(
  items: TomorrowChecklistItem[],
  itemId: string,
  isChecked: boolean,
): TomorrowChecklistItem[] {
  return items.map((item) => (item.id === itemId ? { ...item, isChecked } : item));
}

function TomorrowLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-radius-card" />
      <Skeleton className="h-40 w-full rounded-radius-card" />
      <Skeleton className="h-44 w-full rounded-radius-card" />
      <Skeleton className="h-20 w-full rounded-radius-card" />
    </div>
  );
}

export function ChildTomorrowView({
  tomorrow,
  checklistInstances,
  isLoading = false,
}: ChildTomorrowViewProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [pendingItemId, setPendingItemId] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<TomorrowChecklistItem[]>(() =>
    flattenTomorrowChecklistItems(checklistInstances),
  );
  const [toggleFeedback, setToggleFeedback] = React.useState<string | null>(null);
  const [isPreparationAcknowledged, setIsPreparationAcknowledged] = React.useState(false);

  React.useEffect(() => {
    setItems(flattenTomorrowChecklistItems(checklistInstances));
  }, [checklistInstances]);

  const subtitle = React.useMemo(() => formatSubtitle(tomorrow), [tomorrow]);
  const keyMoments = tomorrow.keyMoments.slice(0, 5);
  const isDebugEnabled =
    process.env.NODE_ENV !== "production" &&
    searchParams.get("debug") === "1" &&
    Boolean(tomorrow.debug);
  const hasChecklistItems = items.length > 0;

  const handleToggleChecklistItem = React.useCallback(
    (itemId: string, isChecked: boolean) => {
      if (pendingItemId) {
        return;
      }

      if (!isOnline()) {
        toast.error("Mode hors-ligne active, impossible de mettre a jour.");
        return;
      }

      const previousItems = items;
      setPendingItemId(itemId);
      setItems((current) => updateChecklistItemState(current, itemId, isChecked));
      haptic("tap");

      void (async () => {
        const result = await toggleChecklistInstanceItemAction({ itemId, isChecked });
        if (!result.success) {
          setItems(previousItems);
          toast.error("Erreur lors de la mise a jour.");
          haptic("error");
          setPendingItemId(null);
          return;
        }

        setToggleFeedback(isChecked ? "Top, c'est coche." : "D'accord, on le prepare ensuite.");
        window.setTimeout(() => setToggleFeedback(null), 1700);
        setPendingItemId(null);
        router.refresh();
      })();
    },
    [items, pendingItemId, router, toast],
  );

  const handleAcknowledgePreparation = React.useCallback(() => {
    setIsPreparationAcknowledged(true);
    setToggleFeedback("Parfait, preparation validee.");
    window.setTimeout(() => setToggleFeedback(null), 1800);
    haptic("success");
  }, []);

  return (
    <section
      className="mx-auto w-full max-w-5xl space-y-7 pb-26 md:space-y-8 md:pb-8"
      data-testid="child-tomorrow-view"
    >
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight text-text-primary">
          DEMAIN
        </h1>
        <p className="text-base font-medium text-text-secondary/80">{subtitle}</p>
      </header>

      {isLoading ? <TomorrowLoadingSkeleton /> : null}

      {!isLoading ? (
        <div className="space-y-4 md:space-y-5">
          <div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start md:gap-7 lg:gap-8"
            data-testid="tomorrow-layout-grid"
          >
            <div className="space-y-6 md:space-y-7 md:pr-1">
              <Card className="via-bg-surface/92 border-border-default/80 bg-gradient-to-br from-bg-surface/95 to-brand-50/20 shadow-card transition-shadow duration-200 md:shadow-elevated">
                <CardContent className="space-y-3.5 p-5 md:p-6">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-8 items-center justify-center rounded-radius-pill border border-border-default bg-bg-surface/95 text-brand-primary shadow-card">
                      <DayPlannerIcon className="size-5" />
                    </span>
                    <h2 className="text-xl font-black tracking-tight text-text-primary">
                      Apercu de demain
                    </h2>
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-text-primary">
                      {tomorrow.dayTypeLabel}
                    </p>
                    {tomorrow.firstTransitionLabel ? (
                      <p className="text-base text-text-secondary/80">
                        {tomorrow.firstTransitionLabel}
                      </p>
                    ) : (
                      <p className="text-base text-text-secondary/80">
                        On commence doucement demain matin.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="via-bg-surface/92 to-accent-50/18 border-border-default/80 bg-gradient-to-br from-bg-surface/95 shadow-card transition-shadow duration-200 md:shadow-elevated">
                <CardContent className="space-y-3.5 p-5 md:p-6">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-8 items-center justify-center rounded-radius-pill border border-border-default bg-bg-surface/95 text-brand-primary shadow-card">
                      <PremiumChecklistIcon className="size-5" />
                    </span>
                    <h2 className="text-xl font-black tracking-tight text-text-primary">
                      Moments cles
                    </h2>
                  </div>

                  {keyMoments.length > 0 ? (
                    <ul className="space-y-2.5" data-testid="tomorrow-key-moments-list">
                      {keyMoments.map((moment) => {
                        const MomentIcon = getMomentIcon(moment.kind);
                        return (
                          <li
                            key={moment.id}
                            className="flex items-center gap-3 rounded-radius-button border border-border-subtle bg-bg-surface/85 px-3 py-2.5 shadow-card transition-all duration-200 hover:border-border-default hover:bg-bg-surface-hover/90 hover:shadow-glass"
                          >
                            <span className="inline-flex size-8 items-center justify-center rounded-radius-pill border border-border-default bg-bg-surface/95 text-text-secondary shadow-card">
                              <MomentIcon className="size-5" />
                            </span>
                            <p className="w-24 text-base font-semibold text-text-secondary/80">
                              {moment.timeLabel}
                            </p>
                            <p className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">
                              {moment.label}
                            </p>
                            <p className="text-base text-text-secondary/75">
                              {getMomentKindLabel(moment.kind)}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-base text-text-secondary/80">
                      Aucun moment cle configure pour demain.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 md:space-y-7 md:pl-1">
              <Card className="via-bg-surface/92 border-border-default/80 bg-gradient-to-br from-bg-surface/95 to-bg-elevated/90 shadow-card transition-shadow duration-200 md:shadow-elevated">
                <CardContent className="space-y-3.5 p-5 md:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-8 items-center justify-center rounded-radius-pill border border-border-default bg-bg-surface/95 text-brand-primary shadow-card">
                        <PremiumChecklistIcon className="size-5" />
                      </span>
                      <h2 className="text-xl font-black tracking-tight text-text-primary">
                        A preparer
                      </h2>
                    </div>
                    {hasChecklistItems ? (
                      <p className="text-base font-semibold text-text-secondary/90">
                        {items.filter((item) => item.isChecked).length}/{items.length}
                      </p>
                    ) : null}
                  </div>

                  {hasChecklistItems ? (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <ChecklistItemRow
                          key={item.id}
                          label={item.label}
                          description={item.checklistLabel}
                          isChecked={item.isChecked}
                          disabled={pendingItemId === item.id}
                          onToggle={() => handleToggleChecklistItem(item.id, !item.isChecked)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<PremiumChecklistIcon className="size-8" />}
                      title="Tout est pret pour demain"
                      description="Rien a preparer pour demain."
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="via-bg-surface/92 to-brand-50/14 relative overflow-hidden border-border-default/80 bg-gradient-to-br from-bg-surface/95 shadow-card ring-1 ring-brand-primary/15 transition-shadow duration-200 md:shadow-elevated">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-6 top-0 h-16 rounded-radius-card bg-brand-50/60 blur-2xl"
                />
                <CardContent className="relative space-y-3 p-5 md:space-y-4 md:p-6">
                  <Button
                    size="lg"
                    variant="primary"
                    fullWidth
                    className="shadow-card transition-shadow duration-200 hover:shadow-glass"
                    type="button"
                    onClick={handleAcknowledgePreparation}
                  >
                    C&apos;est pret
                  </Button>
                  <p
                    className={cn(
                      "bg-status-success/12 rounded-radius-button border border-status-success/35 px-3 py-2 text-base font-semibold text-status-success transition-all duration-200",
                      isPreparationAcknowledged || toggleFeedback ? "opacity-100" : "opacity-0",
                    )}
                    aria-live="polite"
                  >
                    {toggleFeedback ?? "Preparation enregistree."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {isDebugEnabled && tomorrow.debug ? (
            <Card
              className="bg-status-info/8 border-status-info/45"
              data-testid="tomorrow-debug-panel"
            >
              <CardContent className="space-y-3 p-4">
                <div className="space-y-1">
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-status-info">
                    Debug demain
                  </h3>
                  <p className="font-mono text-xs text-text-secondary">
                    source={tomorrow.debug.source} timezone={tomorrow.debug.timezone}
                  </p>
                  <p className="font-mono text-xs text-text-secondary">
                    task_instances={tomorrow.debug.plannedInstancesCount} template_tasks=
                    {tomorrow.debug.templateTasksCount} key_moments={tomorrow.debug.keyMomentsCount}
                  </p>
                  <p className="font-mono text-xs text-text-secondary">
                    tomorrowDate={tomorrow.debug.tomorrowDate} rangeStart=
                    {tomorrow.debug.rangeStartIso} rangeEnd=
                    {tomorrow.debug.rangeEndIso}
                  </p>
                  <p className="font-mono text-xs text-text-secondary">
                    childId={tomorrow.debug.childId ?? "none"} familyId=
                    {tomorrow.debug.familyId ?? "none"}
                  </p>
                  <p className="font-mono text-xs text-text-secondary">
                    dayType={tomorrow.debug.resolvedDayType} templateId=
                    {tomorrow.debug.templateResolution.resolvedTemplateId ?? "none"} templateReason=
                    {tomorrow.debug.templateResolution.resolvedTemplateReason}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-xs font-semibold text-text-secondary">
                    weekdayTemplates ({tomorrow.debug.templateResolution.weekdayTemplatesCount})
                  </p>
                  <ul className="space-y-1 font-mono text-xs text-text-secondary">
                    {tomorrow.debug.templateResolution.weekdayTemplates.map((template) => (
                      <li key={template.id}>
                        {template.id} | {template.name} | weekday={template.weekday} | default=
                        {template.isDefault ? "1" : "0"} | tasks={template.taskCount}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-xs font-semibold text-text-secondary">
                    query.task_instances count={tomorrow.debug.queries.taskInstances.count}
                  </p>
                  <pre className="overflow-x-auto rounded-radius-button bg-bg-surface/80 p-2 font-mono text-xs text-text-secondary">
                    {JSON.stringify(tomorrow.debug.queries.taskInstances.criteria)}
                  </pre>
                  <ul className="space-y-1 font-mono text-xs text-text-secondary">
                    {tomorrow.debug.queries.taskInstances.rows.map((row) => (
                      <li key={`task-instances-${row.id}`}>
                        {row.id} | {row.title} | {row.date} | {row.startTime} |{" "}
                        {row.assignedTo ?? "none"} | {row.itemKind} | {row.status} | template=
                        {row.templateId ?? "none"}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-xs font-semibold text-text-secondary">
                    query.template_tasks count={tomorrow.debug.queries.templateTasks.count}
                  </p>
                  <pre className="overflow-x-auto rounded-radius-button bg-bg-surface/80 p-2 font-mono text-xs text-text-secondary">
                    {JSON.stringify(tomorrow.debug.queries.templateTasks.criteria)}
                  </pre>
                  <ul className="space-y-1 font-mono text-xs text-text-secondary">
                    {tomorrow.debug.queries.templateTasks.rows.map((row) => (
                      <li key={`template-tasks-${row.id}`}>
                        {row.id} | {row.title} | {row.date} | {row.startTime} |{" "}
                        {row.assignedTo ?? "none"} | {row.itemKind} | {row.status} | template=
                        {row.templateId ?? "none"}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-xs font-semibold text-text-secondary">
                    query.scheduled_tasks count={tomorrow.debug.queries.scheduledTasks.count}
                  </p>
                  <pre className="overflow-x-auto rounded-radius-button bg-bg-surface/80 p-2 font-mono text-xs text-text-secondary">
                    {JSON.stringify(tomorrow.debug.queries.scheduledTasks.criteria)}
                  </pre>
                </div>

                <ul
                  className="space-y-1 font-mono text-xs text-text-secondary"
                  data-testid="tomorrow-debug-candidates"
                >
                  {tomorrow.debug.candidateItems.map((item) => (
                    <li key={`${item.source}-${item.id}`}>
                      [{item.source}] {item.id} | {item.title} | {item.date} | {item.startTime} |{" "}
                      {item.assignedTo ?? "none"} | {item.itemKind} | {item.status} | template=
                      {item.templateId ?? "none"}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
