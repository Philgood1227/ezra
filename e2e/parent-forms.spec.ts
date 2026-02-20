import { expect, test } from "@playwright/test";

const DEV_PARENT_COOKIE = {
  name: "ezra_parent_dev_session",
  value: "parent-dev-session",
  domain: "127.0.0.1",
  path: "/",
  httpOnly: true,
  sameSite: "Lax" as const,
};

test("les formulaires parent affichent la validation inline", async ({ context, page }) => {
  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/school-diary");
  await page.locator("#diary-date").click();
  await page.locator("#diary-date").dispatchEvent("blur");
  await page.locator("#diary-title").click();
  await page.locator("#diary-title").dispatchEvent("blur");
  await expect(page.getByText(/Date requise/i)).toBeVisible();

  const today = new Date();
  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  await page.locator("#diary-date").fill(dateKey);
  await page.locator("#diary-title").fill("Verification devoir");
  await page.getByRole("button", { name: /^Ajouter$/i }).first().click();
  await expect(page.getByText(/entree ajoutee|checklist generee/i)).toBeVisible();
});

test("formulaire recompenses cree un palier", async ({ context, page }) => {
  await context.addCookies([DEV_PARENT_COOKIE]);
  const suffix = Date.now().toString();

  await page.goto("/parent/rewards");
  await page.locator("#reward-label").fill(`Palier ${suffix}`);
  await page.locator("#reward-points").fill("15");
  await page.getByRole("button", { name: /Ajouter une recompense/i }).click();
  await expect(page.getByText(`Palier ${suffix}`)).toBeVisible();
});
