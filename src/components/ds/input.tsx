import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  errorMessage?: string | undefined;
  successMessage?: string | undefined;
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

export function Input({
  className,
  errorMessage,
  successMessage,
  ...props
}: InputProps): React.JSX.Element {
  const isInvalid = props["aria-invalid"] === true || props["aria-invalid"] === "true" || Boolean(errorMessage);
  const isSuccess = !isInvalid && Boolean(successMessage);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          className={cn(
            "h-touch-md w-full rounded-radius-button border bg-bg-surface px-3 text-sm text-text-primary shadow-card outline-none transition-all duration-200 placeholder:text-text-muted focus:border-transparent focus:ring-2 disabled:cursor-not-allowed disabled:bg-bg-surface-hover disabled:text-text-muted",
            isInvalid
              ? "border-status-error focus:ring-status-error"
              : isSuccess
                ? "border-status-success pr-9 focus:ring-status-success"
                : "border-border-default focus:ring-brand-primary",
            className,
          )}
          aria-invalid={isInvalid || undefined}
          {...props}
        />
        {isSuccess ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-status-success">
            <SuccessIcon />
          </span>
        ) : null}
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
