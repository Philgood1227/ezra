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

test("l'enfant valide une tache, gagne des points et ouvre le mode focus", async ({
  context,
  page,
}) => {
  resetDemoDayTemplatesStore("dev-family-id");
  resetDemoGamificationStore("dev-family-id");

  const suffix = Date.now().toString();
  const weekday = new Date().getDay();

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/categories");
  await page.locator("#category-name").fill(`Routine ${suffix}`);
  await page.locator("#category-icon").fill("🧩");
  await page.getByRole("button", { name: /Ajouter/i }).click();

  await page.goto(`/parent/day-templates/new?weekday=${weekday}`);
  await page.locator("#template-name").fill(`Gamification ${suffix}`);
  await page.getByRole("button", { name: /Creer|Créer/i }).click();

  await page.locator("#task-title").fill(`Mission 1 ${suffix}`);
  await page.locator("#task-start").fill("07:30");
  await page.locator("#task-end").fill("08:00");
  await page.locator("#task-points").fill("3");
  await page.getByRole("button", { name: /Ajouter le bloc/i }).click();

  await page.locator("#task-title").fill(`Mission 2 ${suffix}`);
  await page.locator("#task-start").fill("08:10");
  await page.locator("#task-end").fill("08:30");
  await page.locator("#task-points").fill("2");
  await page.getByRole("button", { name: /Ajouter le bloc/i }).click();

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
  await expect(page.getByText(/Points du jour/i)).toBeVisible();
  await page.getByRole("button", { name: /Mode focus/i }).first().click();
  await expect(page.getByText(/Mode focus/i)).toBeVisible();
  await page.getByRole("button", { name: "Pomodoro" }).click();
  await page.getByRole("button", { name: /Terminer la mission/i }).click();
  await expect(page.getByText(/Bravo ! Tu as tenu/i)).toBeVisible();
  await page.getByRole("button", { name: /Terminer la t.che/i }).click();
  await expect(page).toHaveURL(/\/child\/my-day/);

  await page.goto("/child/my-day");
  await expect(page.getByText(/Points du jour/i)).toBeVisible();
  const completedCard = page
    .locator('[data-testid^="timeline-task-"]')
    .filter({ hasText: new RegExp(`Mission 1 ${suffix}`) });
  await expect(completedCard.getByText(/\+3 pts/i)).toBeVisible();
});
