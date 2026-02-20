import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "@/components/ds";

describe("Skeleton", () => {
  it("rend un bloc shimmer", () => {
    const { container } = render(<Skeleton className="h-4 w-full" />);
    const skeleton = container.firstElementChild;
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass("before:animate-shimmer");
  });

  it("rend plusieurs lignes avec count", () => {
    const { container } = render(<Skeleton className="h-4 w-full" count={3} />);
    const blocks = container.querySelectorAll(".before\\:animate-shimmer");
    expect(blocks.length).toBe(3);
  });
});
