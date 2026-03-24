import { describe, expect, it } from "vitest";
import {
  REVISION_CARD_KINDS,
  REVISION_CARD_STATUSES,
  REVISION_LIBRARY_FILTER_ALL,
  REVISION_LIBRARY_KIND_FILTERS,
  REVISION_LIBRARY_STATUS_FILTERS,
} from "@/lib/revisions/constants";
import {
  revisionCardKindSchema,
  revisionCardStatusSchema,
} from "@/lib/revisions/validation";

describe("revisions constants", () => {
  it("keeps status constants aligned with the zod schema", () => {
    expect(REVISION_CARD_STATUSES).toEqual(revisionCardStatusSchema.options);
    expect(REVISION_LIBRARY_STATUS_FILTERS).toEqual([REVISION_LIBRARY_FILTER_ALL, ...revisionCardStatusSchema.options]);
  });

  it("keeps kind constants aligned with the zod schema", () => {
    expect(REVISION_CARD_KINDS).toEqual(revisionCardKindSchema.options);
    expect(REVISION_LIBRARY_KIND_FILTERS).toEqual([REVISION_LIBRARY_FILTER_ALL, ...revisionCardKindSchema.options]);
  });
});
