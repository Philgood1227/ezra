import { expect, test } from "@playwright/test";

const DEV_PARENT_COOKIE = {
  name: "ezra_parent_dev_session",
  value: "parent-dev-session",
  domain: "127.0.0.1",
  path: "/",
  httpOnly: true,
  sameSite: "Lax" as const,
};

test("un parent peut creer une categorie et une journee type", async ({ context, page }) => {
  const suffix = Date.now().toString();
  const categoryName = `Routine ${suffix}`;
  const templateName = `Journee test ${suffix}`;

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/categories");
  await page.locator("#category-name").fill(categoryName);
  await page.locator("#category-icon").fill("🧩");
  await page.getByRole("button", { name: /Ajouter/ }).click();
  await expect(page.getByText(categoryName)).toBeVisible();

  await page.goto(`/parent/day-templates/new?weekday=${new Date().getDay()}`);
  await page.locator("#template-name").fill(templateName);
  await page.getByRole("button", { name: /Créer|Creer/ }).click();
  await expect(page).toHaveURL(/\/parent\/day-templates\//);

  await page.locator("#task-title").fill(`Bloc matin ${suffix}`);
  await page.locator("#task-start").fill("07:30");
  await page.locator("#task-end").fill("08:00");
  await page.locator("#task-description").fill("Debut de journee");
  await page.getByRole("button", { name: "Ajouter le bloc" }).click();

  await expect(page.getByText(`Bloc matin ${suffix}`).first()).toBeVisible();
});
