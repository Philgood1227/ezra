import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ListRevisionCardsParams,
} from "@/lib/api/revisions";
import type { RevisionCardLibraryItem, StoredRevisionCard } from "@/lib/revisions/types";

const listStoredRevisionCardsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/revisions", () => ({
  listStoredRevisionCards: listStoredRevisionCardsMock,
}));

vi.mock("@/lib/actions/revisions", () => ({
  deleteRevisionCardAction: vi.fn(),
  setRevisionCardStatusAction: vi.fn(),
}));

interface LibraryClientProps {
  cards: RevisionCardLibraryItem[];
  filters: {
    status?: "draft" | "published";
    type?: "concept" | "procedure" | "vocab" | "comprehension";
    subject?: string;
    level?: string;
  };
}

vi.mock("@/components/parent/revisions", () => ({
  NewRevisionLink: () => <span>new-link</span>,
  GenerateRevisionLink: () => <span>generate-link</span>,
  RevisionLibraryClient: ({ cards, filters }: LibraryClientProps) => (
    <section>
      <p data-testid="filters">{JSON.stringify(filters)}</p>
      <ul>
        {cards.map((card) => (
          <li key={card.id}>{`${card.title}|${card.subject}|${card.kind}|${card.level ?? ""}|${card.status}`}</li>
        ))}
      </ul>
    </section>
  ),
}));

import ParentRevisionsPage from "@/app/(parent)/parent/revisions/page";

function buildStoredCard(overrides: Partial<StoredRevisionCard> = {}): StoredRevisionCard {
  return {
    id: "card-1",
    familyId: "family-1",
    createdByProfileId: "parent-1",
    title: "Fractions equivalentes",
    subject: "Mathematiques",
    level: "6P",
    tags: [],
    status: "draft",
    content: {
      kind: "concept",
      summary: null,
      steps: [],
      examples: [],
      quiz: [],
      tips: [],
    },
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("ParentRevisionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listStoredRevisionCardsMock.mockResolvedValue([
      buildStoredCard(),
      buildStoredCard({
        id: "card-2",
        title: "Vocabulaire allemand",
        subject: "Allemand",
        level: "7P",
        status: "published",
        content: {
          kind: "vocab",
          summary: null,
          steps: [],
          examples: [],
          quiz: [],
          tips: [],
        },
      }),
    ]);
  });

  it("renders revision rows and passes subject/type/level/status filters", async () => {
    const element = await ParentRevisionsPage({
      searchParams: Promise.resolve({
        subject: "Mathematiques",
        type: "concept",
        level: "6P",
        status: "draft",
      }),
    });

    render(element);

    expect(listStoredRevisionCardsMock).toHaveBeenCalledWith({
      subject: "Mathematiques",
      type: "concept",
      level: "6P",
      status: "draft",
      limit: 30,
    } satisfies ListRevisionCardsParams);
    expect(screen.getByText("new-link")).toBeInTheDocument();
    expect(screen.getByText("generate-link")).toBeInTheDocument();
    expect(screen.getByText("Fractions equivalentes|Mathematiques|concept|6P|draft")).toBeInTheDocument();
    expect(screen.getByText("Vocabulaire allemand|Allemand|vocab|7P|published")).toBeInTheDocument();
  });

  it("accepts legacy `kind` query param as type filter", async () => {
    const element = await ParentRevisionsPage({
      searchParams: Promise.resolve({
        kind: "procedure",
      }),
    });

    render(element);

    expect(listStoredRevisionCardsMock).toHaveBeenCalledWith({
      status: undefined,
      type: "procedure",
      subject: undefined,
      level: undefined,
      limit: 30,
    });
  });
});
