"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  KnowledgeIcon,
  SparkIcon,
} from "@/components/child/icons/child-premium-icons";
import {
  Badge,
  Button,
  Card,
  CardContent,
  FloatingActionButton,
  Input,
  Modal,
  Select,
} from "@/components/ds";
import {
  buildChildRevisionFilterOptions,
  filterChildVisibleRevisionCards,
  getChildRevisionProgressLabel,
  type ChildVisibleRevisionCardItem,
} from "@/lib/revisions/child-tools";
import { REVISION_CARD_KIND_LABELS } from "@/lib/revisions/constants";

interface ChildFloatingToolsProps {
  hidden?: boolean;
}

type DrawerView = "root" | "cards";
type FetchState = "idle" | "loading" | "ready" | "error";

function getTypeLabel(type: ChildVisibleRevisionCardItem["type"]): string {
  return REVISION_CARD_KIND_LABELS[type];
}

export function ChildFloatingTools({
  hidden = false,
}: ChildFloatingToolsProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const previousPathnameRef = React.useRef(pathname);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [view, setView] = React.useState<DrawerView>("root");
  const [cards, setCards] = React.useState<ChildVisibleRevisionCardItem[]>([]);
  const [fetchState, setFetchState] = React.useState<FetchState>("idle");
  const [search, setSearch] = React.useState("");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | ChildVisibleRevisionCardItem["type"]>("all");

  const loadCards = React.useCallback(async () => {
    setFetchState("loading");

    try {
      const response = await fetch("/api/child/revisions", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Unable to fetch cards: ${response.status}`);
      }

      const payload = (await response.json()) as ChildVisibleRevisionCardItem[];
      setCards(payload);
      setFetchState("ready");
    } catch {
      setFetchState("error");
    }
  }, []);

  React.useEffect(() => {
    if (hidden && isDrawerOpen) {
      setIsDrawerOpen(false);
      setView("root");
    }
  }, [hidden, isDrawerOpen]);

  React.useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
      }
      setView("root");
    }
  }, [pathname, isDrawerOpen]);

  const filterOptions = React.useMemo(
    () => buildChildRevisionFilterOptions(cards),
    [cards],
  );

  const filteredCards = React.useMemo(
    () =>
      filterChildVisibleRevisionCards(cards, {
        search,
        subject: subjectFilter,
        type: typeFilter,
      }),
    [cards, search, subjectFilter, typeFilter],
  );

  const openDrawer = React.useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const openCardsView = React.useCallback(() => {
    setView("cards");
    if (fetchState === "idle") {
      void loadCards();
    }
  }, [fetchState, loadCards]);

  const closeDrawer = React.useCallback(() => {
    setIsDrawerOpen(false);
    setView("root");
  }, []);

  const goBackToRoot = React.useCallback(() => {
    setView("root");
  }, []);

  const handleOpenCard = React.useCallback(
    (cardId: string) => {
      router.push(`/child/revisions/${cardId}`);
      closeDrawer();
    },
    [closeDrawer, router],
  );

  const openConjugation = React.useCallback(() => {
    router.push("/child/conjugaison");
    closeDrawer();
  }, [closeDrawer, router]);

  if (hidden) {
    return <></>;
  }

  return (
    <>
      <div className="child-floating-tools-fab-anchor fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 md:bottom-6 md:right-6">
        <FloatingActionButton
          className="child-floating-tools-fab-button"
          icon={<SparkIcon />}
          ariaLabel="Ouvrir les outils"
          onClick={openDrawer}
          data-testid="child-floating-tools-fab"
        />
      </div>

      <Modal
        open={isDrawerOpen}
        onClose={closeDrawer}
        title="Outils"
        description="Acces rapide"
        closeLabel="Fermer les outils"
        className="child-tools-dialog"
      >
        {view === "root" ? (
          <section className="space-y-3" data-testid="child-tools-drawer-root">
            <button
              type="button"
              onClick={openCardsView}
              className="flex w-full items-center justify-between rounded-radius-button border border-border-default bg-bg-surface/90 px-4 py-3 text-left transition-colors duration-200 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand-primary/12 text-brand-primary">
                  <KnowledgeIcon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-text-primary">Fiches</span>
                  <span className="block text-xs text-text-secondary">Voir / choisir une fiche</span>
                </span>
                </span>
                <ArrowRightIcon className="size-5 text-text-secondary" />
              </button>

            <button
              type="button"
              onClick={openConjugation}
              className="flex w-full items-center justify-between rounded-radius-button border border-border-default bg-bg-surface/90 px-4 py-3 text-left transition-colors duration-200 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand-secondary/12 text-brand-secondary">
                  <SparkIcon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-text-primary">Conjugaison</span>
                  <span className="block text-xs text-text-secondary">
                    Decouvrir les temps et faire les exercices
                  </span>
                </span>
              </span>
              <ArrowRightIcon className="size-5 text-text-secondary" />
            </button>
          </section>
        ) : (
          <section className="space-y-4" data-testid="child-tools-drawer-cards">
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={goBackToRoot}>
                Retour
              </Button>
              <p className="text-xs text-text-secondary">Fiches publiees</p>
            </div>

            <div className="space-y-2">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Rechercher une fiche"
                aria-label="Rechercher une fiche"
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                  value={subjectFilter}
                  onChange={(event) => {
                    setSubjectFilter(event.target.value);
                  }}
                  aria-label="Filtrer par matiere"
                >
                  <option value="all">Toutes les matieres</option>
                  {filterOptions.subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </Select>

                <Select
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value as "all" | ChildVisibleRevisionCardItem["type"]);
                  }}
                  aria-label="Filtrer par type"
                >
                  <option value="all">Tous les types</option>
                  {filterOptions.types.map((type) => (
                    <option key={type} value={type}>
                      {getTypeLabel(type)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {fetchState === "loading" ? (
              <div className="space-y-2" data-testid="child-tools-cards-loading">
                <Card className="animate-pulse bg-bg-surface/70">
                  <CardContent className="h-16" />
                </Card>
                <Card className="animate-pulse bg-bg-surface/70">
                  <CardContent className="h-16" />
                </Card>
              </div>
            ) : null}

            {fetchState === "error" ? (
              <Card className="border-status-error/40 bg-status-error/10" data-testid="child-tools-cards-error">
                <CardContent className="space-y-3 py-4">
                  <p className="text-sm font-semibold text-status-error">Impossible de charger les fiches.</p>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void loadCards()}>
                    Reessayer
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {fetchState === "ready" && filteredCards.length === 0 ? (
              <Card data-testid="child-tools-cards-empty">
                <CardContent className="space-y-1 py-4">
                  <p className="text-sm font-semibold text-text-primary">Aucune fiche disponible</p>
                  <p className="text-xs text-text-secondary">Demande a Papa/Maman d&apos;en publier une.</p>
                </CardContent>
              </Card>
            ) : null}

            {fetchState === "ready" && filteredCards.length > 0 ? (
              <ul className="space-y-2" data-testid="child-tools-cards-list">
                {filteredCards.map((card) => (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenCard(card.id);
                      }}
                      className="w-full rounded-radius-button border border-border-default bg-bg-surface/90 p-3 text-left transition-colors duration-200 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <p className="text-sm font-bold text-text-primary">{card.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="info">{card.subject}</Badge>
                        <Badge variant="neutral">{getTypeLabel(card.type)}</Badge>
                        {card.level ? <Badge variant="neutral">{card.level}</Badge> : null}
                        <Badge variant={card.progressStatus === "mastered" ? "success" : card.progressStatus === "in_progress" ? "warning" : "neutral"}>
                          {getChildRevisionProgressLabel(card)}
                        </Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        )}
      </Modal>
    </>
  );
}
