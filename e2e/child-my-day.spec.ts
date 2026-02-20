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

test("timeline premium et focus s'affichent cote enfant", async ({ context, page }) => {
  resetDemoDayTemplatesStore("dev-family-id");
  resetDemoGamificationStore("dev-family-id");

  const suffix = Date.now().toString();
  const weekday = new Date().getDay();
  const categoryName = `Ecole ${suffix}`;
  const templateName = `Planning enfant ${suffix}`;
  const firstTask = `Depart ${suffix}`;
  const secondTask = `Retour ${suffix}`;
  const firstStart = "08:00";
  const firstEnd = "08:30";
  const secondStart = "09:00";
  const secondEnd = "09:30";

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/categories");
  await page.locator("#category-name").fill(categoryName);
  await page.locator("#category-icon").fill("📚");
  await page.getByRole("button", { name: /Ajouter/ }).click();
  await expect(page.getByText(categoryName)).toBeVisible();

  await page.goto(`/parent/day-templates/new?weekday=${weekday}`);
  await page.locator("#template-name").fill(templateName);
  await page.getByRole("button", { name: /Créer|Creer/ }).click();

  await page.locator("#task-title").fill(firstTask);
  await page.locator("#task-start").fill(firstStart);
  await page.locator("#task-end").fill(firstEnd);
  await page.getByRole("button", { name: "Ajouter le bloc" }).click();

  await page.locator("#task-title").fill(secondTask);
  await page.locator("#task-start").fill(secondStart);
  await page.locator("#task-end").fill(secondEnd);
  await page.getByRole("button", { name: "Ajouter le bloc" }).click();

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

  await expect(page.getByRole("heading", { name: /Ma journée|Ma journee/i })).toBeVisible();
  await expect(page.getByLabel("Maintenant et ensuite")).toBeVisible();
  const primaryTaskCard = page
    .locator('[data-testid^="timeline-task-"]')
    .filter({ hasText: new RegExp(firstTask) });
  await expect(primaryTaskCard).toHaveCount(1);

  await primaryTaskCard.getByRole("button", { name: "Commencer" }).click();
  await expect(primaryTaskCard.getByText("En cours")).toBeVisible();

  await primaryTaskCard.getByRole("button", { name: "Mode focus" }).click();
  if (!/\/child\/focus\//.test(page.url())) {
    const primaryCardTestId = await primaryTaskCard.first().getAttribute("data-testid");
    const instanceId = primaryCardTestId?.replace("timeline-task-", "");
    if (instanceId) {
      await page.goto(`/child/focus/${instanceId}`);
    }
  }
  await expect(page).toHaveURL(/\/child\/focus\//);
  await expect(page.getByRole("button", { name: /Timer simple/i })).toBeVisible();
  await expect(page.getByText(/Tu peux gagner/i)).toBeVisible();
});
