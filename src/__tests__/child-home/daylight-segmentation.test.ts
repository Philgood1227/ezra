import { describe, expect, it } from "vitest";
import { classifyDaytimeSegment } from "@/lib/time/daylight";

describe("daylight segmentation", () => {
  const baseTimes = {
    sunriseMinutes: 7 * 60,
    solarNoonMinutes: 12 * 60 + 15,
    sunsetMinutes: 18 * 60 + 10,
  };

  it("returns nuit before sunrise", () => {
    const segment = classifyDaytimeSegment({
      currentMinutes: 6 * 60 + 10,
      ...baseTimes,
    });

    expect(segment).toBe("nuit");
  });

  it("returns matin between sunrise and noon", () => {
    const segment = classifyDaytimeSegment({
      currentMinutes: 9 * 60 + 30,
      ...baseTimes,
    });

    expect(segment).toBe("matin");
  });

  it("returns apres-midi between noon and sunset", () => {
    const segment = classifyDaytimeSegment({
      currentMinutes: 15 * 60 + 10,
      ...baseTimes,
    });

    expect(segment).toBe("apres-midi");
  });

  it("returns soir after sunset", () => {
    const segment = classifyDaytimeSegment({
      currentMinutes: 19 * 60 + 30,
      ...baseTimes,
    });

    expect(segment).toBe("soir");
  });
});
