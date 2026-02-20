import { describe, expect, it } from "vitest";
import {
  getDominantEmotion,
  getEmotionEmoji,
  getEmotionLabel,
  getEmotionScore,
  getMoodSummaryMessage,
} from "@/lib/domain/emotion-logs";

describe("emotion logs domain", () => {
  it("mappe score, emoji et label", () => {
    expect(getEmotionScore("tres_content")).toBe(2);
    expect(getEmotionLabel("neutre")).toBe("Comme d'habitude");
    expect(getEmotionEmoji("triste")).toBe("🙁");
  });

  it("detecte l'emotion dominante", () => {
    expect(getDominantEmotion(["content", "content", "triste"])).toBe("content");
    expect(getDominantEmotion([])).toBeNull();
  });

  it("retourne un message de synthese", () => {
    expect(getMoodSummaryMessage(1.2)).toContain("ensoleillee");
    expect(getMoodSummaryMessage(-1.2)).toContain("nuages");
    expect(getMoodSummaryMessage(null)).toContain("Pas encore");
  });
});
