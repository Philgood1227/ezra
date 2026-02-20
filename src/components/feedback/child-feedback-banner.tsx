import { cn } from "@/lib/utils";

type ChildFeedbackTone = "info" | "success" | "error";

interface ChildFeedbackBannerProps {
  message: string;
  tone?: ChildFeedbackTone;
}

const toneClasses: Record<ChildFeedbackTone, string> = {
  info: "border-accent-200 bg-accent-50 text-accent-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

function getAriaLive(tone: ChildFeedbackTone): "polite" | "assertive" {
  return tone === "error" ? "assertive" : "polite";
}

export function ChildFeedbackBanner({
  message,
  tone = "info",
}: ChildFeedbackBannerProps): React.JSX.Element {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      aria-live={getAriaLive(tone)}
      aria-atomic="true"
      className={cn("rounded-xl border px-3 py-2 text-sm font-semibold", toneClasses[tone])}
    >
      {message}
    </p>
  );
}
