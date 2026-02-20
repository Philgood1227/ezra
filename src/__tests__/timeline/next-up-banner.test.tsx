import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextUpBanner } from "@/components/timeline/next-up-banner";

describe("NextUpBanner", () => {
  it("affiche maintenant et ensuite", () => {
    render(
      <NextUpBanner
        currentTask={{ title: "Lecture", icon: "??", endTime: "18:00" }}
        nextTask={{ title: "Douche", icon: "??", startTime: "18:15" }}
      />,
    );

    expect(screen.getByText(/Maintenant: Lecture jusqu'a 18:00/i)).toBeInTheDocument();
    expect(screen.getByText(/Ensuite: Douche a 18:15/i)).toBeInTheDocument();
  });

  it("affiche un message vide sans tache", () => {
    render(<NextUpBanner currentTask={null} nextTask={null} />);
    expect(screen.getByText("Rien pour le moment")).toBeInTheDocument();
  });
});
