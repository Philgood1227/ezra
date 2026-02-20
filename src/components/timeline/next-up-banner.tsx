"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface BannerTask {
  title: string;
  icon: string;
  startTime?: string;
  endTime?: string;
}

interface NextUpBannerProps {
  currentTask?: BannerTask | null;
  nextTask?: BannerTask | null;
  currentMessage?: string;
  className?: string;
}

function buildBannerLines(input: {
  currentTask: BannerTask | null;
  nextTask: BannerTask | null;
  currentMessage?: string;
}): { key: string; lines: string[] } {
  if (input.currentMessage) {
    if (input.nextTask) {
      return {
        key: `context-${input.nextTask.title}`,
        lines: [input.currentMessage, `Ensuite: ${input.nextTask.title} a ${input.nextTask.startTime ?? "--:--"}`],
      };
    }

    return {
      key: "context-only",
      lines: [input.currentMessage],
    };
  }

  if (input.currentTask) {
    const nowLine = `Maintenant: ${input.currentTask.title} jusqu'a ${input.currentTask.endTime ?? "--:--"}`;
    if (input.nextTask) {
      return {
        key: `${input.currentTask.title}-${input.nextTask.title}`,
        lines: [nowLine, `Ensuite: ${input.nextTask.title} a ${input.nextTask.startTime ?? "--:--"}`],
      };
    }

    return { key: `${input.currentTask.title}-now`, lines: [nowLine] };
  }

  if (input.nextTask) {
    return {
      key: `${input.nextTask.title}-next`,
      lines: [`Ensuite: ${input.nextTask.title} a ${input.nextTask.startTime ?? "--:--"}`],
    };
  }

  return { key: "empty", lines: ["Rien pour le moment"] };
}

export function NextUpBanner({
  currentTask = null,
  nextTask = null,
  currentMessage,
  className,
}: NextUpBannerProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const content = currentMessage
    ? buildBannerLines({ currentTask, nextTask, currentMessage })
    : buildBannerLines({ currentTask, nextTask });

  return (
    <section
      className={cn(
        "rounded-radius-card border border-border-subtle bg-bg-surface/95 px-4 py-3 shadow-card",
        className,
      )}
      aria-live="polite"
      aria-label="Maintenant et ensuite"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={content.key}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: prefersReducedMotion ? 0.12 : 0.24, ease: "easeOut" }}
          className="space-y-1.5"
        >
          {content.lines.map((line) => (
            <p key={line} className="text-base font-semibold leading-snug text-text-primary sm:text-[1.02rem]">
              {line}
            </p>
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
