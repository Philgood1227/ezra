import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  errorMessage?: string | undefined;
  successMessage?: string | undefined;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    className,
    errorMessage,
    successMessage,
    ...props
  }: TextAreaProps,
  ref,
): React.JSX.Element {
  const isInvalid = props["aria-invalid"] === true || props["aria-invalid"] === "true" || Boolean(errorMessage);
  const isSuccess = !isInvalid && Boolean(successMessage);

  return (
    <div className="space-y-1.5">
      <textarea
        ref={ref}
        className={cn(
          "min-h-32 w-full rounded-radius-button border bg-bg-surface px-3 py-2.5 text-sm text-text-primary shadow-card outline-none transition-all duration-200 placeholder:text-text-muted focus:border-transparent focus:ring-2 disabled:cursor-not-allowed disabled:bg-bg-surface-hover disabled:text-text-muted",
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
});
