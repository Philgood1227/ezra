import { describe, expect, it } from "vitest";
import { formatHeure, getNomJour, getNomMois, getNomsMois } from "@/lib/utils/time";

describe("time helpers", () => {
  it("formats 24h french time", () => {
    const date = new Date(2026, 1, 10, 16, 37, 42);
    expect(formatHeure(date)).toBe("16:37");
  });

  it("returns french day and month names", () => {
    const date = new Date(2026, 1, 10, 16, 37, 42);
    expect(getNomJour(date)).toBe("Mardi");
    expect(getNomMois(date)).toBe("février");
  });

  it("returns the 12 french month names", () => {
    const months = getNomsMois();
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("janvier");
    expect(months[6]).toBe("juillet");
    expect(months[11]).toBe("décembre");
  });
});

