"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChecklistItemRow } from "@/components/child/checklists/checklist-item-row";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ds";
import { useToast } from "@/components/ds/toast";
import { toggleChecklistInstanceItemAction } from "@/lib/actions/checklists";
import type { TomorrowPreparationSummary } from "@/lib/api/checklists";
import type { ChecklistInstanceSummary } from "@/lib/day-templates/types";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/utils/haptic";
import { isOnline } from "@/lib/utils/network";

interface ChildChecklistsPreparationViewProps {
  tomorrow: TomorrowPreparationSummary;
  checklistInstances: ChecklistInstanceSummary[];
  isLoading?: boolean;
}

function formatTomorrowSubtitle(tomorrow: TomorrowPreparationSummary): string {
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(tomorrow.date);

  return `${dateLabel} · ${tomorrow.dayTypeLabel}`;
}

function typeBadgeLabel(type: string): string {
  if (type === "quotidien") {
    return "Quotidien";
  }

  if (type === "evaluation") {
    return "Evaluation";
  }

  if (type === "sortie") {
    return "Sortie";
  }

  if (type === "piscine") {
    return "Piscine";
  }

  if (type === "routine") {
    return "Routine";
  }

  return "Checklist";
}

function typeEmoji(type: string): string {
  if (type === "piscine") {
    return "\uD83C\uDFCA";
  }

  if (type === "sortie") {
    return "\uD83C\uDF33";
  }

  if (type === "evaluation") {
    return "\uD83C\uDF93";
  }

  if (type === "routine") {
    return "\u23F0";
  }

  if (type === "quotidien") {
    return "\uD83D\uDCCC";
  }

  return "\uD83D\uDCCB";
}

function cardTone(type: string): string {
  if (type === "piscine") {
    return "border-cyan-200 bg-cyan-50";
  }

  if (type === "sortie") {
    return "border-emerald-200 bg-emerald-50";
  }

  if (type === "evaluation") {
    return "border-indigo-200 bg-indigo-50";
  }

  if (type === "routine") {
    return "border-sky-200 bg-sky-50";
  }

  if (type === "quotidien") {
    return "border-orange-200 bg-orange-50";
  }

  return "border-slate-200 bg-slate-50";
}

function PreparationSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-radius-card" />
      <Skeleton className="h-56 w-full rounded-radius-card" />
      <Skeleton className="h-56 w-full rounded-radius-card" />
    </div>
  );
}

function ArrowLeftIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChildChecklistsPreparationView({
  tomorrow,
  checklistInstances,
  isLoading = false,
}: ChildChecklistsPreparationViewProps): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const [pendingItemId, setPendingItemId] = React.useState<string | null>(null);
  const [instances, setInstances] = React.useState<ChecklistInstanceSummary[]>(checklistInstances);
  const [validated, setValidated] = React.useState(false);

  React.useEffect(() => {
    setInstances(checklistInstances);
    setValidated(false);
  }, [checklistInstances]);

  const subtitle = React.useMemo(() => formatTomorrowSubtitle(tomorrow), [tomorrow]);

  const totalItems = React.useMemo(
    () => instances.reduce((sum, instance) => sum + instance.items.length, 0),
    [instances],
  );

  const checkedItems = React.useMemo(
    () =>
      instances.reduce(
        (sum, instance) => sum + instance.items.filter((item) => item.isChecked).length,
        0,
      ),
    [instances],
  );

  const isReadyToValidate = totalItems > 0 && checkedItems === totalItems;

  const handleToggleItem = React.useCallback(
    (itemId: string, isChecked: boolean) => {
      if (pendingItemId) {
        return;
      }

      if (!isOnline()) {
        toast.error("Mode hors-ligne actif.");
        return;
      }

      const previousState = instances;

      setPendingItemId(itemId);
      setInstances((current) =>
        current.map((instance) => ({
          ...instance,
          items: instance.items.map((item) =>
            item.id === itemId ? { ...item, isChecked } : item,
          ),
        })),
      );

      void (async () => {
        const result = await toggleChecklistInstanceItemAction({ itemId, isChecked });
        if (!result.success) {
          setInstances(previousState);
          setPendingItemId(null);
          toast.error("Impossible de cocher cet element.");
          haptic("error");
          return;
        }

        setPendingItemId(null);
        haptic("tap");
        router.refresh();
      })();
    },
    [instances, pendingItemId, router, toast],
  );

  const handleValidate = React.useCallback(() => {
    setValidated(true);
    toast.success("Preparation validee. Bravo.");
    haptic("success");
  }, [toast]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6 md:pb-8">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 p-5 text-white shadow-lg md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-3">
              <Link
                href="/child"
                className="inline-flex size-12 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white"
                aria-label="Retour"
              >
                <ArrowLeftIcon className="size-6" />
              </Link>
              <h1 className="font-display text-4xl font-black tracking-tight">
                Check-lists
              </h1>
            </div>
            <p className="text-lg font-semibold text-white/95">Preparation de la veille pour demain</p>
            <p className="text-sm font-medium text-white/85">{subtitle}</p>
          </div>
          <div className="rounded-2xl bg-white/95 px-4 py-3 text-slate-800 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progression</p>
            <p className="text-3xl font-black text-sky-700">
              {checkedItems}/{totalItems}
            </p>
          </div>
        </div>
      </header>

      {isLoading ? <PreparationSkeleton /> : null}

      {!isLoading ? (
        <>
          {instances.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon="CL"
                  title="Aucune checklist pour demain"
                  description="Le parent n'a rien programme pour la veille."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {instances.map((instance) => {
                const localChecked = instance.items.filter((item) => item.isChecked).length;
                const total = instance.items.length;
                const progress = total > 0 ? Math.round((localChecked / total) * 100) : 0;
                const remaining = Math.max(total - localChecked, 0);

                return (
                  <Card
                    key={instance.id}
                    className={cn(
                      "overflow-hidden rounded-3xl border-2 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg",
                      cardTone(instance.type),
                    )}
                  >
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="text-3xl" aria-hidden="true">
                            {typeEmoji(instance.type)}
                          </span>
                          <div className="min-w-0 space-y-1">
                            <h2 className="truncate text-xl font-black text-text-primary">
                              {instance.label}
                            </h2>
                            <div className="inline-flex rounded-radius-pill border border-border-default bg-white/70 px-2.5 py-1 text-xs font-semibold text-text-secondary">
                              {typeBadgeLabel(instance.type)}
                            </div>
                            <div className="inline-flex rounded-radius-pill border border-yellow-300 bg-yellow-100 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-yellow-700">
                              A preparer
                            </div>
                            <p className="text-sm text-text-secondary">
                              {remaining === 0
                                ? "Tout est pret."
                                : `${remaining} element${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-text-secondary">
                          {localChecked}/{total}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border-default/70 bg-white/80 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-bold text-text-primary">Ta progression</p>
                          <p className="text-sm font-black text-brand-primary">{progress}%</p>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        {instance.items.map((item) => (
                          <ChecklistItemRow
                            key={item.id}
                            label={item.label}
                            isChecked={item.isChecked}
                            disabled={pendingItemId === item.id}
                            onToggle={() => handleToggleItem(item.id, !item.isChecked)}
                          />
                        ))}
                      </div>

                      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 text-center text-white shadow-md">
                        <p className="text-xl font-black">
                          {remaining === 0
                            ? "Checklist completee !"
                            : `Encore ${remaining} item${remaining > 1 ? "s" : ""} !`}
                        </p>
                        <p className="text-sm font-semibold text-white/90">
                          {remaining === 0 ? "Bravo, on valide." : "Continue, tu y es presque."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {isReadyToValidate ? (
            <Card className="border-status-success/30 bg-status-success/10 shadow-card">
              <CardContent className="space-y-3 p-5">
                <Button
                  type="button"
                  size="lg"
                  variant="primary"
                  fullWidth
                  onClick={handleValidate}
                >
                  Valider la preparation
                </Button>
                {validated ? (
                  <p className="text-center text-sm font-semibold text-status-success">
                    Preparation du lendemain validee.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-sm font-medium text-text-secondary">
              Coche tous les elements pour afficher le bouton de validation.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}

