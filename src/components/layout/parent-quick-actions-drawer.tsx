"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ds";
import { parentModuleGroups, isParentModuleTabActive } from "@/lib/navigation/parent-module-nav";

interface ParentQuickActionsDrawerProps {
  open: boolean;
  pathname: string;
  onClose: () => void;
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ParentQuickActionsDrawer({
  open,
  pathname,
  onClose,
}: ParentQuickActionsDrawerProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80]"
          {...(prefersReducedMotion
            ? {}
            : {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
                transition: { duration: 0.18, ease: "easeOut" as const },
              })}
        >
          <button
            type="button"
            className="absolute inset-0 bg-bg-base/65 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Fermer les actions rapides"
          />

          <motion.aside
            className="absolute right-0 top-0 h-full w-full max-w-[420px] border-l border-border-subtle bg-bg-elevated p-4 shadow-elevated sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Actions rapides parent"
            {...(prefersReducedMotion
              ? {}
              : {
                  initial: { x: 26, opacity: 0.9 },
                  animate: { x: 0, opacity: 1 },
                  exit: { x: 26, opacity: 0.9 },
                  transition: { duration: 0.2, ease: "easeOut" as const },
                })}
          >
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-black tracking-tight text-text-primary">
                    Actions rapides
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Acces direct aux ecrans parent les plus utilises.
                  </p>
                </div>
                <Button type="button" size="sm" variant="glass" onClick={onClose}>
                  <CloseIcon />
                  Fermer
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {parentModuleGroups.map((group) => (
                  <Card key={group.id} surface={group.id === "essential" ? "child" : "glass"}>
                    <CardHeader className="mb-2">
                      <CardTitle className="text-lg">{group.label}</CardTitle>
                      <CardDescription>Raccourcis contextuels du module.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      {group.tabs.map((tab) => {
                        const active = isParentModuleTabActive(pathname, tab);
                        return (
                          <Link key={tab.id} href={tab.href} onClick={onClose}>
                            <Button fullWidth variant={active ? "premium" : "glass"}>
                              {tab.label}
                            </Button>
                          </Link>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

