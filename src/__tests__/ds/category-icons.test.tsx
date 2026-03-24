import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryIcon, CATEGORY_ICON_KEYS, resolveCategoryIcon } from "@/components/ds/category-icons";
import { DEFAULT_CATEGORY_ICON_KEY } from "@/lib/day-templates/constants";

describe("category icon resolver", () => {
  it("returns a renderable icon component for every allowed icon key", () => {
    for (const iconKey of CATEGORY_ICON_KEYS) {
      const Icon = resolveCategoryIcon(iconKey);
      const { container, unmount } = render(<Icon className="size-4" />);
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });

  it("returns the default component for unknown icon keys", () => {
    const unknown = resolveCategoryIcon("__not-a-category-icon__");
    const fallback = resolveCategoryIcon(DEFAULT_CATEGORY_ICON_KEY);

    expect(unknown).toBe(fallback);
  });

  it("renders through CategoryIcon wrapper with unknown keys", () => {
    const { container } = render(<CategoryIcon iconKey="__bad-key__" className="size-4" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
