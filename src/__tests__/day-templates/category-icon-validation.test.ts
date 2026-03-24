import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseEnabled: () => false,
}));

vi.mock("@/lib/auth/current-profile", () => ({
  getCurrentProfile: vi.fn(),
}));

import { DEFAULT_CATEGORY_ICON_KEY, parseCategoryIconKey } from "@/lib/day-templates/constants";
import { categoryInputSchema } from "@/lib/day-templates/category-validation";

describe("parseCategoryIconKey", () => {
  it.each([undefined, null, "", "   ", "emoji-icon", "https://cdn.example.com/icon.svg", "unknown"])(
    "returns default for invalid value (%s)",
    (rawValue) => {
      expect(parseCategoryIconKey(rawValue as string | null | undefined)).toBe(DEFAULT_CATEGORY_ICON_KEY);
    },
  );
});

describe("categoryInputSchema icon validation", () => {
  it("rejects invalid icon keys", () => {
    const result = categoryInputSchema.safeParse({
      name: "Routine",
      icon: "emoji-icon",
      colorKey: "category-routine",
      defaultItemKind: "mission",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected icon key validation to fail.");
    }

    expect(result.error.flatten().fieldErrors.icon?.[0]).toContain("Cle d'icone invalide");
  });

  it("accepts semantic icon keys", () => {
    const result = categoryInputSchema.safeParse({
      name: "Ecole",
      icon: "school",
      colorKey: "category-ecole",
      defaultItemKind: "mission",
    });

    expect(result.success).toBe(true);
  });
});
