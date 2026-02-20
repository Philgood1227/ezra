import { cn } from "@/lib/utils";

type ParentFeedbackTone = "info" | "success" | "warning" | "error";

interface ParentFeedbackBannerProps {
  message: string;
  tone?: ParentFeedbackTone;
}

const toneClasses: Record<ParentFeedbackTone, string> = {
  info: "border-status-info/35 bg-status-info/10 text-text-primary",
  success: "border-status-success/35 bg-status-success/10 text-text-primary",
  warning: "border-status-warning/35 bg-status-warning/10 text-text-primary",
  error: "border-status-error/35 bg-status-error/10 text-text-primary",
};

function getAriaLive(tone: ParentFeedbackTone): "polite" | "assertive" {
  return tone === "error" ? "assertive" : "polite";
}

export function ParentFeedbackBanner({
  message,
  tone = "info",
}: ParentFeedbackBannerProps): React.JSX.Element {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      aria-live={getAriaLive(tone)}
      aria-atomic="true"
      className={cn("rounded-radius-button border px-3 py-2 text-sm font-semibold", toneClasses[tone])}
    >
      {message}
    </p>
  );
}
