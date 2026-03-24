import { describe, expect, it } from "vitest";
import {
  sanitizeMissionHtml,
  splitMissionInstructionsHtml,
} from "@/lib/day-templates/instructions";

describe("mission instructions utilities", () => {
  it("sanitizes mission html while preserving lists and safe links", () => {
    const sanitized = sanitizeMissionHtml([
      "<p>Plan</p>",
      "<ul><li>Etape 1</li><li>Etape 2</li></ul>",
      "<p><a href=\"https://example.com\" target=\"_blank\">Lien utile</a></p>",
      "<p><a href=\"javascript:alert(1)\">Lien dangereux</a></p>",
      "<script>alert('x')</script>",
    ].join(""));

    expect(sanitized).toContain("<ul>");
    expect(sanitized).toContain("<li>Etape 1</li>");
    expect(sanitized).toContain("href=\"https://example.com\"");
    expect(sanitized).toContain("noopener");
    expect(sanitized).toContain("noreferrer");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("javascript:");
  });

  it("extracts Astuce blockquote into tipHtml", () => {
    const sections = splitMissionInstructionsHtml([
      "<p>Lis la lecon.</p>",
      "<blockquote><p>Astuce: Commence par les verbes.</p></blockquote>",
      "<ol><li>Relire</li></ol>",
    ].join(""));

    expect(sections.mainInstructionsHtml).toContain("Lis la lecon.");
    expect(sections.mainInstructionsHtml).toContain("<ol>");
    expect(sections.mainInstructionsHtml).not.toContain("Astuce:");
    expect(sections.tipHtml).toContain("Commence par les verbes.");
  });

  it("returns only mainInstructionsHtml when no Astuce marker exists", () => {
    const sections = splitMissionInstructionsHtml("<p>Consigne unique.</p>");

    expect(sections.mainInstructionsHtml).toContain("Consigne unique.");
    expect(sections.tipHtml).toBeNull();
  });
});
