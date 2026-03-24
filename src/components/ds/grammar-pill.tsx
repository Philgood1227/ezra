import * as React from "react";
import { cn } from "@/lib/utils";

export interface GrammarPillPalette {
  acronym: string;
  label: string;
  backgroundPill: string;
  textColor: string;
  borderColor: string;
  acronymBg: string;
  acronymText: string;
  acronymBorder: string;
}

export const GRAMMAR_PILL_PALETTES = {
  subject: {
    acronym: "S",
    label: "Sujet",
    backgroundPill: "#D0E8FF",
    textColor: "#0B63CE",
    borderColor: "#0B63CE",
    acronymBg: "#0B63CE",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  predicate: {
    acronym: "Pred",
    label: "Predicat",
    backgroundPill: "#CDEFD6",
    textColor: "#1E854A",
    borderColor: "#1E854A",
    acronymBg: "#1E854A",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  cp: {
    acronym: "CP",
    label: "Complement de phrase",
    backgroundPill: "#FFF1C2",
    textColor: "#B28400",
    borderColor: "#B28400",
    acronymBg: "#B28400",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  cv: {
    acronym: "CV",
    label: "Complement du verbe",
    backgroundPill: "#FFE0E0",
    textColor: "#C84040",
    borderColor: "#C84040",
    acronymBg: "#C84040",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  cn: {
    acronym: "CN",
    label: "Complement du nom",
    backgroundPill: "#EAD9FF",
    textColor: "#6E3CBC",
    borderColor: "#6E3CBC",
    acronymBg: "#6E3CBC",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  gn: {
    acronym: "GN",
    label: "Groupe nominal",
    backgroundPill: "#D8F0FF",
    textColor: "#0077A3",
    borderColor: "#0077A3",
    acronymBg: "#0077A3",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  gv: {
    acronym: "GV",
    label: "Groupe verbal",
    backgroundPill: "#D9FFE3",
    textColor: "#008C4A",
    borderColor: "#008C4A",
    acronymBg: "#008C4A",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  gprep: {
    acronym: "GPrep",
    label: "Groupe prepositionnel",
    backgroundPill: "#FFF3D6",
    textColor: "#B77200",
    borderColor: "#B77200",
    acronymBg: "#B77200",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  gadj: {
    acronym: "GAdj",
    label: "Groupe adjectival",
    backgroundPill: "#FFE6F2",
    textColor: "#C21F5B",
    borderColor: "#C21F5B",
    acronymBg: "#C21F5B",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  noun: {
    acronym: "N",
    label: "Nom",
    backgroundPill: "#E0ECFF",
    textColor: "#245AB5",
    borderColor: "#245AB5",
    acronymBg: "#245AB5",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  determiner: {
    acronym: "Det",
    label: "Determinant",
    backgroundPill: "#F3FFE0",
    textColor: "#5C8A00",
    borderColor: "#5C8A00",
    acronymBg: "#5C8A00",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  adjective: {
    acronym: "Adj",
    label: "Adjectif",
    backgroundPill: "#FFE8D9",
    textColor: "#C25B1F",
    borderColor: "#C25B1F",
    acronymBg: "#C25B1F",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  pronoun: {
    acronym: "Pro",
    label: "Pronom",
    backgroundPill: "#F0E6FF",
    textColor: "#6D38B2",
    borderColor: "#6D38B2",
    acronymBg: "#6D38B2",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  preposition: {
    acronym: "Prep",
    label: "Preposition",
    backgroundPill: "#E5F5FF",
    textColor: "#006999",
    borderColor: "#006999",
    acronymBg: "#006999",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  place: {
    acronym: "L",
    label: "Lieu",
    backgroundPill: "#D7F7FF",
    textColor: "#007B99",
    borderColor: "#007B99",
    acronymBg: "#007B99",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  time: {
    acronym: "T",
    label: "Temps",
    backgroundPill: "#FFEFD7",
    textColor: "#C27A00",
    borderColor: "#C27A00",
    acronymBg: "#C27A00",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
  purpose: {
    acronym: "B",
    label: "But",
    backgroundPill: "#E9FFE4",
    textColor: "#3F8C1C",
    borderColor: "#3F8C1C",
    acronymBg: "#3F8C1C",
    acronymText: "#FFFFFF",
    acronymBorder: "transparent",
  },
} as const satisfies Record<string, GrammarPillPalette>;

export type GrammarPillType = keyof typeof GRAMMAR_PILL_PALETTES;

const GRAMMAR_PILL_ALIASES: Record<string, GrammarPillType> = {
  s: "subject",
  subject: "subject",
  verb: "predicate",
  v: "predicate",
  predicate: "predicate",
  pred: "predicate",
  complement: "cp",
  c: "cp",
  cp: "cp",
  cv: "cv",
  cn: "cn",
  gn: "gn",
  gv: "gv",
  gp: "gprep",
  gprep: "gprep",
  ga: "gadj",
  gadj: "gadj",
  n: "noun",
  noun: "noun",
  det: "determiner",
  determiner: "determiner",
  adj: "adjective",
  adjective: "adjective",
  pro: "pronoun",
  pronoun: "pronoun",
  prep: "preposition",
  preposition: "preposition",
  l: "place",
  place: "place",
  t: "time",
  time: "time",
  b: "purpose",
  purpose: "purpose",
};

export const GRAMMAR_PILL_OPTIONS: Array<{
  value: GrammarPillType;
  shortLabel: string;
  label: string;
}> = [
  { value: "subject", shortLabel: "S", label: "Sujet" },
  { value: "predicate", shortLabel: "Pred", label: "Predicat" },
  { value: "cp", shortLabel: "CP", label: "Complement de phrase" },
  { value: "cv", shortLabel: "CV", label: "Complement du verbe" },
  { value: "cn", shortLabel: "CN", label: "Complement du nom" },
  { value: "gn", shortLabel: "GN", label: "Groupe nominal" },
  { value: "gv", shortLabel: "GV", label: "Groupe verbal" },
  { value: "gprep", shortLabel: "GPrep", label: "Groupe prepositionnel" },
  { value: "gadj", shortLabel: "GAdj", label: "Groupe adjectival" },
  { value: "noun", shortLabel: "N", label: "Nom" },
  { value: "determiner", shortLabel: "Det", label: "Determinant" },
  { value: "adjective", shortLabel: "Adj", label: "Adjectif" },
  { value: "pronoun", shortLabel: "Pro", label: "Pronom" },
  { value: "preposition", shortLabel: "Prep", label: "Preposition" },
  { value: "place", shortLabel: "L", label: "Lieu" },
  { value: "time", shortLabel: "T", label: "Temps" },
  { value: "purpose", shortLabel: "B", label: "But" },
];

export function resolveGrammarPillType(input: string | null | undefined): GrammarPillType {
  const normalized = String(input ?? "")
    .trim()
    .toLowerCase();
  return GRAMMAR_PILL_ALIASES[normalized] ?? "subject";
}

export function getGrammarPillPalette(type: string | null | undefined): GrammarPillPalette {
  return GRAMMAR_PILL_PALETTES[resolveGrammarPillType(type)];
}

export interface GrammarPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: GrammarPillType | string;
  text: React.ReactNode;
}

export function GrammarPill({ type, text, className, ...props }: GrammarPillProps): React.JSX.Element {
  const palette = getGrammarPillPalette(type);

  return (
    <span
      className={cn("inline-flex items-center align-baseline", className)}
      style={{
        backgroundColor: palette.backgroundPill,
        color: palette.textColor,
        borderColor: palette.borderColor,
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "9999px",
        padding: "4px 8px",
        lineHeight: 1.35,
        gap: "4px",
      }}
      {...props}
    >
      <span
        aria-hidden="true"
        style={{
          backgroundColor: palette.acronymBg,
          color: palette.acronymText,
          borderColor: palette.acronymBorder,
          borderWidth: "1px",
          borderStyle: "solid",
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: 700,
          lineHeight: 1,
          padding: "3px 7px",
        }}
      >
        {palette.acronym}
      </span>
      <span>{text}</span>
    </span>
  );
}
