"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScaleOnTap } from "@/components/motion";
import { cn } from "@/lib/utils";

export interface MoreMenuItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
}

interface MoreMenuProps {
  open: boolean;
  onClose: () => void;
  items: MoreMenuItem[];
}

export function MoreMenu({ open, onClose, items }: MoreMenuProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const overlayMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  const sheetMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 28 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  const handleItemClick = React.useCallback(
    (href: string) => {
      if (typeof window !== "undefined" && window.location.pathname === href) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-50" {...overlayMotionProps}>
          <button
            type="button"
            className="absolute inset-0 bg-bg-base/60 backdrop-blur-sm"
            aria-label="Fermer le menu plus"
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 rounded-t-[28px] border border-border-default/80 bg-gradient-to-b from-bg-surface to-bg-surface-hover/80 p-3 pb-safe shadow-elevated backdrop-blur-md"
            {...sheetMotionProps}
          >
            <p className="mb-2 px-2 text-sm font-bold text-text-secondary">Plus</p>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.href}>
                  <ScaleOnTap className="block">
                    <Link
                      href={item.href}
                      onClick={() => handleItemClick(item.href)}
                      className={cn(
                        "flex h-[58px] items-center gap-3 rounded-radius-button px-3 text-base font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                        item.isActive
                          ? "bg-brand-primary/14 text-brand-primary"
                          : "text-text-primary hover:bg-bg-surface-hover",
                      )}
                    >
                      <span aria-hidden="true" className="inline-flex size-6 items-center justify-center [&_svg]:size-5">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </ScaleOnTap>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
