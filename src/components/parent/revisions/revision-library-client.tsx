"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
} from "@/components/ds";
import {
  REVISION_CARD_KIND_GENERIC,
  REVISION_CARD_KIND_LABELS,
  REVISION_CARD_STATUS_PUBLISHED,
  REVISION_LIBRARY_FILTER_ALL,
  REVISION_LIBRARY_STATUS_FILTERS,
  REVISION_LIBRARY_STATUS_LABELS,
  isRevisionLibraryStatusFilter,
  toggleRevisionCardStatus,
} from "@/lib/revisions/constants";
import type {
  CardType,
  RevisionCardLibraryItem,
  RevisionCardStatus,
  RevisionLibraryStatusFilter,
} from "@/lib/revisions/types";

interface RevisionLibraryActionResult {
  success: boolean;
  error?: string;
}

export interface ParentRevisionListFilters {
  status?: RevisionCardStatus;
  type?: CardType;
  subject?: string;
  level?: string;
}

interface RevisionLibraryClientProps {
  cards: RevisionCardLibraryItem[];
  filters: ParentRevisionListFilters;
  initialErrorMessage?: string | null;
  onSetStatusAction: (input: {
    cardId: string;
    status: RevisionCardStatus;
  }) => Promise<RevisionLibraryActionResult>;
  onDeleteAction: (input: { cardId: string }) => Promise<RevisionLibraryActionResult>;
}

type ListDensity = "compact" | "comfortable";

const FILTER_ALL_VALUE = "__all__";
const TYPE_FILTER_OPTIONS: Array<{ value: CardType; label: string }> = [
  { value: "concept", label: "Concept" },
  { value: "procedure", label: "Procedure" },
  { value: "vocab", label: "Vocab" },
  { value: "comprehension", label: "Comprehension" },
];

function formatKind(kind: RevisionCardLibraryItem["kind"]): string {
  return REVISION_CARD_KIND_LABELS[kind];
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isTypeFilterValue(value: string): value is CardType {
  return value === "concept" || value === "procedure" || value === "vocab" || value === "comprehension";
}

function buildSelectOptions(values: Array<string | null | undefined>, selectedValue?: string): string[] {
  const unique = new Set<string>();
  values.forEach((entry) => {
    const cleaned = typeof entry === "string" ? entry.replace(/\s+/g, " ").trim() : "";
    if (cleaned.length > 0) {
      unique.add(cleaned);
    }
  });

  if (selectedValue) {
    unique.add(selectedValue);
  }

  return Array.from(unique).sort((left, right) => left.localeCompare(right));
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName.toLocaleLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

export function RevisionLibraryClient({
  cards,
  filters,
  initialErrorMessage = null,
  onSetStatusAction,
  onDeleteAction,
}: RevisionLibraryClientProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = React.useState<RevisionLibraryStatusFilter>(
    filters.status ?? REVISION_LIBRARY_FILTER_ALL,
  );
  const [typeFilter, setTypeFilter] = React.useState<string>(filters.type ?? FILTER_ALL_VALUE);
  const [subjectFilter, setSubjectFilter] = React.useState<string>(filters.subject ?? FILTER_ALL_VALUE);
  const [levelFilter, setLevelFilter] = React.useState<string>(filters.level ?? FILTER_ALL_VALUE);
  const [quickSearch, setQuickSearch] = React.useState<string>("");
  const [listDensity, setListDensity] = React.useState<ListDensity>("compact");
  const [selectedCardIds, setSelectedCardIds] = React.useState<string[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(initialErrorMessage);
  const [deleteTarget, setDeleteTarget] = React.useState<RevisionCardLibraryItem | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const [isMutating, startMutation] = React.useTransition();

  const subjectOptions = React.useMemo(
    () => buildSelectOptions(cards.map((card) => card.subject), filters.subject),
    [cards, filters.subject],
  );
  const levelOptions = React.useMemo(
    () => buildSelectOptions(cards.map((card) => card.level), filters.level),
    [cards, filters.level],
  );

  const filteredCards = React.useMemo(() => {
    const normalizedQuickSearch = quickSearch.replace(/\s+/g, " ").trim().toLocaleLowerCase();
    if (!normalizedQuickSearch) {
      return cards;
    }

    return cards.filter((card) =>
      `${card.title} ${card.subject} ${card.level} ${card.status} ${card.kind}`
        .toLocaleLowerCase()
        .includes(normalizedQuickSearch),
    );
  }, [cards, quickSearch]);

  const selectedCards = React.useMemo(
    () => filteredCards.filter((card) => selectedCardIds.includes(card.id)),
    [filteredCards, selectedCardIds],
  );

  const hasRemoteFilters =
    statusFilter !== REVISION_LIBRARY_FILTER_ALL ||
    typeFilter !== FILTER_ALL_VALUE ||
    subjectFilter !== FILTER_ALL_VALUE ||
    levelFilter !== FILTER_ALL_VALUE;
  const hasActiveFilters = hasRemoteFilters || quickSearch.length > 0;
  const hasSelection = selectedCards.length > 0;
  const allVisibleSelected = filteredCards.length > 0 && selectedCards.length === filteredCards.length;

  React.useEffect(() => {
    setStatusFilter(filters.status ?? REVISION_LIBRARY_FILTER_ALL);
  }, [filters.status]);

  React.useEffect(() => {
    setTypeFilter(filters.type ?? FILTER_ALL_VALUE);
  }, [filters.type]);

  React.useEffect(() => {
    setSubjectFilter(filters.subject ?? FILTER_ALL_VALUE);
  }, [filters.subject]);

  React.useEffect(() => {
    setLevelFilter(filters.level ?? FILTER_ALL_VALUE);
  }, [filters.level]);

  React.useEffect(() => {
    setErrorMessage(initialErrorMessage);
  }, [initialErrorMessage]);

  React.useEffect(() => {
    setSelectedCardIds((previousSelectedIds) =>
      previousSelectedIds.filter((cardId) => filteredCards.some((card) => card.id === cardId)),
    );
  }, [filteredCards]);

  const replaceQuery = React.useCallback(
    (nextValues: {
      status?: RevisionLibraryStatusFilter;
      type?: string;
      subject?: string;
      level?: string;
    }) => {
      const next = new URLSearchParams(searchParams.toString());

      if (nextValues.status !== undefined) {
        if (nextValues.status === REVISION_LIBRARY_FILTER_ALL) {
          next.delete("status");
        } else {
          next.set("status", nextValues.status);
        }
      }

      if (nextValues.type !== undefined) {
        if (nextValues.type === FILTER_ALL_VALUE) {
          next.delete("type");
        } else {
          next.set("type", nextValues.type);
        }
      }

      if (nextValues.subject !== undefined) {
        if (nextValues.subject === FILTER_ALL_VALUE) {
          next.delete("subject");
        } else {
          next.set("subject", nextValues.subject);
        }
      }

      if (nextValues.level !== undefined) {
        if (nextValues.level === FILTER_ALL_VALUE) {
          next.delete("level");
        } else {
          next.set("level", nextValues.level);
        }
      }

      const queryString = next.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function runMutation(
    key: string,
    action: () => Promise<RevisionLibraryActionResult>,
    options?: { closeDeleteDialog?: boolean; closeBulkDeleteDialog?: boolean },
  ): void {
    setPendingKey(key);
    startMutation(() => {
      void (async () => {
        const result = await action();
        if (!result.success) {
          setErrorMessage(result.error ?? "Action impossible.");
          return;
        }

        setErrorMessage(null);
        if (options?.closeDeleteDialog) {
          setDeleteTarget(null);
        }
        if (options?.closeBulkDeleteDialog) {
          setBulkDeleteDialogOpen(false);
          setSelectedCardIds([]);
        }
        router.refresh();
      })().finally(() => {
        setPendingKey(null);
      });
    });
  }

  const runBulkMutation = React.useCallback(
    (
      key: string,
      cardIds: string[],
      actionFactory: (cardId: string) => Promise<RevisionLibraryActionResult>,
      options?: { closeBulkDeleteDialog?: boolean },
    ): void => {
      if (cardIds.length === 0) {
        return;
      }

      setPendingKey(key);
      startMutation(() => {
        void (async () => {
          let failedMessage: string | null = null;
          for (const cardId of cardIds) {
            const result = await actionFactory(cardId);
            if (!result.success) {
              failedMessage = result.error ?? "Action bulk impossible.";
              break;
            }
          }

          if (failedMessage) {
            setErrorMessage(failedMessage);
            return;
          }

          setErrorMessage(null);
          setSelectedCardIds([]);
          if (options?.closeBulkDeleteDialog) {
            setBulkDeleteDialogOpen(false);
          }
          router.refresh();
        })().finally(() => {
          setPendingKey(null);
        });
      });
    },
    [router],
  );

  const runBulkStatusMutation = React.useCallback(
    (targetStatus: RevisionCardStatus): void => {
      const targetCardIds = selectedCards
        .filter((card) => card.status !== targetStatus)
        .map((card) => card.id);

      if (targetCardIds.length === 0) {
        setErrorMessage("La selection est deja dans ce statut.");
        return;
      }

      runBulkMutation(
        `bulk:status:${targetStatus}`,
        targetCardIds,
        (cardId) => onSetStatusAction({ cardId, status: targetStatus }),
      );
    },
    [onSetStatusAction, runBulkMutation, selectedCards],
  );

  const runBulkDeleteMutation = React.useCallback((): void => {
    runBulkMutation(
      "bulk:delete",
      selectedCards.map((card) => card.id),
      (cardId) => onDeleteAction({ cardId }),
      { closeBulkDeleteDialog: true },
    );
  }, [onDeleteAction, runBulkMutation, selectedCards]);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isTextInputTarget(event.target)) {
        return;
      }

      const key = event.key.toLocaleLowerCase();
      const hasMeta = event.metaKey || event.ctrlKey;

      if (hasMeta && key === "a") {
        event.preventDefault();
        setSelectedCardIds(filteredCards.map((card) => card.id));
        return;
      }

      if (key === "/") {
        event.preventDefault();
        const searchInput = document.getElementById("revision-filter-search");
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      if (key === "escape" && hasSelection) {
        event.preventDefault();
        setSelectedCardIds([]);
        return;
      }

      if (key === "d") {
        event.preventDefault();
        setListDensity((previousDensity) => (previousDensity === "compact" ? "comfortable" : "compact"));
        return;
      }

      if (!hasSelection) {
        return;
      }

      if (key === "p") {
        event.preventDefault();
        runBulkStatusMutation("published");
        return;
      }

      if (key === "u") {
        event.preventDefault();
        runBulkStatusMutation("draft");
        return;
      }

      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        setBulkDeleteDialogOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [filteredCards, hasSelection, runBulkStatusMutation]);

  function handleClearFilters(): void {
    setStatusFilter(REVISION_LIBRARY_FILTER_ALL);
    setTypeFilter(FILTER_ALL_VALUE);
    setSubjectFilter(FILTER_ALL_VALUE);
    setLevelFilter(FILTER_ALL_VALUE);
    setQuickSearch("");
    replaceQuery({
      status: REVISION_LIBRARY_FILTER_ALL,
      type: FILTER_ALL_VALUE,
      subject: FILTER_ALL_VALUE,
      level: FILTER_ALL_VALUE,
    });
  }

  function toggleCardSelection(cardId: string): void {
    setSelectedCardIds((previousSelectedIds) =>
      previousSelectedIds.includes(cardId)
        ? previousSelectedIds.filter((existingId) => existingId !== cardId)
        : [...previousSelectedIds, cardId],
    );
  }

  function toggleSelectAllVisibleRows(): void {
    setSelectedCardIds(allVisibleSelected ? [] : filteredCards.map((card) => card.id));
  }

  return (
    <div className="space-y-4">
      <Card className="sticky top-3 z-20 border-brand-100/45 bg-bg-base/95 backdrop-blur supports-[backdrop-filter]:bg-bg-base/85">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Filters</CardTitle>
              <CardDescription>Compact table, bulk actions, and keyboard shortcuts for faster operations.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{filteredCards.length} resultat(s)</Badge>
              {hasActiveFilters ? (
                <Button type="button" variant="tertiary" size="sm" onClick={handleClearFilters}>
                  Reset
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasRemoteFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              {subjectFilter !== FILTER_ALL_VALUE ? <Badge variant="info">Subject: {subjectFilter}</Badge> : null}
              {typeFilter !== FILTER_ALL_VALUE ? <Badge variant="info">Type: {typeFilter}</Badge> : null}
              {levelFilter !== FILTER_ALL_VALUE ? <Badge variant="info">Level: {levelFilter}</Badge> : null}
              {statusFilter !== REVISION_LIBRARY_FILTER_ALL ? (
                <Badge variant="info">Status: {REVISION_LIBRARY_STATUS_LABELS[statusFilter]}</Badge>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1.5">
              <label htmlFor="revision-filter-subject" className="text-sm font-semibold text-text-primary">
                Subject
              </label>
              <Select
                id="revision-filter-subject"
                value={subjectFilter}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSubjectFilter(nextValue);
                  replaceQuery({ subject: nextValue });
                }}
              >
                <option value={FILTER_ALL_VALUE}>All subjects</option>
                {subjectOptions.map((subjectOption) => (
                  <option key={subjectOption} value={subjectOption}>
                    {subjectOption}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="revision-filter-type" className="text-sm font-semibold text-text-primary">
                Type
              </label>
              <Select
                id="revision-filter-type"
                value={typeFilter}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue !== FILTER_ALL_VALUE && !isTypeFilterValue(nextValue)) {
                    return;
                  }
                  setTypeFilter(nextValue);
                  replaceQuery({ type: nextValue });
                }}
              >
                <option value={FILTER_ALL_VALUE}>All types</option>
                {TYPE_FILTER_OPTIONS.map((typeOption) => (
                  <option key={typeOption.value} value={typeOption.value}>
                    {typeOption.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="revision-filter-level" className="text-sm font-semibold text-text-primary">
                Level
              </label>
              <Select
                id="revision-filter-level"
                value={levelFilter}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setLevelFilter(nextValue);
                  replaceQuery({ level: nextValue });
                }}
              >
                <option value={FILTER_ALL_VALUE}>All levels</option>
                {levelOptions.map((levelOption) => (
                  <option key={levelOption} value={levelOption}>
                    {levelOption}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="revision-filter-status" className="text-sm font-semibold text-text-primary">
                Status
              </label>
              <Select
                id="revision-filter-status"
                value={statusFilter}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (!isRevisionLibraryStatusFilter(nextValue)) {
                    return;
                  }
                  setStatusFilter(nextValue);
                  replaceQuery({ status: nextValue });
                }}
              >
                {REVISION_LIBRARY_STATUS_FILTERS.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {REVISION_LIBRARY_STATUS_LABELS[statusOption]}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="revision-filter-search" className="text-sm font-semibold text-text-primary">
                Quick search
              </label>
              <Input
                id="revision-filter-search"
                value={quickSearch}
                onChange={(event) => {
                  setQuickSearch(event.target.value);
                }}
                placeholder="Title, subject, level..."
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <Select
              id="revision-density"
              value={listDensity}
              onChange={(event) => {
                const nextDensity = event.target.value;
                if (nextDensity === "compact" || nextDensity === "comfortable") {
                  setListDensity(nextDensity);
                }
              }}
              className="w-auto min-w-36"
            >
              <option value="compact">Compact table</option>
              <option value="comfortable">Comfortable rows</option>
            </Select>
            <span>Shortcuts: Ctrl/Cmd+A select all, P publish, U unpublish, Delete remove, / search, D density.</span>
          </div>
        </CardContent>
      </Card>

      {errorMessage ? (
        <Card className="border-status-error/40">
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-status-error">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {cards.length === 0 ? (
        <div className="space-y-3">
          <EmptyState
            icon="L"
            title="No revision cards"
            description="Nouvelle fiche: Create a minimal draft card manually (subject, type, level, title). Generer une fiche: Create an AI-assisted draft from subject, level, and topic."
            action={{
              label: "Nouvelle fiche",
              onClick: () => {
                router.push("/parent/revisions/new");
              },
            }}
          />
          <div className="flex justify-center">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                router.push("/parent/revisions/generate");
              }}
            >
              Generer une fiche
            </Button>
          </div>
        </div>
      ) : filteredCards.length === 0 ? (
        <EmptyState
          icon="L"
          title="Aucun resultat"
          description="Aucune fiche ne correspond a la recherche rapide."
          action={{
            label: "Effacer la recherche",
            onClick: () => {
              setQuickSearch("");
            },
          }}
        />
      ) : (
        <div className="space-y-3">
          {hasSelection ? (
            <Card className="border-brand-200 bg-brand-50/50">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                <p className="text-sm font-semibold text-text-primary">{selectedCards.length} fiche(s) selectionnee(s)</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    loading={pendingKey === "bulk:status:published"}
                    disabled={isMutating}
                    onClick={() => runBulkStatusMutation("published")}
                  >
                    Publier selection
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    loading={pendingKey === "bulk:status:draft"}
                    disabled={isMutating}
                    onClick={() => runBulkStatusMutation("draft")}
                  >
                    Depublier selection
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={isMutating}
                    onClick={() => setBulkDeleteDialogOpen(true)}
                  >
                    Supprimer selection
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="tertiary"
                    disabled={isMutating}
                    onClick={() => setSelectedCardIds([])}
                  >
                    Effacer selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="overflow-x-auto rounded-radius-lg border border-border-subtle bg-bg-surface/80">
            <table className="min-w-full text-sm">
              <thead className="bg-bg-base/75 text-left text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all visible cards"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisibleRows}
                    />
                  </th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((card) => {
                  const isSelected = selectedCardIds.includes(card.id);
                  const isRowPending = pendingKey?.startsWith(`${card.id}:`) ?? false;
                  const nextStatus = toggleRevisionCardStatus(card.status);
                  const rowPadding = listDensity === "compact" ? "py-2" : "py-3.5";

                  return (
                    <tr
                      key={card.id}
                      className={`border-t border-border-subtle/80 ${isSelected ? "bg-brand-50/40" : "bg-transparent"}`}
                    >
                      <td className={`px-3 align-top ${rowPadding}`}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${card.title}`}
                          checked={isSelected}
                          onChange={() => toggleCardSelection(card.id)}
                        />
                      </td>
                      <td className={`px-3 align-top ${rowPadding}`}>
                        <p className="font-semibold text-text-primary">{card.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant={card.kind === REVISION_CARD_KIND_GENERIC ? "neutral" : "info"}>
                            {formatKind(card.kind)}
                          </Badge>
                          {card.sourceType === "book" ? (
                            <Badge variant="info">{card.sourceLabel ?? "Manuel"}</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className={`px-3 align-top ${rowPadding}`}>
                        <Badge variant="neutral">{card.subject}</Badge>
                      </td>
                      <td className={`px-3 align-top ${rowPadding}`}>
                        <Badge variant="neutral">{formatKind(card.kind)}</Badge>
                      </td>
                      <td className={`px-3 align-top ${rowPadding}`}>
                        {card.level ? <Badge variant="neutral">{card.level}</Badge> : <span className="text-text-secondary">-</span>}
                      </td>
                      <td className={`px-3 align-top ${rowPadding}`}>
                        <Badge variant={card.status === REVISION_CARD_STATUS_PUBLISHED ? "success" : "warning"}>
                          {card.status}
                        </Badge>
                      </td>
                      <td className={`px-3 align-top ${rowPadding}`}>
                        <span className="text-text-secondary">{formatUpdatedAt(card.updatedAt)}</span>
                      </td>
                      <td className={`px-3 align-top ${rowPadding}`}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Link href={`/parent/revisions/${card.id}`}>
                            <Button variant="tertiary" size="sm">
                              Open
                            </Button>
                          </Link>
                          <Link href={`/parent/revisions/${card.id}/edit`}>
                            <Button variant="secondary" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={isMutating}
                            loading={Boolean(isRowPending && pendingKey?.endsWith(":status"))}
                            onClick={() => {
                              runMutation(`${card.id}:status`, () =>
                                onSetStatusAction({
                                  cardId: card.id,
                                  status: nextStatus,
                                }),
                              );
                            }}
                          >
                            {card.status === REVISION_CARD_STATUS_PUBLISHED ? "Depublier" : "Publier"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={isMutating}
                            onClick={() => {
                              setDeleteTarget(card);
                            }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer cette fiche ?"
        {...(deleteTarget
          ? { description: `La fiche "${deleteTarget.title}" sera retiree de la bibliotheque.` }
          : {})}
        confirmLabel="Supprimer la fiche"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={Boolean(deleteTarget && pendingKey === `${deleteTarget.id}:delete`)}
        onCancel={() => {
          if (!isMutating) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }

          runMutation(
            `${deleteTarget.id}:delete`,
            () => onDeleteAction({ cardId: deleteTarget.id }),
            { closeDeleteDialog: true },
          );
        }}
      />

      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        title="Supprimer la selection ?"
        description={`Les ${selectedCards.length} fiches selectionnees seront supprimees.`}
        confirmLabel="Supprimer la selection"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={pendingKey === "bulk:delete"}
        onCancel={() => {
          if (!isMutating) {
            setBulkDeleteDialogOpen(false);
          }
        }}
        onConfirm={runBulkDeleteMutation}
      />
    </div>
  );
}
