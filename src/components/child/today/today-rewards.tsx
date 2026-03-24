"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { DailyHighlight, RewardsSummary } from "@/components/child/today/types";
import { cn } from "@/lib/utils";

interface TodayRewardsProps {
  summary: RewardsSummary;
  className?: string;
}

interface HighlightTheme {
  emoji: string;
  color: string;
  bgLight: string;
  border: string;
  shadow: string;
}

const HIGHLIGHT_THEME: Record<DailyHighlight["type"], HighlightTheme> = {
  activity: {
    emoji: "⚽",
    color: "#F97316",
    bgLight: "#FFF7ED",
    border: "#FED7AA",
    shadow: "rgba(249,115,22,0.2)",
  },
  leisure: {
    emoji: "🍿",
    color: "#EC4899",
    bgLight: "#FDF2F8",
    border: "#FBCFE8",
    shadow: "rgba(236,72,153,0.2)",
  },
};

function HighlightRow({
  highlight,
  index,
}: {
  highlight: DailyHighlight;
  index: number;
}): React.JSX.Element {
  const [tapped, setTapped] = useState(false);
  const theme = HIGHLIGHT_THEME[highlight.type];

  const handleTap = (): void => {
    setTapped(true);
    window.setTimeout(() => setTapped(false), 700);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: 0.2 + index * 0.1,
        type: "spring",
        stiffness: 280,
        damping: 22,
      }}
      data-testid={`daily-highlight-row-${highlight.id}`}
    >
      <motion.button
        type="button"
        whileHover={{ scale: 1.025, x: 3 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleTap}
        style={{
          width: "100%",
          background: tapped
            ? `linear-gradient(135deg, ${theme.color}18, ${theme.color}30)`
            : `linear-gradient(135deg, white, ${theme.bgLight})`,
          border: `2px solid ${tapped ? theme.color : theme.border}`,
          borderRadius: 16,
          padding: "12px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12,
          textAlign: "left",
          boxShadow: tapped
            ? `0 4px 16px ${theme.shadow}`
            : `0 2px 8px ${theme.shadow}`,
          transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: index * 0.8,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 10% 50%, ${theme.color}15 0%, transparent 55%)`,
            pointerEvents: "none",
          }}
        />

        <motion.div
          animate={tapped ? { rotate: [0, -15, 15, -8, 0], scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.5 }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: `${theme.color}20`,
            border: `1.5px solid ${theme.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {theme.emoji}
        </motion.div>

        <span
          style={{
            flex: 1,
            fontWeight: 700,
            fontSize: 14,
            color: "#1E293B",
            fontFamily: "var(--font-ui), system-ui, sans-serif",
            lineHeight: 1.35,
          }}
        >
          {highlight.label}
        </span>

        <AnimatePresence>
          {tapped ? (
            <motion.span
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: 0, scale: 1.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                position: "absolute",
                right: 14,
                fontSize: 18,
                pointerEvents: "none",
              }}
            >
              ✨
            </motion.span>
          ) : null}
        </AnimatePresence>

        <span style={{ fontSize: 16, color: theme.color, flexShrink: 0 }} aria-hidden="true">
          ›
        </span>
      </motion.button>
    </motion.div>
  );
}

function EmptyHighlightRow({ message }: { message: string }): React.JSX.Element {
  return (
    <article
      className="rounded-[16px] border-2 border-amber-200"
      style={{
        background: "linear-gradient(135deg, #FFFFFF, #FFFBEB)",
        padding: "12px 14px",
        boxShadow: "0 2px 8px rgba(245,158,11,0.18)",
      }}
      data-testid="daily-highlights-empty"
    >
      <div className="flex items-center gap-3">
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
            border: "1.5px solid #FCD34D",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 21,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          🌟
        </span>
        <p
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: 14,
            color: "#1E293B",
            fontFamily: "var(--font-ui), system-ui, sans-serif",
          }}
        >
          {message}
        </p>
      </div>
    </article>
  );
}

export function TodayRewards({ summary, className }: TodayRewardsProps): React.JSX.Element {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.05 }}
      className={cn("h-full", className)}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        borderRadius: 28,
        border: "1.5px solid rgba(255,255,255,0.8)",
        boxShadow:
          "0 20px 60px rgba(251,191,36,0.1), 0 4px 16px rgba(0,0,0,0.06)",
        padding: "20px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
      data-testid="daily-highlights-card"
      aria-label="Programme du jour"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
            border: "1.5px solid #FCD34D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(245,158,11,0.25)",
          }}
          aria-hidden="true"
        >
          <motion.span
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
          >
            ⭐
          </motion.span>
        </div>

        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#F59E0B",
              margin: 0,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
            }}
          >
            Programme du jour
          </p>
          <h2
            style={{
              fontWeight: 900,
              fontSize: 16,
              color: "#1E293B",
              margin: 0,
              fontFamily: "var(--font-ui), system-ui, sans-serif",
              letterSpacing: "-0.3px",
            }}
          >
            Ce qui sera chouette aujourd&apos;hui ✨
          </h2>
        </div>
      </motion.div>

      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, #FDE68A, transparent)",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {summary.highlights.length === 0 ? (
          <EmptyHighlightRow message={summary.emptyMessage} />
        ) : (
          summary.highlights.map((highlight, index) => (
            <HighlightRow key={highlight.id} highlight={highlight} index={index} />
          ))
        )}
      </div>

    </motion.section>
  );
}
