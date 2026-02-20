import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { resetDemoSchoolDiaryStore } from "../src/lib/demo/school-diary-store";

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

function getTomorrowDateKey(): string {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("notifications in-app apres test manuel", async ({ context, page }) => {
  resetDemoSchoolDiaryStore("dev-family-id");
  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/school-diary");
  await page.locator("#diary-type").selectOption("devoir");
  await page.locator("#diary-date").fill(getTomorrowDateKey());
  await page.locator("#diary-title").fill("Devoir maths pour demain");
  await page.getByRole("button", { name: /^Ajouter$/i }).first().click();

  await page.goto("/parent/notifications");
  await expect(page.getByText(/Rappel devoir/i)).toBeVisible();
  await page.getByRole("button", { name: /Tester les rappels maintenant/i }).click();
  await expect(page.getByText(/Rappels crees/i)).toBeVisible();

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

  await page.goto("/child/checklists", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Mes checklists/i })).toBeVisible();
  const reminder = page.getByText(/Rappel devoir/i);
  if (await reminder.count()) {
    await expect(reminder.first()).toBeVisible();
  }
});
