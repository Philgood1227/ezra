import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ds";

describe("Button", () => {
  it("renders label and primary variant", () => {
    render(<Button>Press</Button>);
    const button = screen.getByRole("button", { name: "Press" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("from-brand-primary");
  });

  it("supports secondary variant and disabled state", () => {
    render(
      <Button variant="secondary" disabled>
        Disabled
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("border-border-default");
  });
});
