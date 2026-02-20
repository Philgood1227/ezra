import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { resetDemoDayTemplatesStore } from "../src/lib/demo/day-templates-store";
import { resetDemoGamificationStore } from "../src/lib/demo/gamification-store";
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

test("parent carnet -> checklist enfant", async ({ context, page }) => {
  resetDemoDayTemplatesStore("dev-family-id");
  resetDemoGamificationStore("dev-family-id");
  resetDemoSchoolDiaryStore("dev-family-id");

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/checklists");
  await page.locator("#checklist-template-type").selectOption("piscine");
  await page.locator("#checklist-template-label").fill("Sac piscine test");
  await page.getByRole("button", { name: /Ajouter le modele/i }).click();
  await expect(page.getByText("Sac piscine test")).toBeVisible();

  const firstItemInput = page.getByPlaceholder("Ajouter un item").first();
  const firstAddItemButton = page.getByRole("button", { name: /Ajouter item/i }).first();

  await firstItemInput.fill("Maillot");
  await firstAddItemButton.click();
  await expect(page.getByText("Maillot")).toBeVisible();

  await firstItemInput.fill("Serviette");
  await firstAddItemButton.click();
  await expect(page.getByText("Serviette")).toBeVisible();

  await page.goto("/parent/school-diary");
  await page.locator("#diary-type").selectOption("piscine");
  await page.locator("#diary-date").fill(getTomorrowDateKey());
  await page.locator("#diary-title").fill("Piscine vendredi");
  await page.getByRole("button", { name: /^Ajouter$/i }).first().click();
  await expect(page.getByText(/checklist generee/i)).toBeVisible();

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

  await page.goto("/child/checklists");
  await expect(page.getByText("Sac piscine test")).toBeVisible();
  await expect(page.getByText("Maillot")).toBeVisible();

  const checklistItems = ["Maillot", "Serviette"];
  for (const itemLabel of checklistItems) {
    const checkbox = page.getByRole("checkbox", { name: new RegExp(itemLabel, "i") }).first();
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    }
  }

  const checklistHeader = page.getByRole("button", { name: /Sac piscine test/i }).first();
  await expect(checklistHeader).toContainText("2/2");
});
