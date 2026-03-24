import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { TimelineTaskCard } from "@/components/timeline/timeline-task-card";

type TimelineTaskCardProps = ComponentProps<typeof TimelineTaskCard>;

const baseProps: Omit<TimelineTaskCardProps, "status"> = {
  instanceId: "task-1",
  title: "Lecture",
  startTime: "08:00",
  endTime: "08:30",
  category: {
    name: "Calme",
    icon: "knowledge",
    colorKey: "category-calme",
  },
  assignedTo: { displayName: "Ezra", role: "child" },
  pointsBase: 4,
  pointsEarned: 0,
  isPast: false,
  isCurrent: false,
  isFuture: true,
  hasLinkedKnowledgeCard: false,
  onStatusChange: vi.fn(),
  onFocusMode: vi.fn(),
};

describe("TimelineTaskCard", () => {
  it("rend les statuts principaux", () => {
    const { rerender } = render(<TimelineTaskCard {...baseProps} status="a_faire" />);
    expect(screen.getByText("A faire")).toBeInTheDocument();

    rerender(<TimelineTaskCard {...baseProps} status="en_cours" isCurrent />);
    expect(screen.getAllByText("En cours").length).toBeGreaterThanOrEqual(1);

    rerender(<TimelineTaskCard {...baseProps} status="termine" pointsEarned={4} />);
    expect(screen.getByText(/Termine/)).toBeInTheDocument();
    expect(screen.getByText(/\+4 pts/)).toBeInTheDocument();

    rerender(<TimelineTaskCard {...baseProps} status="a_faire" isPast isFuture={false} />);
    expect(screen.getByText(/En retard/)).toBeInTheDocument();
  });

  it("attenue visuellement les taches passees", () => {
    render(<TimelineTaskCard {...baseProps} status="a_faire" isPast isFuture={false} />);
    const card = screen.getByTestId("timeline-task-task-1");
    expect(card.className).toMatch(/opacity-8[05]/);
  });

  it("affiche un indicateur pulse pour la tache en cours", () => {
    render(<TimelineTaskCard {...baseProps} status="en_cours" isCurrent />);
    const indicators = screen.getAllByText("En cours");
    expect(indicators.some((element) => element.className.includes("animate-pulse"))).toBeTruthy();
  });

  it("declenche la transition vers en_cours puis termine", () => {
    const onStatusChange = vi.fn();
    const { rerender } = render(<TimelineTaskCard {...baseProps} status="a_faire" onStatusChange={onStatusChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    expect(onStatusChange).toHaveBeenCalledWith("task-1", "en_cours");

    rerender(
      <TimelineTaskCard
        {...baseProps}
        status="en_cours"
        onStatusChange={onStatusChange}
        isCurrent
        isFuture={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    expect(onStatusChange).toHaveBeenCalledWith("task-1", "termine");
  });

  it("affiche l'animation de points quand la tache est validee", () => {
    render(<TimelineTaskCard {...baseProps} status="termine" pointsFlyUp={5} />);
    expect(screen.getByText("+5 points")).toBeInTheDocument();
  });
});
