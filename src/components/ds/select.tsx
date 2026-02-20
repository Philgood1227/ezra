import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  errorMessage?: string | undefined;
  successMessage?: string | undefined;
}

function ChevronIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
      <path
        d="M5.2 7.7a1 1 0 0 1 1.4 0L10 11l3.4-3.3a1 1 0 1 1 1.4 1.4l-4.1 4a1 1 0 0 1-1.4 0l-4.1-4a1 1 0 0 1 0-1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SuccessIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.55 16.2 5.6 12.25a1 1 0 1 0-1.4 1.42l4.66 4.66a1 1 0 0 0 1.4 0l9.55-9.55a1 1 0 0 0-1.42-1.4l-8.84 8.82Z"
      />
    </svg>
  );
}

export function Select({
  className,
  errorMessage,
  successMessage,
  ...props
}: SelectProps): React.JSX.Element {
  const isInvalid = props["aria-invalid"] === true || props["aria-invalid"] === "true" || Boolean(errorMessage);
  const isSuccess = !isInvalid && Boolean(successMessage);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <select
          className={cn(
            "h-touch-md w-full appearance-none rounded-radius-button border bg-bg-surface px-3 pr-9 text-sm text-text-primary shadow-card outline-none transition-all duration-200 focus:border-transparent focus:ring-2 disabled:cursor-not-allowed disabled:bg-bg-surface-hover disabled:text-text-muted",
            isInvalid
              ? "border-status-error focus:ring-status-error"
              : isSuccess
                ? "border-status-success focus:ring-status-success"
                : "border-border-default focus:ring-brand-primary",
            className,
          )}
          aria-invalid={isInvalid || undefined}
          {...props}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-text-muted">
          {isSuccess ? <SuccessIcon /> : <ChevronIcon />}
        </span>
      </div>
      {isInvalid && errorMessage ? (
        <p role="alert" className="text-xs font-medium text-status-error">
          {errorMessage}
        </p>
      ) : null}
      {!isInvalid && successMessage ? (
        <p className="text-xs font-medium text-status-success">{successMessage}</p>
      ) : null}
    </div>
  );
}
