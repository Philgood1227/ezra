import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentTime } from "@/lib/hooks/useCurrentTime";

describe("useCurrentTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 10, 16, 37, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates the current date every second", () => {
    const { result } = renderHook(() => useCurrentTime());

    expect(result.current.hours24).toBe(16);
    expect(result.current.minutes).toBe(37);
    expect(result.current.seconds).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.seconds).toBe(1);
  });
});

