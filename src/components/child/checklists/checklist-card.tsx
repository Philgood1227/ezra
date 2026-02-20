"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChecklistIcon as PremiumChecklistIcon,
  DayPlannerIcon,
  HomeIcon,
  SwimIcon,
  TreeIcon,
  type ChildIconProps,
} from "@/components/child/icons/child-premium-icons";
import { Badge, Card, CardContent, CardHeader } from "@/components/ds";
import { ChecklistItemRow } from "@/components/child/checklists/checklist-item-row";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/utils/haptic";
import { playSound } from "@/lib/utils/sounds";
import type { ChecklistInstanceItemSummary } from "@/lib/day-templates/types";

interface ChecklistCardProps {
  label: string;
  type: string;
  items: ChecklistInstanceItemSummary[];
  progress: number;
  onToggleItem: (itemId: string, checked: boolean) => void;
  pendingItemId?: string | null;
  defaultExpanded?: boolean;
}

type ChecklistTypeStyle = {
  border: string;
  iconToneClass: string;
  Icon: (props: ChildIconProps) => React.JSX.Element;
};

const TYPE_STYLES: Record<string, ChecklistTypeStyle> = {
  piscine: { border: "border-l-status-info", iconToneClass: "text-status-info", Icon: SwimIcon },
  sortie: { border: "border-l-status-success", iconToneClass: "text-status-success", Icon: TreeIcon },
  evaluation: { border: "border-l-status-warning", iconToneClass: "text-status-warning", Icon: DayPlannerIcon },
  quotidien: { border: "border-l-brand-primary", iconToneClass: "text-brand-primary", Icon: HomeIcon },
  autre: { border: "border-l-category-calme", iconToneClass: "text-category-calme", Icon: PremiumChecklistIcon },
};

function getTypeStyle(type: string): ChecklistTypeStyle {
  const fallback = TYPE_STYLES.autre;
  if (!fallback) {
    return {
      border: "border-l-border-default",
      iconToneClass: "text-text-secondary",
      Icon: PremiumChecklistIcon,
    };
  }

  return TYPE_STYLES[type] ?? fallback;
}

export function ChecklistCard({
  label,
  type,
  items,
  progress,
  onToggleItem,
  pendingItemId = null,
  defaultExpanded = true,
}: ChecklistCardProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [isCelebrating, setIsCelebrating] = React.useState(false);
  const previousAllCheckedRef = React.useRef(false);
  const typeStyle = getTypeStyle(type);

  const totalItems = items.length;
  const checkedItems = items.filter((item) => item.isChecked).length;
  const allChecked = totalItems > 0 && checkedItems === totalItems;

  React.useEffect(() => {
    if (allChecked && !previousAllCheckedRef.current) {
      setIsCelebrating(true);
      haptic("success");
      playSound("checklistComplete");
      const timeoutId = window.setTimeout(() => setIsCelebrating(false), 500);
      previousAllCheckedRef.current = true;

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    previousAllCheckedRef.current = allChecked;
    return undefined;
  }, [allChecked]);

  const Icon = typeStyle.Icon;

  return (
    <motion.div
      initial={false}
      animate={
        isCelebrating && !prefersReducedMotion
          ? { scale: [1, 1.02, 1] }
          : { scale: 1 }
      }
      transition={{ duration: 0.32, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "border-l-4 p-0",
          allChecked ? "border-l-status-success" : typeStyle.border,
          allChecked ? "bg-status-success/10" : "",
        )}
      >
        <CardHeader className="mb-0 p-0">
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="flex w-full items-center justify-between gap-3 rounded-t-2xl px-4 py-3 text-left transition-colors duration-200 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            aria-expanded={isExpanded}
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-radius-pill border border-border-subtle bg-bg-surface",
                    typeStyle.iconToneClass,
                  )}
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <p className="text-sm font-black text-text-primary">{label}</p>
              </div>
              {allChecked ? (
                <p className="text-xs font-semibold text-status-success">Tout est pret</p>
              ) : (
                <p className="text-xs text-text-secondary">{checkedItems}/{totalItems} etapes</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={allChecked ? "success" : "info"}>
                {checkedItems}/{totalItems}
              </Badge>
              <span className="text-xs font-semibold text-text-secondary" aria-hidden="true">
                {isExpanded ? "^" : "v"}
              </span>
            </div>
          </button>
        </CardHeader>

        <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.div
              key="content"
              initial={prefersReducedMotion ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={prefersReducedMotion ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.22, ease: "easeOut" }}
            >
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="h-2 w-full overflow-hidden rounded-radius-pill bg-bg-surface-hover">
                  <div className="h-full rounded-radius-pill bg-brand-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>

                {items.length === 0 ? (
                  <p className="text-sm text-text-secondary">Aucune etape pour cette checklist.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <ChecklistItemRow
                        key={item.id}
                        label={item.label}
                        isChecked={item.isChecked}
                        disabled={pendingItemId === item.id}
                        onToggle={() => onToggleItem(item.id, !item.isChecked)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
