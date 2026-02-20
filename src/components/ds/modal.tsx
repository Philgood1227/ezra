"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  closeLabel?: string;
  className?: string;
  children: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  closeLabel = "Fermer",
  className,
  children,
}: ModalProps): React.JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);

  const overlayMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  const contentMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 24 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

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

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={onClose}
          {...overlayMotionProps}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Fenetre modale"}
            className={cn(
              "relative w-full max-w-lg rounded-radius-card border border-border-subtle bg-bg-surface/85 p-6 shadow-elevated backdrop-blur-md",
              className,
            )}
            onClick={(event) => event.stopPropagation()}
            {...contentMotionProps}
          >
            <button
              type="button"
              aria-label={closeLabel}
              onClick={onClose}
              className="absolute right-3 top-3 inline-flex h-touch-sm w-touch-sm items-center justify-center rounded-radius-pill text-text-secondary transition-colors duration-200 hover:bg-bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <span aria-hidden="true">x</span>
            </button>

            {title ? <h2 className="pr-12 text-xl font-bold text-text-primary">{title}</h2> : null}
            {description ? <p className="mt-1 pr-12 text-sm text-text-secondary">{description}</p> : null}
            <div className={cn(title || description ? "mt-4" : "", "text-text-primary")}>{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
