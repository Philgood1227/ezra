"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { claimRewardAction, consumeRewardAction } from "@/lib/actions/reward-claims";
import { Button, Modal, useToast } from "@/components/ds";
import type { RewardTierSummary } from "@/lib/day-templates/types";
import { cn } from "@/lib/utils";

type RewardsTabKey = "available" | "soon" | "history";
type RewardCategoryKey = "privilege" | "screen" | "activity" | "surprise";

interface ChildRewardsViewProps {
  childName: string;
  initialAvailableStars: number;
  initialRewardHistory: RewardHistoryState;
  rewardTiers: RewardTierSummary[];
}

interface RewardCardModel {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  emoji: string;
  category: RewardCategoryKey;
}

interface RewardUsageEntry {
  count: number;
  lastClaimedAt: string;
}

type RewardHistoryState = Record<string, RewardUsageEntry>;

interface RewardsTabConfig {
  key: RewardsTabKey;
  label: string;
  triggerIdSuffix: "available" | "almost" | "used";
  panelIdSuffix: "available" | "almost" | "used";
  triggerActiveClassName: string;
  Icon: (props: { className?: string }) => React.JSX.Element;
}

const REWARDS_TABS: RewardsTabConfig[] = [
  {
    key: "available",
    label: "Disponibles",
    triggerIdSuffix: "available",
    panelIdSuffix: "available",
    triggerActiveClassName: "data-[state=active]:bg-green-500 data-[state=active]:text-white",
    Icon: SparklesIcon,
  },
  {
    key: "soon",
    label: "Bientot",
    triggerIdSuffix: "almost",
    panelIdSuffix: "almost",
    triggerActiveClassName: "data-[state=active]:bg-yellow-500 data-[state=active]:text-white",
    Icon: TrophyIcon,
  },
  {
    key: "history",
    label: "Mon tresor",
    triggerIdSuffix: "used",
    panelIdSuffix: "used",
    triggerActiveClassName: "data-[state=active]:bg-purple-500 data-[state=active]:text-white",
    Icon: HistoryIcon,
  },
];

const CATEGORY_FALLBACK_EMOJI: Record<RewardCategoryKey, string> = {
  privilege: "\uD83C\uDF55",
  screen: "\uD83C\uDFAE",
  activity: "\uD83C\uDFDE",
  surprise: "\uD83C\uDF81",
};

const CATEGORY_KEYWORDS: Record<RewardCategoryKey, string[]> = {
  privilege: ["repas", "dessert", "menu", "choisir", "pizza", "burger"],
  screen: ["jeu", "video", "console", "ecran", "film", "serie"],
  activity: ["parc", "sortie", "velo", "famille", "copain", "activite"],
  surprise: ["surprise", "mystere", "cadeau", "secret"],
};


function ArrowLeftIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function StarIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    </svg>
  );
}

function GiftIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

function SparklesIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

function TrophyIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function HistoryIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function extractLeadingSymbol(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }
  const first = Array.from(trimmed)[0];
  if (!first || /^[a-z0-9]$/i.test(first)) {
    return null;
  }
  return first;
}

function stripLeadingSymbol(label: string): string {
  const symbol = extractLeadingSymbol(label);
  if (!symbol) {
    return label.trim();
  }
  return label.trim().slice(symbol.length).trim().replace(/^[-Ã¢â‚¬â€œÃ¢â‚¬â€:|]\s*/, "");
}

function resolveCategoryFromText(title: string, description: string | null): RewardCategoryKey {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  const categoryOrder: RewardCategoryKey[] = ["privilege", "screen", "activity", "surprise"];
  for (const category of categoryOrder) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return category;
    }
  }
  return "privilege";
}

function mapRewardTierToModel(tier: RewardTierSummary): RewardCardModel {
  const rawTitle = stripLeadingSymbol(tier.label);
  const category = resolveCategoryFromText(rawTitle, tier.description);
  return {
    id: tier.id,
    title: rawTitle || "Recompense",
    description: tier.description,
    cost: Math.max(0, tier.pointsRequired),
    emoji: extractLeadingSymbol(tier.label) ?? CATEGORY_FALLBACK_EMOJI[category],
    category,
  };
}

function formatUsageDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "date inconnue";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function getMotivationTitle(starsMissing: number): string {
  const starsLabel = starsMissing > 1 ? "etoiles" : "etoile";
  if (starsMissing <= 2) {
    return `Encore ${starsMissing} ${starsLabel} !`;
  }
  return `Encore ${starsMissing} ${starsLabel} !`;
}

function getMotivationBody(starsMissing: number): string {
  if (starsMissing <= 2) {
    return "Tu y es presque !";
  }
  if (starsMissing <= 5) {
    return "Continue, tu avances tres bien !";
  }
  return "Tu progresses, continue !";
}

export function ChildRewardsView({
  childName,
  initialAvailableStars,
  initialRewardHistory,
  rewardTiers,
}: ChildRewardsViewProps): React.JSX.Element {
  const toast = useToast();
  const [activeTab, setActiveTab] = React.useState<RewardsTabKey>("available");
  const [currentStars, setCurrentStars] = React.useState(() =>
    Math.max(0, Math.trunc(initialAvailableStars)),
  );
  const [rewardHistory, setRewardHistory] = React.useState<RewardHistoryState>(initialRewardHistory);
  const [quantityDraftByRewardId, setQuantityDraftByRewardId] = React.useState<Record<string, number>>({});
  const [pendingReward, setPendingReward] = React.useState<RewardCardModel | null>(null);
  const [celebrationMessage, setCelebrationMessage] = React.useState<string | null>(null);
  const [isClaimPending, startClaimTransition] = React.useTransition();
  const [isUsePending, startUseTransition] = React.useTransition();

  React.useEffect(() => {
    setCurrentStars(Math.max(0, Math.trunc(initialAvailableStars)));
  }, [initialAvailableStars]);

  React.useEffect(() => {
    setRewardHistory(initialRewardHistory);
  }, [initialRewardHistory]);

  React.useEffect(() => {
    if (!celebrationMessage) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setCelebrationMessage(null);
    }, 2600);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [celebrationMessage]);

  const rewardModels = React.useMemo(() => {
    const source = rewardTiers.map(mapRewardTierToModel);
    return source.sort((left, right) => {
      if (left.cost !== right.cost) {
        return left.cost - right.cost;
      }
      return left.title.localeCompare(right.title);
    });
  }, [rewardTiers]);

  const availableRewards = React.useMemo(() => {
    return rewardModels.filter((reward) => reward.cost <= currentStars);
  }, [currentStars, rewardModels]);

  const soonRewards = React.useMemo(() => {
    return rewardModels.filter((reward) => reward.cost > currentStars);
  }, [currentStars, rewardModels]);

  const usedRewards = React.useMemo(() => {
    return rewardModels
      .filter((reward) => (rewardHistory[reward.id]?.count ?? 0) > 0)
      .sort((left, right) => {
        const leftUsage = rewardHistory[left.id];
        const rightUsage = rewardHistory[right.id];
        const countDelta = (rightUsage?.count ?? 0) - (leftUsage?.count ?? 0);
        if (countDelta !== 0) {
          return countDelta;
        }
        return (rightUsage?.lastClaimedAt ?? "").localeCompare(leftUsage?.lastClaimedAt ?? "");
      });
  }, [rewardHistory, rewardModels]);

  const tabCounts: Record<RewardsTabKey, number> = React.useMemo(
    () => ({
      available: availableRewards.length,
      soon: soonRewards.length,
      history: usedRewards.length,
    }),
    [availableRewards.length, soonRewards.length, usedRewards.length],
  );

  function openClaimDialog(reward: RewardCardModel): void {
    setPendingReward(reward);
  }

  function getSelectedUseQuantity(rewardId: string, availableCount: number): number {
    const draft = quantityDraftByRewardId[rewardId];
    if (typeof draft !== "number" || !Number.isFinite(draft)) {
      return 1;
    }
    return clamp(Math.trunc(draft), 1, Math.max(1, availableCount));
  }

  function updateSelectedUseQuantity(rewardId: string, nextValue: number, availableCount: number): void {
    setQuantityDraftByRewardId((current) => ({
      ...current,
      [rewardId]: clamp(Math.trunc(nextValue), 1, Math.max(1, availableCount)),
    }));
  }

  function consumeRewardUnits(
    reward: RewardCardModel,
    availableCount: number,
    requestedQuantity?: number,
  ): void {
    if (isUsePending || availableCount <= 0) {
      return;
    }

    const quantity = clamp(
      Math.trunc(requestedQuantity ?? getSelectedUseQuantity(reward.id, availableCount)),
      1,
      Math.max(1, availableCount),
    );

    startUseTransition(async () => {
      const result = await consumeRewardAction({
        rewardTierId: reward.id,
        quantity,
      });

      if (!result.success || !result.data) {
        toast.error(result.error ?? "Impossible d'utiliser cette recompense.");
        return;
      }

      const actionData = result.data;
      setRewardHistory((current) => {
        const existing = current[actionData.rewardTierId];
        if (actionData.remainingQuantity <= 0) {
          const next = { ...current };
          delete next[actionData.rewardTierId];
          return next;
        }
        return {
          ...current,
          [actionData.rewardTierId]: {
            count: actionData.remainingQuantity,
            lastClaimedAt: existing?.lastClaimedAt ?? actionData.usedAt,
          },
        };
      });

      setQuantityDraftByRewardId((current) => {
        const next = { ...current };
        next[actionData.rewardTierId] = 1;
        return next;
      });

      toast.success(
        `${quantity} ${quantity > 1 ? "unites" : "unite"} utilisee${quantity > 1 ? "s" : ""} pour "${reward.title}".`,
      );
    });
  }

  function confirmClaimReward(): void {
    if (!pendingReward || isClaimPending) {
      return;
    }

    const rewardToClaim = pendingReward;

    if (rewardToClaim.cost > currentStars) {
      toast.error("Pas assez d'etoiles pour cette recompense.");
      setPendingReward(null);
      return;
    }

    startClaimTransition(async () => {
      const result = await claimRewardAction({
        rewardTierId: rewardToClaim.id,
      });

      if (!result.success || !result.data) {
        toast.error(result.error ?? "Impossible d'enregistrer cet echange.");
        return;
      }

      const actionData = result.data;

      setCurrentStars(Math.max(0, Math.trunc(actionData.remainingStars)));
      setRewardHistory((current) => ({
        ...current,
        [actionData.rewardTierId]: {
          count: Math.max(1, Math.trunc(actionData.usageCount)),
          lastClaimedAt: actionData.claimedAt,
        },
      }));

      setPendingReward(null);
      setCelebrationMessage(`Ã°Å¸Å½Å  Bravo ${childName} ! "${rewardToClaim.title}" est a toi.`);
      toast.success(`Ã°Å¸Å½Å  Bravo ! Tu as obtenu : ${rewardToClaim.title}`);
    });
  }

  return (
    <div
      className="min-h-full bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 px-2 pb-10 pt-2 md:px-4"
      style={{
        fontFamily: "\"Segoe UI\", \"Segoe UI Emoji\", Inter, var(--font-ui), sans-serif",
      }}
      data-testid="child-rewards-page"
    >
      <div className="mx-auto w-full max-w-[1080px] space-y-6">
        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-8 rounded-3xl bg-gradient-to-r from-orange-500 to-pink-500 p-6 shadow-2xl md:p-8"
        >
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-center md:text-left">
              <h1 className="mb-2 flex items-center justify-center gap-3 text-3xl font-extrabold text-white md:justify-start md:text-4xl">
                <Link
                  href="/child"
                  className="rounded-full bg-white/85 p-2.5 text-slate-700 shadow-sm transition-all hover:scale-110 hover:bg-white"
                  aria-label="Retour vers la page d'accueil enfant"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </Link>
                <GiftIcon className="h-10 w-10" />
                Mes recompenses
              </h1>
              <p className="text-lg text-white/90">Choisis tes cadeaux avec tes etoiles !</p>
            </div>

            <motion.div whileHover={{ scale: 1.03 }} className="rounded-2xl bg-white px-8 py-6 shadow-xl">
              <div className="flex items-center gap-3">
                <StarIcon className="h-12 w-12 fill-orange-500 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">Mes etoiles</p>
                  <p className="text-5xl font-extrabold text-orange-500">{currentStars}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <AnimatePresence>
          {celebrationMessage ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border-4 border-emerald-300 bg-gradient-to-r from-emerald-100 to-lime-100 p-4 text-center text-base font-black text-emerald-900"
            >
              {celebrationMessage}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div
          role="tablist"
          aria-orientation="horizontal"
          className="text-muted-foreground mx-auto grid h-auto w-full max-w-2xl grid-cols-3 items-center justify-center rounded-2xl bg-white p-2 shadow-lg"
          tabIndex={0}
          data-orientation="horizontal"
        >
          {REWARDS_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const state = isActive ? "active" : "inactive";
            const triggerId = `child-rewards-trigger-${tab.triggerIdSuffix}`;
            const panelId = `child-rewards-content-${tab.panelIdSuffix}`;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                id={triggerId}
                data-state={state}
                data-orientation="horizontal"
                tabIndex={isActive ? 0 : -1}
                className={cn(
                  "dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-transparent px-2 py-3 text-base leading-6 font-bold transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1",
                  "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                  tab.triggerActiveClassName,
                  !isActive && "text-muted-foreground",
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                <tab.Icon className="mr-2 h-5 w-5" />
                {tab.label} ({tabCounts[tab.key]})
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "available" ? (
            <motion.section
              key="tab-available"
              id="child-rewards-content-available"
              role="tabpanel"
              aria-labelledby="child-rewards-trigger-available"
              tabIndex={0}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 space-y-4 outline-none"
            >
              {availableRewards.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availableRewards.map((reward, index) => {
                    const usageCount = rewardHistory[reward.id]?.count ?? 0;
                    return (
                      <motion.article
                        key={reward.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        whileHover={{ scale: 1.03 }}
                        className="cursor-pointer rounded-2xl border-4 border-green-300 bg-gradient-to-br from-green-50 to-emerald-100 p-6 shadow-lg transition-all hover:shadow-2xl"
                      >
                        <div className="mb-4 text-center">
                          <div className="mb-3 text-6xl">{reward.emoji}</div>
                          <h3 className="mb-2 text-xl font-extrabold text-gray-900">{reward.title}</h3>
                          <p className="mb-3 text-sm text-gray-700">
                            {reward.description ?? "Une recompense top pour toi !"}
                          </p>

                          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md">
                            <StarIcon className="h-5 w-5 fill-orange-500 text-orange-500" />
                            <span className="text-2xl font-extrabold text-orange-500">{reward.cost}</span>
                          </div>
                        </div>

                        <Button
                          className="h-9 w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-6 text-lg font-extrabold text-white shadow-lg transition-all hover:from-green-600 hover:to-emerald-700"
                          onClick={() => openClaimDialog(reward)}
                          disabled={isClaimPending}
                        >
                          <GiftIcon className="mr-2 h-5 w-5" />
                          Je veux ca !
                        </Button>

                        {usageCount > 0 ? (
                          <p className="mt-2 text-center text-xs text-gray-600">
                            Dans ton tresor: {usageCount}
                          </p>
                        ) : null}
                      </motion.article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[26px] border-4 border-emerald-200 bg-emerald-50 p-6 text-center">
                  <p className="text-2xl" aria-hidden="true">
                    Etoiles
                  </p>
                  <p className="mt-2 text-lg font-black text-emerald-900">
                    Continue tes missions, des recompenses vont arriver !
                  </p>
                </div>
              )}
            </motion.section>
          ) : null}

          {activeTab === "soon" ? (
            <motion.section
              key="tab-soon"
              id="child-rewards-content-almost"
              role="tabpanel"
              aria-labelledby="child-rewards-trigger-almost"
              tabIndex={0}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 space-y-4 outline-none"
            >
              {soonRewards.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {soonRewards.map((reward, index) => {
                    const starsMissing = Math.max(0, reward.cost - currentStars);
                    const progressPercent = clamp(
                      Math.round((currentStars / Math.max(1, reward.cost)) * 100),
                      0,
                      100,
                    );

                    return (
                      <motion.article
                        key={reward.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        whileHover={{ scale: 1.03 }}
                        className="relative overflow-hidden rounded-2xl border-4 border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-100 p-6 shadow-lg"
                      >
                        <div className="absolute right-4 top-4 rounded-full bg-yellow-500 px-3 py-1 text-xs font-extrabold text-white shadow-md">
                          BIENTOT !
                        </div>

                        <div className="mb-4 text-center">
                          <div className="mb-3 text-6xl opacity-80">{reward.emoji}</div>
                          <h3 className="mb-2 text-xl font-extrabold text-gray-900">{reward.title}</h3>
                          <p className="mb-3 text-sm text-gray-700">
                            {reward.description ?? "Encore un petit effort !"}
                          </p>
                          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md">
                            <StarIcon className="h-5 w-5 fill-orange-500 text-orange-500" />
                            <span className="text-2xl font-extrabold text-orange-500">{reward.cost}</span>
                          </div>
                        </div>

                        <div className="mb-3 rounded-xl bg-white p-4 shadow-inner">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">Ta progression</span>
                            <span className="text-sm font-bold text-yellow-600">{progressPercent}%</span>
                          </div>
                          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.7, delay: index * 0.08 }}
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                            />
                          </div>
                        </div>

                        <div className="rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 p-4 text-center text-white shadow-md">
                          <p className="text-lg font-extrabold">{getMotivationTitle(starsMissing)}</p>
                          <p className="mt-1 text-sm opacity-90">{getMotivationBody(starsMissing)}</p>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[26px] border-4 border-amber-200 bg-amber-50 p-6 text-center">
                  <p className="text-2xl" aria-hidden="true">
                    Trop fort
                  </p>
                  <p className="mt-2 text-lg font-black text-amber-900">
                    Super ! Aucune recompense en attente proche.
                  </p>
                </div>
              )}
            </motion.section>
          ) : null}

          {activeTab === "history" ? (
            <motion.section
              key="tab-history"
              id="child-rewards-content-used"
              role="tabpanel"
              aria-labelledby="child-rewards-trigger-used"
              tabIndex={0}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 space-y-4 outline-none"
            >
              {usedRewards.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {usedRewards.map((reward, index) => {
                    const usage = rewardHistory[reward.id];
                    const count = Math.max(0, usage?.count ?? 0);
                    const selectedQuantity = getSelectedUseQuantity(reward.id, count);
                    return (
                      <motion.article
                        key={reward.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        whileHover={{ scale: 1.03 }}
                        className="rounded-2xl border-4 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-100 p-6 shadow-lg"
                      >
                        <div className="text-center">
                          <div className="mb-3 text-6xl">{reward.emoji}</div>
                          <h3 className="mb-2 text-xl font-extrabold text-gray-900">{reward.title}</h3>
                          <p className="mb-3 text-sm text-gray-700">
                            {reward.description ?? "Dans ton tresor."}
                          </p>
                          <div className="mb-3 rounded-xl bg-white p-3 shadow-md">
                            <p className="mb-1 text-sm text-gray-600">Disponible</p>
                            <p className="text-3xl font-extrabold text-purple-600">{count} fois</p>
                          </div>
                          <p className="text-xs text-gray-600">
                            Dernier achat : {formatUsageDate(usage?.lastClaimedAt ?? "")}
                          </p>

                          <div className="mt-4 space-y-2 rounded-xl bg-white p-3 shadow-sm">
                            <div className="flex items-center justify-center gap-2">
                              <label htmlFor={`treasure-quantity-${reward.id}`} className="text-xs font-bold text-gray-600">
                                Quantite
                              </label>
                              <input
                                id={`treasure-quantity-${reward.id}`}
                                type="number"
                                min={1}
                                max={Math.max(1, count)}
                                value={selectedQuantity}
                                onChange={(event) =>
                                  updateSelectedUseQuantity(
                                    reward.id,
                                    Number(event.target.value || 1),
                                    count,
                                  )
                                }
                                className="h-8 w-20 rounded-md border border-gray-300 px-2 text-center text-sm font-bold text-gray-900 outline-none focus:border-purple-400"
                                disabled={isUsePending}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                className="h-9 rounded-lg bg-white text-sm font-bold text-purple-700 ring-1 ring-purple-200 hover:bg-purple-50"
                                onClick={() => consumeRewardUnits(reward, count, 1)}
                                disabled={isUsePending || count <= 0}
                              >
                                Utiliser 1
                              </Button>
                              <Button
                                className="h-9 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-sm font-bold text-white hover:from-purple-600 hover:to-indigo-700"
                                onClick={() => consumeRewardUnits(reward, count)}
                                disabled={isUsePending || count <= 0}
                              >
                                {isUsePending ? "Utilisation..." : "Utiliser"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[26px] border-4 border-violet-200 bg-violet-50 p-6 text-center">
                  <p className="text-lg font-black text-violet-900">
                    Ton tresor apparaitra ici apres tes premiers echanges.
                  </p>
                </div>
              )}
            </motion.section>
          ) : null}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-12 rounded-3xl bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-center shadow-2xl"
        >
          <h3 className="mb-3 text-2xl font-extrabold text-white md:text-3xl">
            {"\uD83C\uDF1F Continue comme ca ! \uD83C\uDF1F"}
          </h3>
          <p className="text-lg text-white/90 md:text-xl">
            Plus tu completes de missions, plus tu gagnes d&apos;etoiles pour tes recompenses preferees !
          </p>
        </motion.div>
      </div>

      <Modal
        open={pendingReward !== null}
        onClose={() => {
          if (!isClaimPending) {
            setPendingReward(null);
          }
        }}
        title="Confirmation"
        {...(pendingReward
          ? {
              description: `Tu veux echanger ${pendingReward.cost} etoiles pour "${pendingReward.title}" ?`,
            }
          : {})}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-sm font-black text-amber-900">
            Etoiles restantes apres echange:{" "}
            {pendingReward ? Math.max(0, currentStars - pendingReward.cost) : currentStars}
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button variant="tertiary" onClick={() => setPendingReward(null)} disabled={isClaimPending}>
              Annuler
            </Button>
            <Button
              className="border-2 border-emerald-700 bg-gradient-to-r from-emerald-500 to-green-600 text-white"
              onClick={confirmClaimReward}
              disabled={isClaimPending}
            >
              {isClaimPending ? "Echange..." : "Je confirme !"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}









