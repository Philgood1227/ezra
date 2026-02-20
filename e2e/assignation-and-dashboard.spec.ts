import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
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

test("assignations parent/enfant visibles dans ma journee et dashboard", async ({ context, page }) => {
  test.setTimeout(60_000);
  resetDemoDayTemplatesStore("dev-family-id");
  resetDemoGamificationStore("dev-family-id");

  const suffix = Date.now().toString();
  const weekday = new Date().getDay();

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/categories");
  await page.locator("#category-name").fill(`Ecole ${suffix}`);
  await page.locator("#category-icon").fill("📚");
  await page.getByRole("button", { name: /^Ajouter$/i }).click();

  await page.goto(`/parent/day-templates/new?weekday=${weekday}`);
  await page.locator("#template-name").fill(`Journee assignee ${suffix}`);
  await page.getByRole("button", { name: /Cr/i }).first().click();
  await expect(page).toHaveURL(/\/parent\/day-templates\/.+/);

  await page.locator("#task-title").fill(`Tache parent ${suffix}`);
  await page.locator("#task-start").fill("08:00");
  await page.locator("#task-end").fill("08:30");
  await page.locator("#task-points").fill("2");
  await page.locator("#task-assignee").selectOption("dev-parent-id");
  await page.getByRole("button", { name: /Ajouter le bloc/i }).click();
  await expect(page.getByText(new RegExp(`Tache parent ${suffix}`)).first()).toBeVisible();

  await page.locator("#task-title").fill(`Tache enfant ${suffix}`);
  await page.locator("#task-start").fill("08:45");
  await page.locator("#task-end").fill("09:15");
  await page.locator("#task-points").fill("5");
  await page.locator("#task-assignee").selectOption("dev-child-id");
  await page.getByRole("button", { name: /Ajouter le bloc/i }).click();
  await expect(page.getByText(new RegExp(`Tache enfant ${suffix}`)).first()).toBeVisible();

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

  await page.goto("/child/my-day");
  const parentTaskCard = page
    .locator('[data-testid^="timeline-task-"]')
    .filter({ hasText: new RegExp(`Tache parent ${suffix}`) });
  const childTaskCard = page
    .locator('[data-testid^="timeline-task-"]')
    .filter({ hasText: new RegExp(`Tache enfant ${suffix}`) });

  await expect(parentTaskCard).toHaveCount(1);
  await expect(parentTaskCard.getByText(/^Parent Demo$|^Parent$|^Papa$|^Maman$/i)).toBeVisible();
  await expect(childTaskCard).toHaveCount(1);
  await expect(childTaskCard.getByText(/Moi/i)).toBeVisible();

  await context.clearCookies();
  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/dashboard");
  await expect(page.getByText(/Charge d'aujourd'hui/i)).toBeVisible();
  await expect(page.getByText(/Enfant: 1/i)).toBeVisible();
  await expect(page.getByText(/Parent Demo: 1/i)).toBeVisible();
});
