"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";
type ToastPosition = "bottom-center" | "top-right";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastOptions {
  duration?: number;
}

interface ToastContextValue {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
}

interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
}

const TOAST_DURATION = 4000;
const ToastContext = React.createContext<ToastContextValue | null>(null);

function toastTheme(type: ToastType): string {
  switch (type) {
    case "success":
      return "border-status-success/35 bg-status-success/20 text-status-success";
    case "error":
      return "border-status-error/35 bg-status-error/20 text-status-error";
    case "warning":
      return "border-status-warning/35 bg-status-warning/20 text-status-warning";
    case "info":
    default:
      return "border-status-info/35 bg-status-info/20 text-status-info";
  }
}

function toastIcon(type: ToastType): string {
  switch (type) {
    case "success":
      return "+";
    case "error":
      return "x";
    case "warning":
      return "!";
    case "info":
    default:
      return "i";
  }
}

export function ToastProvider({
  children,
  position = "bottom-center",
}: ToastProviderProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const timeoutMapRef = React.useRef<Map<string, number>>(new Map());

  const itemMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 22 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  const dismiss = React.useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));

    const timeoutId = timeoutMapRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutMapRef.current.delete(id);
    }
  }, []);

  const pushToast = React.useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const nextToast: ToastItem = { id, type, message };

      setToasts((currentToasts) => [...currentToasts, nextToast]);

      const timeoutId = window.setTimeout(() => {
        dismiss(id);
      }, options?.duration ?? TOAST_DURATION);

      timeoutMapRef.current.set(id, timeoutId);
    },
    [dismiss],
  );

  React.useEffect(() => {
    const timeoutMap = timeoutMapRef.current;

    return () => {
      timeoutMap.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutMap.clear();
    };
  }, []);

  const contextValue = React.useMemo<ToastContextValue>(
    () => ({
      success: (message, options) => pushToast("success", message, options),
      error: (message, options) => pushToast("error", message, options),
      info: (message, options) => pushToast("info", message, options),
      warning: (message, options) => pushToast("warning", message, options),
      dismiss,
    }),
    [dismiss, pushToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className={cn(
          "pointer-events-none fixed z-[70] flex w-full max-w-sm flex-col gap-2 px-3",
          position === "bottom-center" ? "bottom-3 left-1/2 -translate-x-1/2" : "right-4 top-4 w-auto",
        )}
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.article
              key={toast.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-radius-card border px-4 py-3 shadow-elevated backdrop-blur-md",
                toastTheme(toast.type),
              )}
              {...itemMotionProps}
            >
              <span aria-hidden="true" className="mt-0.5 text-xs font-bold leading-none">
                {toastIcon(toast.type)}
              </span>
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-radius-pill text-current/80 transition-colors hover:bg-bg-surface-hover hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                onClick={() => dismiss(toast.id)}
                aria-label="Fermer la notification"
              >
                x
              </button>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast doit etre utilise dans un ToastProvider.");
  }

  return context;
}
