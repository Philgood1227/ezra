import { describe, expect, it } from "vitest";
import {
  createRevisionCardInputSchema,
  revisionCardContentSchema,
  upsertRevisionProgressInputSchema,
} from "@/lib/revisions/validation";

describe("revision card schemas", () => {
  it("normalizes and validates revision content", () => {
    const parsed = revisionCardContentSchema.parse({
      summary: "  Table de 9  ",
      steps: [" Lire ", "Lire", " Calculer ", ""],
      examples: ["9 x 3 = 27", " 9 x 4 = 36 "],
      tips: ["Respire", " respire "],
      quiz: [
        {
          kind: "choices",
          prompt: " 9 x 7 ? ",
          choices: ["63", " 54 "],
          answerIndex: 0,
        },
      ],
    });

    expect(parsed.kind).toBe("generic");
    expect(parsed.summary).toBe("Table de 9");
    expect(parsed.steps).toEqual(["Lire", "Calculer"]);
    expect(parsed.tips).toEqual(["Respire"]);
    expect(parsed.quiz[0]).toMatchObject({
      kind: "choices",
      prompt: "9 x 7 ?",
      choices: ["63", "54"],
      answerIndex: 0,
    });
  });

  it("accepts each supported revision card kind", () => {
    const kinds = ["concept", "procedure", "vocab", "comprehension", "generic"] as const;

    kinds.forEach((kind) => {
      const parsed = revisionCardContentSchema.parse({
        kind,
        summary: "Resume",
        steps: ["Point cle"],
        examples: ["Exemple"],
        quiz: [],
        tips: ["Astuce"],
      });

      expect(parsed.kind).toBe(kind);
    });
  });

  it("rejects out-of-range answer index for choice questions", () => {
    const result = revisionCardContentSchema.safeParse({
      quiz: [
        {
          kind: "choices",
          prompt: "Question",
          choices: ["A", "B"],
          answerIndex: 2,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("validates create card and progress payloads", () => {
    const createPayload = createRevisionCardInputSchema.parse({
      title: " Reviser les fractions ",
      subject: " Mathematiques ",
      tags: [" fractions ", "Fractions"],
      status: "draft",
    });

    expect(createPayload.title).toBe("Reviser les fractions");
    expect(createPayload.subject).toBe("Mathematiques");
    expect(createPayload.tags).toEqual(["fractions"]);
    expect(createPayload.content.kind).toBe("generic");
    expect(createPayload.content.quiz).toEqual([]);

    const progressPayload = upsertRevisionProgressInputSchema.parse({
      revisionCardId: "5f5342f1-3307-44c3-aa8f-a95f0a30ef12",
      completedCount: 2,
      confidenceScore: 85,
      status: "in_progress",
    });

    expect(progressPayload.confidenceScore).toBe(85);
  });
});