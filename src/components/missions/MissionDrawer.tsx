"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { getActivityVisual } from "@/components/child/icons/child-premium-icons";
import { Badge, Button, CategoryIcon } from "@/components/ds";
import { splitMissionInstructionsHtml } from "@/lib/day-templates/instructions";
import { cn } from "@/lib/utils";
import { getMissionStatusLabel } from "./mappers";
import type { MissionDrawerView, MissionUI } from "./types";

interface MissionDrawerProps {
  open: boolean;
  missions: MissionUI[];
  selectedMissionId: string | null;
  view: MissionDrawerView;
  onClose: () => void;
  onSelectMission: (missionId: string) => void;
  onViewChange: (view: MissionDrawerView) => void;
  onStart: (missionId: string) => void | Promise<void>;
  onPause: (missionId: string) => void | Promise<void>;
  onComplete: (missionId: string) => void | Promise<void>;
  onOpenFocus: (missionId: string) => void | Promise<void>;
  pendingMissionId?: string | null;
}

function statusBadgeVariant(status: MissionUI["status"]): "neutral" | "warning" | "success" {
  if (status === "in_progress") {
    return "warning";
  }

  if (status === "done") {
    return "success";
  }

  return "neutral";
}

function DrawerMissionList({
  missions,
  selectedMissionId,
  onSelectMission,
}: {
  missions: MissionUI[];
  selectedMissionId: string | null;
  onSelectMission: (missionId: string) => void;
}): React.JSX.Element {
  if (missions.length === 0) {
    return (
      <p className="rounded-[20px] border border-border-subtle bg-bg-surface px-4 py-4 text-sm text-text-secondary">
        Aucune mission disponible aujourd&apos;hui.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {missions.map((mission) => {
        const categoryVisual = getActivityVisual(mission.colorKey);

        return (
          <li key={mission.id}>
            <button
              type="button"
              onClick={() => onSelectMission(mission.id)}
              className={cn(
                "w-full rounded-[20px] border px-3.5 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                selectedMissionId === mission.id
                  ? "border-brand-primary/35 bg-brand-50/65"
                  : "border-border-subtle bg-bg-surface hover:bg-bg-surface-hover",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border",
                      categoryVisual.borderClass,
                      categoryVisual.softClass,
                      categoryVisual.iconToneClass,
                    )}
                    aria-label={mission.categoryName?.trim() ? `Categorie ${mission.categoryName.trim()}` : "Categorie mission"}
                  >
                    <CategoryIcon iconKey={mission.iconKey} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[1.05rem] font-semibold text-text-primary">{mission.title}</p>
                  </div>
                </div>
                <Badge variant={statusBadgeVariant(mission.status)}>{getMissionStatusLabel(mission.status)}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="neutral">{mission.estimatedMinutes} min</Badge>
                <Badge variant="info">+{mission.points} pts</Badge>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function MissionDrawer({
  open,
  missions,
  selectedMissionId,
  view,
  onClose,
  onSelectMission,
  onViewChange,
  onStart,
  onPause,
  onComplete,
  onOpenFocus,
  pendingMissionId = null,
}: MissionDrawerProps): React.JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = React.useState(false);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const lastFocusedElementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateLayout = (): void => {
      setIsDesktopLayout(mediaQuery.matches);
    };

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => {
      mediaQuery.removeEventListener("change", updateLayout);
    };
  }, []);

  React.useEffect(() => {
    if (!open) {
      if (lastFocusedElementRef.current) {
        lastFocusedElementRef.current.focus();
        lastFocusedElementRef.current = null;
      }
      return;
    }

    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const selectedMission = missions.find((mission) => mission.id === selectedMissionId) ?? null;
  const activeMission = view === "all" ? null : selectedMission;
  const showMissionList = view === "all" || !activeMission;
  const missionTitle = activeMission?.title?.trim() ?? "";
  const subkindLabel = activeMission?.itemSubkind?.trim() ?? "";
  const drawerTitle = missionTitle || "Mission";
  const categoryAriaLabel = activeMission?.categoryName?.trim()
    ? `Categorie ${activeMission.categoryName.trim()}`
    : "Categorie mission";

  const bulbTipText = React.useMemo(() => {
    const missionWithDescription = activeMission as (MissionUI & { description?: string | null }) | null;
    const raw = missionWithDescription?.description;

    if (typeof raw !== "string") {
      return null;
    }

    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [activeMission]);

  const instructionsSections = React.useMemo(
    () => splitMissionInstructionsHtml(activeMission?.instructionsHtml ?? ""),
    [activeMission?.instructionsHtml],
  );
  const categoryVisual = getActivityVisual(activeMission?.colorKey);
  const primaryAction = React.useMemo(() => {
    if (!activeMission) {
      return null;
    }

    if (activeMission.status === "todo") {
      return {
        onClick: () => void onStart(activeMission.id),
        disabled: pendingMissionId === activeMission.id,
      };
    }

    if (activeMission.status === "in_progress") {
      return {
        onClick: () => void onComplete(activeMission.id),
        disabled: pendingMissionId === activeMission.id,
      };
    }

    return {
      onClick: () => void onComplete(activeMission.id),
      disabled: true,
    };
  }, [activeMission, onComplete, onStart, pendingMissionId]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          data-testid="drawer-root"
          className={cn(
            "fixed inset-0 z-[72] bg-slate-900/34 backdrop-blur-[2px]",
            isDesktopLayout ? "flex items-center justify-start p-6" : "flex items-end justify-center px-2 pb-2 pt-6",
          )}
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Details mission"
            className={cn(
              "mission-card-surface mission-drawer-shell relative flex w-full min-h-0 flex-col overflow-hidden",
              isDesktopLayout
                ? "h-[calc(100dvh-48px)] max-h-[calc(100dvh-48px)] w-[clamp(480px,46vw,640px)] 2xl:w-[clamp(560px,44vw,720px)] rounded-[30px]"
                : "w-[92vw] max-h-[80vh] max-w-[560px] rounded-t-[30px]",
            )}
            onClick={(event) => event.stopPropagation()}
            initial={
              prefersReducedMotion
                ? false
                : isDesktopLayout
                  ? { x: -24, opacity: 0 }
                  : { y: 28, opacity: 0 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : isDesktopLayout
                  ? { x: 0, opacity: 1 }
                  : { y: 0, opacity: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : isDesktopLayout
                  ? { x: -24, opacity: 0 }
                  : { y: 28, opacity: 0 }
            }
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.2, ease: "easeOut" }}
            data-testid="mission-drawer"
          >
            <header
              className="mission-drawer-header sticky top-0 z-20 px-4 pb-2 pt-2.5 sm:px-5"
              data-testid="drawer-header"
            >
              {!isDesktopLayout ? (
                <div className="mx-auto mb-2.5 h-1.5 w-16 rounded-radius-pill bg-border-default" aria-hidden="true" />
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {activeMission ? (
                    <div className="flex min-w-0 items-start gap-3">
                      <span data-testid="drawer-category-icon" aria-label={categoryAriaLabel} className="shrink-0">
                        <span
                          className={cn(
                            "inline-flex h-12 w-12 items-center justify-center rounded-[16px] border",
                            categoryVisual.borderClass,
                            categoryVisual.softClass,
                            categoryVisual.iconToneClass,
                          )}
                          data-testid="mission-drawer-category-frame"
                        >
                          <CategoryIcon
                            iconKey={activeMission.iconKey}
                            className="size-8"
                            data-testid="mission-drawer-category-icon"
                            data-icon-key={activeMission.iconKey}
                          />
                        </span>
                      </span>
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex rounded-radius-pill border border-border-default bg-bg-surface px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                            Mission du jour
                          </span>
                        </div>
                        <h2 className="truncate font-display text-[clamp(1.72rem,2.8vw,2.25rem)] font-black tracking-tight text-text-primary">
                          {drawerTitle}
                        </h2>
                        {subkindLabel ? (
                          <Badge variant="neutral" className="w-fit text-xs" data-testid="drawer-subkind-pill">
                            {subkindLabel}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <h2 className="mt-1 font-display text-[1.7rem] font-black tracking-[0.01em] text-text-primary">
                      Toutes les missions
                    </h2>
                  )}
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Fermer"
                  data-testid="drawer-close"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-pill border border-border-default bg-bg-surface text-sm font-semibold text-text-secondary transition-colors duration-200 hover:bg-bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  onClick={onClose}
                >
                  <span aria-hidden="true" className="text-xl leading-none">
                    X
                  </span>
                </button>
              </div>

              {activeMission ? (
                <div className="mission-drawer-meta mt-2" data-testid="drawer-meta-row">
                  <span className="mission-drawer-chip mission-drawer-chip-time" data-testid="drawer-meta-time">
                    <span aria-hidden="true" className="mission-drawer-chip-icon">
                      {"\u23F1\uFE0F"}
                    </span>
                    {activeMission.estimatedMinutes} min estimees
                  </span>
                  <span className="mission-drawer-chip mission-drawer-chip-points" data-testid="drawer-meta-points">
                    <span aria-hidden="true" className="mission-drawer-chip-icon">
                      {"\u{1F3C5}"}
                    </span>
                    +{activeMission.points} pts
                  </span>
                  <Badge
                    variant={statusBadgeVariant(activeMission.status)}
                    className="mission-drawer-chip mission-drawer-chip-status"
                    data-testid="drawer-meta-status"
                  >
                    {getMissionStatusLabel(activeMission.status)}
                  </Badge>
                </div>
              ) : null}

              {missions.length > 4 ? (
                <div className="mt-2 inline-flex rounded-radius-pill border border-border-default bg-bg-surface p-1">
                  <button
                    type="button"
                    className={cn(
                      "min-h-touch-sm rounded-radius-pill px-3 text-sm font-semibold",
                      view === "mission" ? "bg-brand-50 text-brand-primary" : "text-text-secondary",
                    )}
                    onClick={() => onViewChange("mission")}
                  >
                    Mission
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "min-h-touch-sm rounded-radius-pill px-3 text-sm font-semibold",
                      view === "all" ? "bg-brand-50 text-brand-primary" : "text-text-secondary",
                    )}
                    onClick={() => onViewChange("all")}
                  >
                    Toutes ({missions.length})
                  </button>
                </div>
              ) : null}
            </header>

            <div
              className="mission-drawer-body min-h-0 flex-1 overflow-y-auto px-4 py-2 pr-3 sm:px-5"
              data-testid="mission-drawer-scroll"
            >
              {showMissionList ? (
                <DrawerMissionList
                  missions={missions}
                  selectedMissionId={selectedMissionId}
                  onSelectMission={(missionId) => {
                    onSelectMission(missionId);
                    onViewChange("mission");
                  }}
                />
              ) : (
                <div className="space-y-2 pb-1">
                  <section
                    className="mission-drawer-surface mission-drawer-instructions-panel p-4 sm:p-4.5"
                    data-testid="drawer-instructions-panel"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-radius-button border border-brand-primary/20 bg-brand-50/75 text-brand-primary"
                        data-testid="drawer-instructions-icon"
                      >
                        <span aria-hidden="true">{"\u{1F4CC}"}</span>
                      </span>
                      <h3 className="font-display text-[1.3rem] font-black tracking-tight text-text-primary">
                        Ce que tu dois faire
                      </h3>
                    </div>
                    <div className="mission-drawer-instruction-cards" data-testid="drawer-instructions-cards">
                      <div className="mission-drawer-instructions-white-block" data-testid="drawer-instructions-white-block">
                        <div
                          className="mission-drawer-richtext"
                          data-testid="mission-drawer-instructions"
                          dangerouslySetInnerHTML={{ __html: instructionsSections.mainInstructionsHtml }}
                        />
                      </div>
                    </div>
                  </section>

                  {instructionsSections.tipHtml ? (
                    <section className="mission-drawer-tip-surface p-4 sm:p-4.5" data-testid="mission-drawer-tip">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-radius-button border border-status-info/25 bg-status-info/15 text-status-info">
                          <CategoryIcon iconKey="health" className="size-5" />
                        </span>
                        <h3 className="font-display text-[1.15rem] font-black tracking-tight text-text-primary">
                          Astuce
                        </h3>
                      </div>
                      <div
                        className="mission-drawer-richtext mt-3.5 space-y-3"
                        dangerouslySetInnerHTML={{ __html: instructionsSections.tipHtml }}
                      />
                    </section>
                  ) : null}

                  {bulbTipText ? (
                    <section className="mission-drawer-tip-row" data-testid="drawer-bulb-tip">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-radius-pill border border-status-warning/30 bg-status-warning/15 text-status-warning">
                        <span aria-hidden="true">{"\u{1F4A1}"}</span>
                      </span>
                      <p className="truncate text-sm font-medium text-text-primary">{bulbTipText}</p>
                    </section>
                  ) : null}

                  {activeMission.helpLinks.length > 0 ? (
                    <section className="mission-drawer-revision-surface space-y-2" data-testid="drawer-revision-section">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">{"\u{1F4DA}"}</span>
                        <h3 className="font-display text-[1.16rem] font-black tracking-tight text-text-primary">
                          Fiches de revision
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeMission.helpLinks.slice(0, 3).map((link) => (
                          <a
                            key={link.id}
                            href={link.href}
                            className="inline-flex min-h-touch-sm items-center rounded-radius-pill border border-brand-primary/20 bg-brand-50/70 px-3.5 text-sm font-semibold text-brand-primary"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="inline-flex text-sm font-semibold text-brand-primary hover:underline"
                      >
                        Voir toutes les fiches {"\u2192"}
                      </button>
                    </section>
                  ) : null}
                </div>
              )}
            </div>

            {activeMission ? (
              <footer
                className="mission-drawer-footer sticky bottom-0 z-20 space-y-2.5 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 sm:px-5 sm:pb-2.5"
                data-testid="mission-drawer-footer"
              >
                <div className="mission-drawer-cta-stack">
                  {primaryAction ? (
                    <Button
                      size="lg"
                      className="mission-drawer-cta-primary mission-drawer-cta-pill w-full from-brand-secondary to-status-success font-black"
                      onClick={primaryAction.onClick}
                      disabled={primaryAction.disabled}
                      data-testid="drawer-cta-start"
                    >
                      <span data-testid="drawer-cta-start-icon" aria-hidden="true" className="text-base leading-none">
                        {"\u25B6"}
                      </span>
                      <span>Commencer la mission</span>
                    </Button>
                  ) : null}

                  {activeMission.status === "in_progress" ? (
                    <Button
                      size="md"
                      variant="tertiary"
                      className="mission-drawer-cta-pill w-full text-base"
                      onClick={() => void onPause(activeMission.id)}
                      disabled={pendingMissionId === activeMission.id}
                    >
                      Mettre en pause
                    </Button>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="md"
                      variant="secondary"
                      className="mission-drawer-cta-secondary mission-drawer-cta-pill w-full text-base"
                      onClick={() => void onOpenFocus(activeMission.id)}
                      disabled={pendingMissionId === activeMission.id}
                      data-testid="drawer-cta-focus"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true">{"\u{1F3AF}"}</span>
                        <span>Focus</span>
                      </span>
                    </Button>
                    <Button
                      size="md"
                      variant="tertiary"
                      className="mission-drawer-cta-secondary mission-drawer-cta-pill w-full text-base"
                      onClick={onClose}
                      data-testid="drawer-cta-cancel"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true">{"\u2715"}</span>
                        <span>Annuler</span>
                      </span>
                    </Button>
                  </div>
                </div>
              </footer>
            ) : null}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
