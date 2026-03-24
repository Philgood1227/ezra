import type {
  RevisionCardKind,
  RevisionCardStatus,
  RevisionLibraryKindFilter,
  RevisionLibraryStatusFilter,
} from "@/lib/revisions/types";
import {
  revisionCardKindSchema,
  revisionCardStatusSchema,
} from "@/lib/revisions/validation";

export const REVISION_CARD_STATUSES = revisionCardStatusSchema.options;
export const REVISION_CARD_KINDS = revisionCardKindSchema.options;
export const REVISION_LIBRARY_FILTER_ALL = "all" as const;

export const REVISION_CARD_STATUS_PUBLISHED: RevisionCardStatus = "published";
export const REVISION_CARD_STATUS_DRAFT: RevisionCardStatus = "draft";
export const REVISION_CARD_KIND_GENERIC: RevisionCardKind = "generic";

export const REVISION_LIBRARY_STATUS_FILTERS = [
  REVISION_LIBRARY_FILTER_ALL,
  ...REVISION_CARD_STATUSES,
] as const satisfies readonly RevisionLibraryStatusFilter[];

export const REVISION_LIBRARY_KIND_FILTERS = [
  REVISION_LIBRARY_FILTER_ALL,
  ...REVISION_CARD_KINDS,
] as const satisfies readonly RevisionLibraryKindFilter[];

export const REVISION_CARD_KIND_LABELS: Record<RevisionCardKind, string> = {
  generic: "Generic",
  concept: "Concept",
  procedure: "Procedure",
  vocab: "Vocab",
  comprehension: "Comprehension",
};

export const REVISION_LIBRARY_STATUS_LABELS: Record<RevisionLibraryStatusFilter, string> = {
  all: "all",
  draft: "draft",
  published: "published",
};

export const REVISION_LIBRARY_KIND_LABELS: Record<RevisionLibraryKindFilter, string> = {
  all: "all",
  generic: "generic",
  concept: "concept",
  procedure: "procedure",
  vocab: "vocab",
  comprehension: "comprehension",
};

export function isRevisionCardStatus(value: string): value is RevisionCardStatus {
  return revisionCardStatusSchema.safeParse(value).success;
}

export function isRevisionCardKind(value: string): value is RevisionCardKind {
  return revisionCardKindSchema.safeParse(value).success;
}

export function isRevisionLibraryStatusFilter(value: string): value is RevisionLibraryStatusFilter {
  return value === REVISION_LIBRARY_FILTER_ALL || isRevisionCardStatus(value);
}

export function isRevisionLibraryKindFilter(value: string): value is RevisionLibraryKindFilter {
  return value === REVISION_LIBRARY_FILTER_ALL || isRevisionCardKind(value);
}

export function toggleRevisionCardStatus(status: RevisionCardStatus): RevisionCardStatus {
  return status === REVISION_CARD_STATUS_PUBLISHED ? REVISION_CARD_STATUS_DRAFT : REVISION_CARD_STATUS_PUBLISHED;
}
