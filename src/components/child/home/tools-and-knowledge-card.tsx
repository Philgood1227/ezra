"use client";

import Link from "next/link";
import { ArrowRightIcon, DayPlannerIcon, KnowledgeIcon } from "@/components/child/icons/child-premium-icons";
import { Card, CardContent } from "@/components/ds";
import { ScaleOnTap } from "@/components/motion";
import { cn } from "@/lib/utils";

interface ToolsAndKnowledgeCardProps {
  className?: string;
}

function ToolLink({
  href,
  title,
  icon,
  iconTestId,
  iconToneClassName,
  testId,
}: {
  href: string;
  title: string;
  icon: React.JSX.Element;
  iconTestId: string;
  iconToneClassName: string;
  testId: string;
}): React.JSX.Element {
  return (
    <ScaleOnTap className="block w-full" scale={0.98}>
      <Link
        href={href}
        data-testid={testId}
        className={cn(
          "group flex min-h-touch-lg w-full items-center gap-3 rounded-radius-card border border-border-default bg-gradient-to-br from-bg-surface to-brand-50/16 px-4 py-2.5 text-left shadow-card transition-[transform,box-shadow,border-color,filter] duration-200 hover:border-brand-primary/26 hover:shadow-glass active:shadow-card md:px-3 xl:px-4",
        )}
      >
        <span
          data-testid={iconTestId}
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-radius-pill border shadow-card md:size-9 xl:size-10",
            iconToneClassName,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 text-base font-bold leading-tight text-text-primary md:text-sm xl:text-base">{title}</span>
        <span className="inline-flex size-7 items-center justify-center rounded-radius-pill border border-border-subtle bg-bg-surface/85 text-text-secondary transition-colors duration-200 group-hover:text-brand-primary">
          <ArrowRightIcon className="size-3.5" />
        </span>
      </Link>
    </ScaleOnTap>
  );
}

export function ToolsAndKnowledgeCard({ className }: ToolsAndKnowledgeCardProps): React.JSX.Element {
  return (
    <Card
      className={cn(
        "border-border-default bg-bg-surface/95 p-4 shadow-card md:p-3.5 xl:p-4",
        className,
      )}
      data-testid="tools-and-knowledge-card"
    >
      <CardContent className="space-y-2.5">
        <h2 className="font-display text-xl font-bold tracking-tight text-text-primary md:text-lg xl:text-xl">{"Pour t'aider"}</h2>

        <div className="grid gap-2.5">
          <ToolLink
            href="/child/knowledge"
            title="Fiches"
            icon={<KnowledgeIcon className="size-6" />}
            iconTestId="tools-link-knowledge-icon"
            iconToneClassName="border-brand-primary/25 bg-brand-primary/12 text-brand-primary"
            testId="tools-link-knowledge"
          />
          <ToolLink
            href="/child/my-day"
            title="Outils"
            icon={<DayPlannerIcon className="size-6" />}
            iconTestId="tools-link-focus-icon"
            iconToneClassName="border-brand-secondary/30 bg-brand-secondary/15 text-brand-secondary"
            testId="tools-link-focus"
          />
        </div>
      </CardContent>
    </Card>
  );
}
