"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  creditChildStarsAction,
  createRewardTierAction,
  deleteRewardTierAction,
  updateRewardTierAction,
} from "@/lib/actions/rewards";
import { useFormField } from "@/lib/hooks/useFormField";
import type { RewardTierInput, RewardTierSummary } from "@/lib/day-templates/types";

interface RewardsManagerProps {
  rewardTiers: RewardTierSummary[];
  childRewardWallet?: {
    childProfileId: string;
    childDisplayName: string;
    availableStars: number;
  } | null;
}

type RewardCategoryKey = "privilege" | "screen" | "activity" | "surprise";

interface RewardCategoryDefinition {
  key: RewardCategoryKey;
  label: string;
  badgeClassName: string;
  borderClassName: string;
  iconBgClassName: string;
  fallbackEmoji: string;
  keywordMatches: string[];
}

interface RewardCardModel {
  tier: RewardTierSummary;
  category: RewardCategoryDefinition;
  unlocked: boolean;
  usageCount: number;
  emoji: string;
}

interface RewardEmojiOption {
  value: string;
  label: string;
  category: RewardCategoryKey;
}

interface RewardDialogState {
  category: RewardCategoryKey;
  emoji: string;
  unlocked: boolean;
}

const EMPTY_DRAFT: RewardTierInput = {
  label: "",
  description: "",
  pointsRequired: 5,
  sortOrder: 0,
};

const REWARD_CATEGORIES: RewardCategoryDefinition[] = [
  {
    key: "privilege",
    label: "Privilege",
    badgeClassName: "bg-gray-100 text-gray-700",
    borderClassName: "border-purple-200",
    iconBgClassName: "bg-purple-50",
    fallbackEmoji: "🍕",
    keywordMatches: ["priv", "menu", "repas", "dessert", "choisir"],
  },
  {
    key: "screen",
    label: "Temps d'ecran",
    badgeClassName: "bg-gray-100 text-gray-700",
    borderClassName: "border-blue-200",
    iconBgClassName: "bg-blue-50",
    fallbackEmoji: "🎮",
    keywordMatches: ["ecran", "jeu", "video", "console", "tablette", "film"],
  },
  {
    key: "activity",
    label: "Activite",
    badgeClassName: "bg-gray-100 text-gray-700",
    borderClassName: "border-green-200",
    iconBgClassName: "bg-green-50",
    fallbackEmoji: "🏞️",
    keywordMatches: ["sortie", "parc", "balade", "velo", "ami", "famille", "activite"],
  },
  {
    key: "surprise",
    label: "Surprise",
    badgeClassName: "bg-gray-100 text-gray-700",
    borderClassName: "border-pink-200",
    iconBgClassName: "bg-pink-50",
    fallbackEmoji: "🎁",
    keywordMatches: ["surprise", "mystere", "cadeau"],
  },
];
const DEFAULT_REWARD_CATEGORY: RewardCategoryDefinition = REWARD_CATEGORIES[0] ?? {
  key: "privilege",
  label: "Privilege",
  badgeClassName: "bg-gray-100 text-gray-700",
  borderClassName: "border-purple-200",
  iconBgClassName: "bg-purple-50",
  fallbackEmoji: "🍕",
  keywordMatches: [],
};

const REWARD_CATEGORY_BY_KEY: Record<RewardCategoryKey, RewardCategoryDefinition> = {
  privilege:
    REWARD_CATEGORIES.find((category) => category.key === "privilege") ?? DEFAULT_REWARD_CATEGORY,
  screen:
    REWARD_CATEGORIES.find((category) => category.key === "screen") ?? DEFAULT_REWARD_CATEGORY,
  activity:
    REWARD_CATEGORIES.find((category) => category.key === "activity") ?? DEFAULT_REWARD_CATEGORY,
  surprise:
    REWARD_CATEGORIES.find((category) => category.key === "surprise") ?? DEFAULT_REWARD_CATEGORY,
};

const REWARD_EMOJI_OPTIONS: RewardEmojiOption[] = [
  { value: "👑", label: "Couronne", category: "privilege" },
  { value: "🎟️", label: "Ticket special", category: "privilege" },
  { value: "🍕", label: "Pizza", category: "privilege" },
  { value: "🍔", label: "Burger", category: "privilege" },
  { value: "🍟", label: "Frites", category: "privilege" },
  { value: "🌭", label: "Hot-dog", category: "privilege" },
  { value: "🌮", label: "Tacos", category: "privilege" },
  { value: "🍣", label: "Sushi", category: "privilege" },
  { value: "🍜", label: "Nouilles", category: "privilege" },
  { value: "🥞", label: "Pancakes", category: "privilege" },
  { value: "🍿", label: "Pop-corn", category: "privilege" },
  { value: "🍫", label: "Chocolat", category: "privilege" },
  { value: "🍩", label: "Donut", category: "privilege" },
  { value: "🍪", label: "Cookie", category: "privilege" },
  { value: "🧁", label: "Cupcake", category: "privilege" },
  { value: "🍦", label: "Glace", category: "privilege" },
  { value: "🍭", label: "Sucette", category: "privilege" },
  { value: "🍬", label: "Bonbon", category: "privilege" },
  { value: "🧃", label: "Jus", category: "privilege" },
  { value: "🥤", label: "Boisson", category: "privilege" },
  { value: "🎉", label: "Celebration", category: "privilege" },
  { value: "📺", label: "Television", category: "screen" },
  { value: "🎮", label: "Jeu video", category: "screen" },
  { value: "🕹️", label: "Borne arcade", category: "screen" },
  { value: "🎬", label: "Film", category: "screen" },
  { value: "🎞️", label: "Serie", category: "screen" },
  { value: "📱", label: "Telephone", category: "screen" },
  { value: "💻", label: "Ordinateur", category: "screen" },
  { value: "🖥️", label: "Ecran", category: "screen" },
  { value: "⌨️", label: "Clavier", category: "screen" },
  { value: "🖱️", label: "Souris", category: "screen" },
  { value: "🎧", label: "Casque", category: "screen" },
  { value: "🎙️", label: "Micro", category: "screen" },
  { value: "🎤", label: "Karaoke", category: "screen" },
  { value: "🎵", label: "Musique", category: "screen" },
  { value: "🎶", label: "Playlist", category: "screen" },
  { value: "🎼", label: "Partition", category: "screen" },
  { value: "📸", label: "Photo", category: "screen" },
  { value: "📷", label: "Appareil photo", category: "screen" },
  { value: "📹", label: "Camera", category: "screen" },
  { value: "🛰️", label: "Streaming", category: "screen" },
  { value: "🎯", label: "Session ciblee", category: "screen" },
  { value: "⚽", label: "Football", category: "activity" },
  { value: "🏀", label: "Basket", category: "activity" },
  { value: "🏈", label: "Football americain", category: "activity" },
  { value: "⚾", label: "Baseball", category: "activity" },
  { value: "🎾", label: "Tennis", category: "activity" },
  { value: "🏐", label: "Volley", category: "activity" },
  { value: "🏉", label: "Rugby", category: "activity" },
  { value: "🥏", label: "Frisbee", category: "activity" },
  { value: "🎳", label: "Bowling", category: "activity" },
  { value: "🏓", label: "Ping-pong", category: "activity" },
  { value: "🏸", label: "Badminton", category: "activity" },
  { value: "🥊", label: "Boxe", category: "activity" },
  { value: "🥋", label: "Arts martiaux", category: "activity" },
  { value: "⛸️", label: "Patinage", category: "activity" },
  { value: "🛹", label: "Skate", category: "activity" },
  { value: "🚴", label: "Velo", category: "activity" },
  { value: "🏊", label: "Natation", category: "activity" },
  { value: "🏃", label: "Course", category: "activity" },
  { value: "🤸", label: "Gym", category: "activity" },
  { value: "🧗", label: "Escalade", category: "activity" },
  { value: "🏞️", label: "Sortie nature", category: "activity" },
  { value: "🏕️", label: "Camping", category: "activity" },
  { value: "🌳", label: "Parc", category: "activity" },
  { value: "🚶", label: "Balade", category: "activity" },
  { value: "🎨", label: "Dessin", category: "activity" },
  { value: "🖌️", label: "Peinture", category: "activity" },
  { value: "🖍️", label: "Coloriage", category: "activity" },
  { value: "✂️", label: "Decoupage", category: "activity" },
  { value: "🧩", label: "Puzzle", category: "activity" },
  { value: "🎲", label: "Jeu de societe", category: "activity" },
  { value: "♟️", label: "Echecs", category: "activity" },
  { value: "📚", label: "Lecture", category: "activity" },
  { value: "📖", label: "Histoire", category: "activity" },
  { value: "🎭", label: "Theatre", category: "activity" },
  { value: "🎪", label: "Spectacle", category: "activity" },
  { value: "🎁", label: "Cadeau", category: "surprise" },
  { value: "🎈", label: "Ballon", category: "surprise" },
  { value: "🎀", label: "Ruban", category: "surprise" },
  { value: "✨", label: "Magie", category: "surprise" },
  { value: "🌟", label: "Etoile brillante", category: "surprise" },
  { value: "💫", label: "Etincelle", category: "surprise" },
  { value: "🎊", label: "Confettis", category: "surprise" },
  { value: "🎉", label: "Fete", category: "surprise" },
  { value: "🧸", label: "Peluche", category: "surprise" },
  { value: "🪄", label: "Baguette magique", category: "surprise" },
  { value: "🪅", label: "Pinata", category: "surprise" },
  { value: "🎂", label: "Gateau surprise", category: "surprise" },
  { value: "🍀", label: "Chance", category: "surprise" },
  { value: "🤩", label: "Effet wow", category: "surprise" },
  { value: "🦄", label: "Licorne", category: "surprise" },
  { value: "🐾", label: "Surprise animale", category: "surprise" },
  { value: "🐶", label: "Chien", category: "surprise" },
  { value: "🐱", label: "Chat", category: "surprise" },
  { value: "🐼", label: "Panda", category: "surprise" },
  { value: "🚀", label: "Mission surprise", category: "surprise" },
  { value: "🌈", label: "Arc-en-ciel", category: "surprise" },
  { value: "🎇", label: "Etincelles", category: "surprise" },
  { value: "🎆", label: "Feu d'artifice", category: "surprise" },
];

const REWARD_EMOJI_OPTIONS_BY_CATEGORY: Record<RewardCategoryKey, RewardEmojiOption[]> = {
  privilege: REWARD_EMOJI_OPTIONS.filter((option) => option.category === "privilege"),
  screen: REWARD_EMOJI_OPTIONS.filter((option) => option.category === "screen"),
  activity: REWARD_EMOJI_OPTIONS.filter((option) => option.category === "activity"),
  surprise: REWARD_EMOJI_OPTIONS.filter((option) => option.category === "surprise"),
};

const EMOJI_CATEGORY_BY_SYMBOL = new Map<string, RewardCategoryKey>();
for (const option of REWARD_EMOJI_OPTIONS) {
  const normalized = normalizeEmojiSymbol(option.value);
  if (!EMOJI_CATEGORY_BY_SYMBOL.has(normalized)) {
    EMOJI_CATEGORY_BY_SYMBOL.set(normalized, option.category);
  }
}

function GiftIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

function LockOpenIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function LockIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function StarIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    </svg>
  );
}

function TrendingUpIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function PlusIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function PenIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
    </svg>
  );
}

function TrashIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function normalizeEmojiSymbol(value: string): string {
  return value.trim().replace(/\uFE0F/g, "");
}

function resolveRewardCategory(tier: RewardTierSummary): RewardCategoryDefinition {
  const leadingSymbol = extractLeadingSymbol(tier.label);
  if (leadingSymbol) {
    const key = EMOJI_CATEGORY_BY_SYMBOL.get(normalizeEmojiSymbol(leadingSymbol));
    if (key) {
      return REWARD_CATEGORY_BY_KEY[key];
    }
  }

  const haystack = `${tier.label} ${tier.description ?? ""}`.toLowerCase();
  for (const category of REWARD_CATEGORIES) {
    if (category.keywordMatches.some((keyword) => haystack.includes(keyword))) {
      return category;
    }
  }
  return DEFAULT_REWARD_CATEGORY;
}

function extractLeadingSymbol(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const symbol = Array.from(trimmed)[0];
  if (!symbol) return null;
  if (/^[a-z0-9]$/i.test(symbol)) return null;
  return symbol;
}

function stripLeadingSymbol(label: string): string {
  const trimmed = label.trim();
  const symbol = extractLeadingSymbol(trimmed);
  if (!symbol) {
    return trimmed;
  }

  const withoutSymbol = trimmed.slice(symbol.length).trimStart();
  return withoutSymbol.replace(/^[-–—:|]\s*/, "").trimStart();
}

function getDefaultEmojiForCategory(category: RewardCategoryKey): string {
  const options = REWARD_EMOJI_OPTIONS_BY_CATEGORY[category];
  return options[0]?.value ?? REWARD_CATEGORY_BY_KEY[category].fallbackEmoji;
}

function getCategoryTitle(category: RewardCategoryKey): string {
  if (category === "screen") {
    return "Temps d'ecran";
  }
  if (category === "activity") {
    return "Activite";
  }
  if (category === "surprise") {
    return "Surprise";
  }
  return "Privilege";
}

export function RewardsManager({ rewardTiers, childRewardWallet = null }: RewardsManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<RewardTierInput>(EMPTY_DRAFT);
  const [dialogState, setDialogState] = useState<RewardDialogState>({
    category: DEFAULT_REWARD_CATEGORY.key,
    emoji: getDefaultEmojiForCategory(DEFAULT_REWARD_CATEGORY.key),
    unlocked: true,
  });
  const [starsToCredit, setStarsToCredit] = useState("1");
  const [unlockedOverrides, setUnlockedOverrides] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const labelField = useFormField({
    initialValue: "",
    validate: (value) => (value.trim().length >= 2 ? null : "Nom requis"),
  });
  const pointsField = useFormField({
    initialValue: String(EMPTY_DRAFT.pointsRequired),
    validate: (value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 1) {
        return "Le cout minimum est de 1 etoile";
      }
      return null;
    },
  });

  const sortedTiers = useMemo(
    () =>
      [...rewardTiers].sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }
        return left.pointsRequired - right.pointsRequired;
      }),
    [rewardTiers],
  );

  const rewardCards = useMemo<RewardCardModel[]>(() => {
    const sortedByPoints = [...sortedTiers].sort((left, right) => left.pointsRequired - right.pointsRequired);
    const unlockedIds = new Set(sortedByPoints.slice(0, Math.min(3, sortedByPoints.length)).map((tier) => tier.id));

    return sortedTiers.map((tier) => {
      const category = resolveRewardCategory(tier);
      const emoji = extractLeadingSymbol(tier.label) ?? category.fallbackEmoji;
      const unlocked = unlockedOverrides[tier.id] ?? unlockedIds.has(tier.id);
      return {
        tier,
        category,
        unlocked,
        usageCount: 0,
        emoji,
      };
    });
  }, [sortedTiers, unlockedOverrides]);

  const groupedRewards = useMemo(
    () =>
      REWARD_CATEGORIES.map((category) => ({
        category,
        tiers: rewardCards.filter((entry) => entry.category.key === category.key),
      })).filter((entry) => entry.tiers.length > 0),
    [rewardCards],
  );

  const totalRewards = rewardCards.length;
  const unlockedRewards = rewardCards.filter((entry) => entry.unlocked).length;
  const totalUsage = rewardCards.reduce((sum, entry) => sum + entry.usageCount, 0);
  const mostPopularReward = [...rewardCards].sort((left, right) => {
    if (right.usageCount !== left.usageCount) {
      return right.usageCount - left.usageCount;
    }
    return left.tier.pointsRequired - right.tier.pointsRequired;
  })[0];

  const modalLabelClass =
    "flex select-none items-center gap-2 text-sm font-medium leading-none text-[#030213]";
  const modalFieldClass =
    "h-9 w-full rounded-md border border-black/10 bg-[#f3f3f5] px-3 py-1 text-base text-[#030213] shadow-none outline-none transition-[color,box-shadow] placeholder:text-[#717182] focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-black/10 md:text-sm";
  const modalTextAreaClass =
    "w-full rounded-md border border-black/10 bg-[#f3f3f5] px-3 py-2 text-base text-[#030213] shadow-none outline-none transition-[color,box-shadow] placeholder:text-[#717182] focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-black/10 md:text-sm";

  function resetForm(closeModal = true): void {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT, sortOrder: rewardTiers.length });
    setDialogState({
      category: DEFAULT_REWARD_CATEGORY.key,
      emoji: getDefaultEmojiForCategory(DEFAULT_REWARD_CATEGORY.key),
      unlocked: true,
    });
    labelField.reset("");
    pointsField.reset(String(EMPTY_DRAFT.pointsRequired));
    if (closeModal) {
      setIsModalOpen(false);
    }
  }

  function startCreate(): void {
    resetForm(false);
    setFeedback(null);
    setIsModalOpen(true);
  }

  function startEdit(tier: RewardTierSummary): void {
    const resolvedCategory = resolveRewardCategory(tier);
    const leadingSymbol = extractLeadingSymbol(tier.label);
    const normalizedSymbol = leadingSymbol ? normalizeEmojiSymbol(leadingSymbol) : null;
    const selectedEmoji =
      (normalizedSymbol &&
        REWARD_EMOJI_OPTIONS.find((option) => normalizeEmojiSymbol(option.value) === normalizedSymbol)
          ?.value) ??
      getDefaultEmojiForCategory(resolvedCategory.key);
    const currentCard = rewardCards.find((entry) => entry.tier.id === tier.id);

    setEditingId(tier.id);
    setDraft({
      label: stripLeadingSymbol(tier.label),
      description: tier.description,
      pointsRequired: tier.pointsRequired,
      sortOrder: tier.sortOrder,
    });
    setDialogState({
      category: resolvedCategory.key,
      emoji: selectedEmoji,
      unlocked: currentCard?.unlocked ?? true,
    });
    labelField.reset(stripLeadingSymbol(tier.label));
    pointsField.reset(String(tier.pointsRequired));
    setFeedback(null);
    setIsModalOpen(true);
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);

    labelField.markTouched();
    pointsField.markTouched();
    const labelError = labelField.validateNow();
    const pointsError = pointsField.validateNow();
    if (labelError || pointsError) {
      setFeedback({ tone: "error", message: "Veuillez corriger les champs requis." });
      return;
    }

    startTransition(async () => {
      const cleanTitle = stripLeadingSymbol(draft.label);
      const payload: RewardTierInput = {
        label: `${dialogState.emoji} ${cleanTitle}`.trim(),
        description: draft.description?.trim() ? draft.description.trim() : null,
        pointsRequired: Math.max(1, Math.trunc(draft.pointsRequired)),
        sortOrder: Math.max(0, Math.trunc(draft.sortOrder)),
      };

      const result = editingId
        ? await updateRewardTierAction(editingId, payload)
        : await createRewardTierAction(payload);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer la recompense." });
        return;
      }

      setFeedback({
        tone: "success",
        message: editingId ? "Recompense mise a jour." : "Recompense ajoutee.",
      });

      if (editingId) {
        setUnlockedOverrides((current) => ({
          ...current,
          [editingId]: dialogState.unlocked,
        }));
      } else {
        const createdRewardId = result.data?.id;
        if (!createdRewardId) {
          resetForm();
          router.refresh();
          return;
        }
        setUnlockedOverrides((current) => ({
          ...current,
          [createdRewardId]: dialogState.unlocked,
        }));
      }

      resetForm();
      router.refresh();
    });
  }

  function deleteTier(id: string): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteRewardTierAction(id);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer cette recompense." });
        return;
      }

      setUnlockedOverrides((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });

      setFeedback({ tone: "success", message: "Recompense supprimee." });
      router.refresh();
    });
  }

  function handleCategoryChange(nextCategory: RewardCategoryKey): void {
    setDialogState((current) => {
      const currentEmojiCategory = EMOJI_CATEGORY_BY_SYMBOL.get(normalizeEmojiSymbol(current.emoji));
      const nextEmoji =
        currentEmojiCategory === nextCategory
          ? current.emoji
          : getDefaultEmojiForCategory(nextCategory);
      return {
        ...current,
        category: nextCategory,
        emoji: nextEmoji,
      };
    });
  }

  const canSubmitForm =
    draft.label.trim().length >= 2 &&
    Number.isFinite(draft.pointsRequired) &&
    draft.pointsRequired >= 1;

  function submitManualCredit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!childRewardWallet) {
      return;
    }

    const parsedValue = Number(starsToCredit);
    const starsToAdd = Math.max(1, Math.trunc(parsedValue));
    if (!Number.isFinite(parsedValue) || starsToAdd < 1) {
      setFeedback({ tone: "error", message: "Veuillez saisir un nombre d'etoiles valide (minimum 1)." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await creditChildStarsAction({
        childProfileId: childRewardWallet.childProfileId,
        starsToAdd,
      });

      if (!result.success || !result.data) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de crediter les etoiles." });
        return;
      }

      setFeedback({
        tone: "success",
        message: `${starsToAdd} etoile${starsToAdd > 1 ? "s" : ""} ajoutee${starsToAdd > 1 ? "s" : ""}. Nouveau solde: ${result.data.availableStars} etoiles.`,
      });
      setStarsToCredit("1");
      router.refresh();
    });
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-extrabold text-gray-900">Systeme de recompenses</h1>
        <p className="text-gray-600">Gerez les recompenses et privileges disponibles pour votre enfant</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
              <GiftIcon className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <p className="mb-1 text-2xl font-extrabold text-gray-900">{totalRewards}</p>
          <p className="text-sm text-gray-600">Recompenses totales</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <LockOpenIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="mb-1 text-2xl font-extrabold text-gray-900">{unlockedRewards}</p>
          <p className="text-sm text-gray-600">Debloquees</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
              <StarIcon className="h-6 w-6 fill-orange-500 text-orange-500" />
            </div>
          </div>
          <p className="mb-1 text-2xl font-extrabold text-gray-900">{totalUsage}</p>
          <p className="text-sm text-gray-600">Fois utilisees</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100">
              <TrendingUpIcon className="h-6 w-6 text-pink-600" />
            </div>
          </div>
          <p className="mb-1 truncate text-lg font-extrabold text-gray-900">
            {mostPopularReward ? `${mostPopularReward.emoji} ${mostPopularReward.tier.label}` : "-"}
          </p>
          <p className="text-sm text-gray-600">Plus populaire</p>
        </div>
      </div>

      {childRewardWallet ? (
        <section className="mb-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Crediter des etoiles</h2>
              <p className="text-sm text-gray-700">
                Solde actuel de {childRewardWallet.childDisplayName}:{" "}
                <span className="font-extrabold text-amber-700">{childRewardWallet.availableStars} etoiles</span>
              </p>
            </div>

            <form onSubmit={submitManualCredit} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
              <div className="sm:w-40">
                <label htmlFor="manual-stars" className="mb-1 block text-xs font-semibold text-gray-700">
                  Etoiles a ajouter
                </label>
                <input
                  id="manual-stars"
                  type="number"
                  min={1}
                  step={1}
                  value={starsToCredit}
                  onChange={(event) => setStarsToCredit(event.target.value)}
                  className="h-9 w-full rounded-md border border-black/10 bg-white px-3 py-1 text-sm text-[#030213] outline-none transition-[color,box-shadow] focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-black/10"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-amber-600 hover:to-orange-700 disabled:pointer-events-none disabled:opacity-50"
                disabled={isPending}
              >
                <StarIcon className="h-4 w-4 fill-white text-white" />
                Crediter
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <div className="mb-6">
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-indigo-600 hover:to-indigo-700 disabled:pointer-events-none disabled:opacity-50"
        >
          <PlusIcon className="mr-1 h-5 w-5" />
          Nouvelle recompense
        </button>
      </div>

      {feedback ? (
        <div className="mb-6">
          <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} />
        </div>
      ) : null}

      <Modal
        open={isModalOpen}
        onClose={() => {
          if (!isPending) {
            resetForm();
          }
        }}
        title={editingId ? "Modifier la recompense" : "Nouvelle recompense"}
        className="max-w-xl border p-6 shadow-lg sm:max-w-lg"
      >
        <form className="space-y-4 py-4" onSubmit={submitForm}>
          <div>
            <label htmlFor="reward-title" className={modalLabelClass}>
              Titre *
            </label>
            <input
              id="reward-title"
              className={modalFieldClass}
              value={draft.label}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((current) => ({ ...current, label: value }));
                labelField.setValue(value);
              }}
              onBlur={labelField.markTouched}
              placeholder="Ex: 30 min de jeux video"
              required
            />
            {labelField.hasError ? (
              <p className="mt-1 text-xs font-medium text-red-600">{labelField.error}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="reward-description" className={modalLabelClass}>
              Description
            </label>
            <textarea
              id="reward-description"
              rows={3}
              className={modalTextAreaClass}
              value={draft.description ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Description de la recompense"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reward-icon" className={modalLabelClass}>
                Icône (emoji)
              </label>
              <select
                id="reward-icon"
                className={modalFieldClass}
                value={dialogState.emoji}
                onChange={(event) =>
                  setDialogState((current) => ({ ...current, emoji: event.target.value }))
                }
              >
                <optgroup label="⭐ Privilege">
                  {REWARD_EMOJI_OPTIONS_BY_CATEGORY.privilege.map((option) => (
                    <option key={`emoji-priv-${option.value}`} value={option.value}>
                      {option.value} {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📺 Temps d'ecran">
                  {REWARD_EMOJI_OPTIONS_BY_CATEGORY.screen.map((option) => (
                    <option key={`emoji-screen-${option.value}`} value={option.value}>
                      {option.value} {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏞️ Activite">
                  {REWARD_EMOJI_OPTIONS_BY_CATEGORY.activity.map((option) => (
                    <option key={`emoji-activity-${option.value}`} value={option.value}>
                      {option.value} {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🎁 Surprise">
                  {REWARD_EMOJI_OPTIONS_BY_CATEGORY.surprise.map((option) => (
                    <option key={`emoji-surprise-${option.value}`} value={option.value}>
                      {option.value} {option.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label htmlFor="reward-cost" className={modalLabelClass}>
                Cout (etoiles)
              </label>
              <input
                id="reward-cost"
                type="number"
                min={1}
                className={modalFieldClass}
                value={draft.pointsRequired}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((current) => ({ ...current, pointsRequired: Number(value || 1) }));
                  pointsField.setValue(value);
                }}
                onBlur={pointsField.markTouched}
              />
              {pointsField.hasError ? (
                <p className="mt-1 text-xs font-medium text-red-600">{pointsField.error}</p>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="reward-category" className={modalLabelClass}>
              Categorie
            </label>
            <select
              id="reward-category"
              className={modalFieldClass}
              value={dialogState.category}
              onChange={(event) => handleCategoryChange(event.target.value as RewardCategoryKey)}
            >
              {REWARD_CATEGORIES.map((category) => (
                <option key={category.key} value={category.key}>
                  {REWARD_CATEGORY_BY_KEY[category.key].fallbackEmoji} {getCategoryTitle(category.key)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
            <div>
              <label htmlFor="reward-unlocked" className={modalLabelClass}>
                Recompense deverrouillee
              </label>
              <p className="mt-1 text-xs text-gray-600">L&apos;enfant peut la voir et l&apos;acheter</p>
            </div>
            <button
              id="reward-unlocked"
              type="button"
              role="switch"
              aria-checked={dialogState.unlocked}
              onClick={() =>
                setDialogState((current) => ({ ...current, unlocked: !current.unlocked }))
              }
              className={`inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-black/10 ${
                dialogState.unlocked ? "bg-[#030213]" : "bg-[#cbced4]"
              }`}
            >
              <span
                className={`block size-4 rounded-full bg-white transition-transform ${
                  dialogState.unlocked ? "translate-x-[calc(100%-2px)]" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
              onClick={() => resetForm()}
              disabled={isPending}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-indigo-600 hover:to-indigo-700 disabled:pointer-events-none disabled:opacity-50"
              disabled={isPending || !canSubmitForm}
            >
              {isPending ? "Enregistrement..." : editingId ? "Enregistrer" : "Creer"}
            </button>
          </div>
        </form>
      </Modal>

      {groupedRewards.length === 0 ? (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
          Aucune recompense configuree pour le moment.
        </div>
      ) : (
        groupedRewards.map((group) => (
          <div key={group.category.key} className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-gray-900">{group.category.label}</h2>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${group.category.badgeClassName}`}>
                {group.tiers.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {group.tiers.map((entry) => (
                <div
                  key={entry.tier.id}
                  className={`relative rounded-2xl border-2 bg-white p-5 transition-all hover:shadow-md ${entry.category.borderClassName} ${entry.unlocked ? "" : "opacity-60"}`}
                >
                  {!entry.unlocked ? (
                    <div className="absolute right-3 top-3">
                      <div className="rounded-full bg-gray-900/90 p-1.5 text-white">
                        <LockIcon className="h-4 w-4" />
                      </div>
                    </div>
                  ) : null}

                  <div className="mb-4 flex items-start gap-4">
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-3xl ${entry.category.iconBgClassName}`}>
                      {entry.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 font-extrabold text-gray-900">{entry.tier.label}</h3>
                      <p className="line-clamp-2 text-sm text-gray-600">
                        {entry.tier.description?.trim() || "Recompense sans description."}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <StarIcon className="h-5 w-5 fill-orange-400 text-orange-400" />
                      <span className="font-extrabold text-gray-900">{entry.tier.pointsRequired}</span>
                      <span className="text-sm text-gray-600">etoiles</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Utilisee <span className="font-semibold">{entry.usageCount}</span> fois
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(entry.tier)}
                      className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium text-foreground transition-all hover:bg-gray-50"
                    >
                      <PenIcon className="mr-1 h-4 w-4" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(entry.tier)}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium transition-all hover:bg-indigo-50 hover:text-indigo-600"
                      aria-label={`Modifier ${entry.tier.label}`}
                    >
                      <PenIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTier(entry.tier.id)}
                      disabled={isPending}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium transition-all hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50"
                      aria-label={`Supprimer ${entry.tier.label}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white">
            <GiftIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="mb-2 font-extrabold text-gray-900">💡 Conseils pour les recompenses</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Variez les types de recompenses (ecran, activites, privileges)</li>
              <li>• Ajustez les couts en fonction de la difficulte</li>
              <li>• Impliquez l&apos;enfant dans le choix des recompenses</li>
              <li>• Privilegiez les recompenses non materielles</li>
              <li>• Creez des recompenses &quot;mystere&quot; pour la motivation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
