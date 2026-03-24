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
  fullscreen?: boolean;
  children: React.ReactNode;
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="M18 6 6 18m0-12 12 12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  closeLabel = "Fermer",
  className,
  fullscreen = false,
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
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            fullscreen
              ? "flex items-stretch justify-stretch p-0"
              : "flex items-end justify-center p-4 sm:items-center",
          )}
          onClick={onClose}
          {...overlayMotionProps}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Fenetre modale"}
            className={cn(
              fullscreen
                ? "relative h-dvh w-screen overflow-y-auto border-none bg-bg-surface p-6 shadow-none backdrop-blur-none"
                : "relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-radius-card border border-border-subtle bg-bg-surface/85 p-6 shadow-elevated backdrop-blur-md",
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
              <CloseIcon />
            </button>

            {title ? (
              <h2 className="pr-12 text-lg font-semibold leading-none text-text-primary">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 pr-12 text-sm text-text-secondary">{description}</p>
            ) : null}
            <div className={cn(title || description ? "mt-4" : "", "text-text-primary")}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
