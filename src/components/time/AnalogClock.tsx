"use client";

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AnalogClockProps {
  date: Date;
  showSeconds?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface PolarPoint {
  x: number;
  y: number;
}

const SIZE_CLASS_BY_VARIANT: Record<NonNullable<AnalogClockProps["size"]>, string> = {
  sm: "w-full max-w-[180px] aspect-square",
  md: "w-full max-w-[240px] aspect-square",
  lg: "w-full max-w-[300px] aspect-square",
};

const HOUR_NUMBER_COLORS = [
  "fill-status-error",
  "fill-status-error",
  "fill-status-warning",
  "fill-category-sport",
  "fill-category-repas",
  "fill-status-success",
  "fill-brand-secondary",
  "fill-status-info",
  "fill-brand-primary",
  "fill-category-ecole",
  "fill-category-calme",
  "fill-category-loisir",
] as const;

const HOUR_24_COLORS = [
  "fill-status-error/85",
  "fill-status-error/85",
  "fill-status-warning/85",
  "fill-category-sport/85",
  "fill-category-repas/85",
  "fill-status-success/85",
  "fill-brand-secondary/85",
  "fill-status-info/85",
  "fill-brand-primary/85",
  "fill-category-ecole/85",
  "fill-category-calme/85",
  "fill-category-loisir/85",
] as const;

function toRadians(degrees: number): number {
  return ((degrees - 90) * Math.PI) / 180;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function polarToCartesian(angleDegrees: number, radius: number): PolarPoint {
  const radians = toRadians(angleDegrees);
  return {
    x: roundCoordinate(50 + radius * Math.cos(radians)),
    y: roundCoordinate(50 + radius * Math.sin(radians)),
  };
}

function toClockAriaLabel(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `Horloge analogique ${hours}:${minutes}`;
}

function getHour24Equivalent(hour12: number): number {
  return hour12 === 12 ? 24 : hour12 + 12;
}

export function AnalogClock({
  date,
  showSeconds = true,
  size = "lg",
  className,
}: AnalogClockProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const hourAngle = (hours24 % 12 + minutes / 60 + seconds / 3600) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;
  const handTransition = prefersReducedMotion ? undefined : "transform 280ms linear";
  const secondTransition = prefersReducedMotion ? undefined : "transform 140ms linear";
  const ariaLabel = toClockAriaLabel(date);

  return (
    <section
      aria-label={ariaLabel}
      data-testid="analog-clock-container"
      className={cn(
        "mx-auto flex w-full items-center justify-center overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface p-3 shadow-card",
        className,
      )}
    >
      <svg viewBox="0 0 100 100" role="img" className={SIZE_CLASS_BY_VARIANT[size]}>
        <title>{ariaLabel}</title>

        <circle cx="50" cy="50" r="48" className="fill-bg-surface stroke-border-default stroke-[1.2]" />
        <circle cx="50" cy="50" r="40.5" className="fill-bg-surface-hover/50 stroke-border-subtle stroke-[0.7]" />

        {Array.from({ length: 60 }, (_, index) => {
          const angle = index * 6;
          const outer = polarToCartesian(angle, 47.2);
          const inner = polarToCartesian(angle, index % 5 === 0 ? 43.5 : 45.3);

          return (
            <line
              key={`tick-${index}`}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              className={index % 5 === 0 ? "stroke-border-default" : "stroke-border-subtle"}
              strokeWidth={index % 5 === 0 ? 0.85 : 0.38}
              strokeLinecap="round"
            />
          );
        })}

        {Array.from({ length: 12 }, (_, index) => {
          const minuteLabel = index === 0 ? 60 : index * 5;
          const point = polarToCartesian(index * 30, 40.7);
          return (
            <text
              key={`minute-${minuteLabel}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-text-secondary text-[2.9px] font-semibold"
            >
              {minuteLabel}
            </text>
          );
        })}

        {Array.from({ length: 12 }, (_, index) => {
          const hour = index + 1;
          const hourPosition = polarToCartesian(hour * 30, 33.6);
          const hourColor = HOUR_NUMBER_COLORS[index] ?? "fill-text-primary";

          return (
            <text
              key={`hour-12-${hour}`}
              x={hourPosition.x}
              y={hourPosition.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={cn("text-[8.6px] font-bold", hourColor)}
            >
              {hour}
            </text>
          );
        })}

        {Array.from({ length: 12 }, (_, index) => {
          const hour = index + 1;
          const hour24 = getHour24Equivalent(hour);
          const bubblePosition = polarToCartesian(hour * 30, 22.6);
          const bubbleColor = HOUR_24_COLORS[index] ?? "fill-brand-primary/85";

          return (
            <g key={`hour-24-${hour24}`}>
              <circle
                cx={bubblePosition.x}
                cy={bubblePosition.y}
                r="3.18"
                className={cn("stroke-bg-surface stroke-[0.55]", bubbleColor)}
              />
              <text
                x={bubblePosition.x}
                y={bubblePosition.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-text-inverse text-[3.35px] font-semibold"
              >
                {hour24}
              </text>
            </g>
          );
        })}

        <line
          x1="50"
          y1="51"
          x2="50"
          y2="31.4"
          strokeWidth="2.7"
          strokeLinecap="round"
          className="stroke-status-info"
          style={{
            transformOrigin: "50px 50px",
            transform: `rotate(${hourAngle}deg)`,
            transition: handTransition,
          }}
        />
        <line
          x1="50"
          y1="52"
          x2="50"
          y2="22.6"
          strokeWidth="2.05"
          strokeLinecap="round"
          className="stroke-text-primary"
          style={{
            transformOrigin: "50px 50px",
            transform: `rotate(${minuteAngle}deg)`,
            transition: handTransition,
          }}
        />

        {showSeconds ? (
          <line
            x1="50"
            y1="53"
            x2="50"
            y2="17.2"
            strokeWidth="1.1"
            strokeLinecap="round"
            className="stroke-status-error"
            style={{
              transformOrigin: "50px 50px",
              transform: `rotate(${secondAngle}deg)`,
              transition: secondTransition,
            }}
          />
        ) : null}

        <circle cx="50" cy="50" r="2.7" className="fill-status-error/90" />
        <circle cx="50" cy="50" r="1.35" className="fill-bg-surface" />
      </svg>
    </section>
  );
}
