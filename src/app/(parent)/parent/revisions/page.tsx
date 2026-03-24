import { PageLayout } from "@/components/ds";
import {
  GenerateRevisionLink,
  NewRevisionLink,
  RevisionLibraryClient,
} from "@/components/parent/revisions";
import {
  deleteRevisionCardAction,
  setRevisionCardStatusAction,
  type RevisionCardManagementActionResult,
} from "@/lib/actions/revisions";
import { listStoredRevisionCards, type ListRevisionCardsParams } from "@/lib/api/revisions";
import type {
  CardType,
  RevisionCardLibraryItem,
  RevisionCardStatus,
  StoredRevisionCard,
} from "@/lib/revisions/types";

interface ParentRevisionsPageProps {
  searchParams: Promise<{
    status?: string | string[];
    type?: string | string[];
    kind?: string | string[];
    subject?: string | string[];
    level?: string | string[];
  }>;
}

interface ParentListFilters {
  status?: RevisionCardStatus;
  type?: CardType;
  subject?: string;
  level?: string;
}

function toSingleSearchParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function normalizeStringFilter(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function toStatusFilter(value: string | null): RevisionCardStatus | undefined {
  return value === "draft" || value === "published" ? value : undefined;
}

function toTypeFilter(value: string | null): CardType | undefined {
  if (!value) {
    return undefined;
  }

  if (value === "concept" || value === "procedure" || value === "vocab" || value === "comprehension") {
    return value;
  }

  return undefined;
}

function toLibraryItem(card: StoredRevisionCard): RevisionCardLibraryItem {
  const sourceType = card.content.source?.sourceType;
  const sourceLabel =
    sourceType === "book"
      ? card.content.source?.bookTitle
        ? `Livre: ${card.content.source.bookTitle}`
        : "Manuel"
      : null;

  return {
    id: card.id,
    title: card.title,
    subject: card.subject,
    level: card.level,
    tags: card.tags,
    kind: card.content.kind,
    status: card.status,
    ...(sourceType ? { sourceType } : {}),
    ...(sourceLabel ? { sourceLabel } : {}),
    createdByProfileId: card.createdByProfileId,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

export default async function ParentRevisionsPage({
  searchParams,
}: ParentRevisionsPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const typeParam = toSingleSearchParam(params.type) ?? toSingleSearchParam(params.kind);
  const statusFilter = toStatusFilter(toSingleSearchParam(params.status));
  const typeFilter = toTypeFilter(typeParam);
  const subjectFilter = normalizeStringFilter(toSingleSearchParam(params.subject));
  const levelFilter = normalizeStringFilter(toSingleSearchParam(params.level));
  const filters: ParentListFilters = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(subjectFilter ? { subject: subjectFilter } : {}),
    ...(levelFilter ? { level: levelFilter } : {}),
  };

  const listParams: ListRevisionCardsParams = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(subjectFilter ? { subject: subjectFilter } : {}),
    ...(levelFilter ? { level: levelFilter } : {}),
    limit: 30,
  };

  const storedCards = await listStoredRevisionCards(listParams);
  const cards = storedCards.map(toLibraryItem);

  async function submitSetStatusAction(input: {
    cardId: string;
    status: RevisionCardStatus;
  }): Promise<RevisionCardManagementActionResult> {
    "use server";

    return setRevisionCardStatusAction(input);
  }

  async function submitDeleteAction(input: {
    cardId: string;
  }): Promise<RevisionCardManagementActionResult> {
    "use server";

    return deleteRevisionCardAction(input);
  }

  return (
    <PageLayout
      title="Revisions"
      subtitle="Nouvelle fiche: Create a minimal draft card manually (subject, type, level, title). Generer une fiche: Create an AI-assisted draft from subject, level, and topic."
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <NewRevisionLink />
          <GenerateRevisionLink />
        </div>
      )}
      className="max-w-6xl"
    >
      <RevisionLibraryClient
        cards={cards}
        filters={filters}
        onSetStatusAction={submitSetStatusAction}
        onDeleteAction={submitDeleteAction}
      />
    </PageLayout>
  );
}
