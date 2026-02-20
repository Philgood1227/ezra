import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { resetDemoCinemaStore } from "../src/lib/demo/cinema-store";
import { resetDemoDayTemplatesStore } from "../src/lib/demo/day-templates-store";
import { resetDemoGamificationStore } from "../src/lib/demo/gamification-store";

const DEV_PARENT_COOKIE = {
  name: "ezra_parent_dev_session",
  value: "parent-dev-session",
  domain: "127.0.0.1",
  path: "/",
  httpOnly: true,
  sameSite: "Lax" as const,
};

function createChildSessionToken(displayName: string): string {
  const payload = {
    profileId: "dev-child-id",
    familyId: "dev-family-id",
    displayName,
    role: "child",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", "ezra-dev-child-session-secret")
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

function getLocalDateKey(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("parent configure cinema puis enfant vote et film apparait dans ma journee", async ({ context, page }) => {
  resetDemoCinemaStore("dev-family-id");
  resetDemoDayTemplatesStore("dev-family-id");
  resetDemoGamificationStore("dev-family-id");

  const suffix = Date.now().toString();
  const todayKey = getLocalDateKey();
  const weekday = new Date().getDay();

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/categories");
  await page.locator("#category-name").fill(`Loisirs ${suffix}`);
  await page.locator("#category-icon").fill("🎬");
  await page.getByRole("button", { name: /Ajouter/i }).click();

  await page.goto(`/parent/day-templates/new?weekday=${weekday}`);
  await page.locator("#template-name").fill(`Journee cinema ${suffix}`);
  await page.getByRole("button", { name: /Cr/i }).first().click();
  await page.locator("#task-title").fill(`Routine ${suffix}`);
  await page.locator("#task-start").fill("07:30");
  await page.locator("#task-end").fill("08:00");
  await page.getByRole("button", { name: /Ajouter le bloc/i }).click();

  await page.goto("/parent/cinema");
  await page.locator("#cinema-date").fill(todayKey);
  await page.locator("#cinema-time").fill("20:30");
  await page.locator("#cinema-picker").selectOption("");

  const titleInputs = page.getByPlaceholder(/Film \d/i);
  await titleInputs.nth(0).fill(`Film A ${suffix}`);
  await titleInputs.nth(1).fill(`Film B ${suffix}`);
  await titleInputs.nth(2).fill(`Film C ${suffix}`);

  await page.getByRole("button", { name: /Enregistrer la session/i }).click();
  await expect(page.getByText(new RegExp(`Film A ${suffix}`))).toBeVisible();

  await context.addCookies([
    {
      name: "ezra_child_session",
      value: createChildSessionToken("Ezra"),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/child/cinema");
  await page.getByRole("button", { name: /Je choisis ce film/i }).first().click();
  await expect(page.getByText(/Film choisi|Ton choix est enregistre|Ton choix est enregistré/i).first()).toBeVisible();

  await page.goto("/child/my-day");
  const cinemaTaskCard = page
    .locator('[data-testid^="timeline-task-"]')
    .filter({ hasText: new RegExp(`Film : Film A ${suffix}`) });
  await expect(cinemaTaskCard).toHaveCount(1);
});
