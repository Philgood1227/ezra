import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildHomeNowCard } from "@/components/child/home/child-home-now-card";

const mockPush = vi.fn();
let prefersReducedMotion = false;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("framer-motion", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const motion = new Proxy(
    {},
    {
      get: (_, element) => {
        return ({ whileTap, ...props }: React.HTMLAttributes<HTMLElement> & { whileTap?: unknown }) =>
          React.createElement(element as string, {
            "data-while-tap": whileTap ? "true" : "false",
            ...props,
          });
      },
    },
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => prefersReducedMotion,
  };
});

describe("En ce moment card", () => {
  beforeEach(() => {
    mockPush.mockClear();
    prefersReducedMotion = false;
  });

  it("renders maintenant and ensuite task lines with times", () => {
    render(
      <ChildHomeNowCard
        nowState="active_task"
        currentTask={{
          title: "Naruto",
          iconKey: "leisure",
          colorKey: "category-ecole",
          startTime: "16:00",
          endTime: "17:00",
        }}
        nextTask={{
          title: "Devoir de Maths",
          iconKey: "homework",
          colorKey: "category-repas",
          startTime: "17:00",
          endTime: "17:30",
        }}
        activeSchoolBlockEndTime={null}
      />,
    );

    const card = screen.getByTestId("child-home-now-card");
    const title = screen.getByRole("heading", { name: "En ce moment" });
    expect(screen.getByText("En ce moment")).toBeInTheDocument();
    expect(screen.getByText("Maintenant")).toBeInTheDocument();
    expect(screen.getByText("ENSUITE")).toBeInTheDocument();
    expect(within(card).getByTestId("now-task-category-icon-category-ecole")).toBeInTheDocument();
    expect(screen.getByText("Naruto")).toBeInTheDocument();
    expect(screen.getByText("Jusqu'a 17:00")).toBeInTheDocument();
    expect(screen.getByText("Devoir de Maths")).toBeInTheDocument();
    expect(screen.getByText("17:00 - 17:30")).toBeInTheDocument();
    expect(within(card).getAllByRole("article")).toHaveLength(2);
    expect(card.className).toContain("overflow-hidden");
    expect(card.className).toContain("shadow-elevated");
    expect(card.className).toContain("md:p-3.5");
    expect(title.className).toContain("md:text-xl");

    fireEvent.click(screen.getByRole("button", { name: "Voir ma journee" }));
    expect(mockPush).toHaveBeenCalledWith("/child/my-day");
  });

  it("disables tap scale interaction when reduced motion is enabled", () => {
    prefersReducedMotion = true;

    const { container } = render(
      <ChildHomeNowCard
        nowState="active_task"
        currentTask={{
          title: "Naruto",
          iconKey: "leisure",
          colorKey: "category-ecole",
          startTime: "16:00",
          endTime: "17:00",
        }}
        nextTask={null}
        activeSchoolBlockEndTime={null}
      />,
    );

    const tapWrappers = container.querySelectorAll("[data-while-tap]");
    expect(tapWrappers.length).toBeGreaterThan(0);
    tapWrappers.forEach((wrapper) => {
      expect(wrapper).toHaveAttribute("data-while-tap", "false");
    });
  });
});
