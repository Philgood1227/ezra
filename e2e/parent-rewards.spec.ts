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

test("le parent cree une recompense prise en compte dans l'objectif points cote enfant", async ({
  context,
  page,
}) => {
  resetDemoDayTemplatesStore("dev-family-id");
  resetDemoGamificationStore("dev-family-id");

  const suffix = Date.now().toString();
  const weekday = new Date().getDay();
  const rewardLabel = `Bonus ${suffix}`;

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/categories");
  await page.locator("#category-name").fill(`Routine ${suffix}`);
  await page.locator("#category-icon").fill("📚");
  await page.getByRole("button", { name: /Ajouter/i }).click();

  await page.goto(`/parent/day-templates/new?weekday=${weekday}`);
  await page.locator("#template-name").fill(`Journee ${suffix}`);
  await page.getByRole("button", { name: /Creer|Créer/i }).click();

  await page.locator("#task-title").fill(`Bloc ${suffix}`);
  await page.locator("#task-start").fill("07:30");
  await page.locator("#task-end").fill("08:00");
  await page.locator("#task-points").fill("2");
  await page.getByRole("button", { name: /Ajouter le bloc/i }).click();

  await page.goto("/parent/rewards");
  await page.locator("#reward-label").fill(rewardLabel);
  await page.locator("#reward-points").fill("30");
  await page.locator("#reward-description").fill("30 min d'ecran");
  await page.getByRole("button", { name: /Ajouter une r.compense|Ajouter/i }).click();
  await expect(page.getByText(rewardLabel)).toBeVisible();

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

  await page.goto("/child");
  await expect(page.getByText(/Today's points/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Continuer ma journ\u00E9e" }).click();
  await page.waitForURL(/\/child\/my-day/, { timeout: 15_000 });

  await expect(page.getByText(/Points du jour\s*:\s*0\/30/i)).toBeVisible();
});
