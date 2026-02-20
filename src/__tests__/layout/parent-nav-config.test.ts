import { describe, expect, it } from "vitest";
import {
  parentNavFooterItems,
  parentNavSections,
} from "@/config/parent-nav";

function normalizeNavSections() {
  return parentNavSections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      icon: item.icon.name,
    })),
  }));
}

function normalizeFooterItems() {
  return parentNavFooterItems.map((item) => ({
    ...item,
    icon: item.icon.name,
  }));
}

describe("parentNavSections", () => {
  it("conserve la structure de navigation parent", () => {
    expect({
      sections: normalizeNavSections(),
      footer: normalizeFooterItems(),
    }).toMatchSnapshot();
  });
});

