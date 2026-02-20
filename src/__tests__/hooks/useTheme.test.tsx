import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

interface MatchMediaMock {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  matches: boolean;
}

function setMatchMedia(matches: boolean): MatchMediaMock {
  const mediaQueryMock: MatchMediaMock = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => mediaQueryMock),
  });

  return mediaQueryMock;
}

describe("useTheme", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    setMatchMedia(false);
  });

  it("utilise la preference systeme par defaut", async () => {
    setMatchMedia(true);
    const { useTheme } = await import("@/lib/hooks/useTheme");

    function Probe(): React.JSX.Element {
      const { theme } = useTheme();
      return <p>{theme}</p>;
    }

    render(<Probe />);

    expect(screen.getByText("system")).toBeInTheDocument();
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("charge le theme depuis localStorage et persiste le changement", async () => {
    window.localStorage.setItem("ezra-theme", "dark");
    const { useTheme } = await import("@/lib/hooks/useTheme");

    function Probe(): React.JSX.Element {
      const { theme, setTheme } = useTheme();
      return (
        <div>
          <p data-testid="theme">{theme}</p>
          <button type="button" onClick={() => setTheme("light")}>
            Clair
          </button>
        </div>
      );
    }

    render(<Probe />);

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");

    fireEvent.click(screen.getByRole("button", { name: "Clair" }));

    await waitFor(() => {
      expect(window.localStorage.getItem("ezra-theme")).toBe("light");
    });
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("toggleTheme alterne entre mode clair et sombre", async () => {
    const { useTheme } = await import("@/lib/hooks/useTheme");

    function Probe(): React.JSX.Element {
      const { toggleTheme } = useTheme();
      return (
        <button type="button" onClick={toggleTheme}>
          Basculer
        </button>
      );
    }

    render(<Probe />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Basculer" }));
    });
    expect(document.documentElement).toHaveClass("dark");

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Basculer" }));
    });
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
