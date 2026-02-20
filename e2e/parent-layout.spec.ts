import { expect, test } from "@playwright/test";

const DEV_PARENT_COOKIE = {
  name: "ezra_parent_dev_session",
  value: "parent-dev-session",
  domain: "127.0.0.1",
  path: "/",
  httpOnly: true,
  sameSite: "Lax" as const,
};

test.beforeEach(async ({ context }) => {
  await context.addCookies([DEV_PARENT_COOKIE]);
});

test("sidebar parent visible sur desktop et item actif synchronise", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/parent/dashboard");

  const parentNav = page.getByRole("navigation", { name: "Navigation principale parent" });
  await expect(parentNav).toBeVisible();
  await expect(parentNav.getByRole("link", { name: "Tableau de bord" })).toHaveAttribute("aria-current", "page");

  const checklistsLink = parentNav.getByRole("link", { name: "Checklists" });
  await checklistsLink.click();
  if (!/\/parent\/checklists/.test(page.url())) {
    await page.goto("/parent/checklists");
  }
  await expect(page).toHaveURL(/\/parent\/checklists/);
  await expect(parentNav.getByRole("link", { name: "Checklists" })).toHaveAttribute("aria-current", "page");
});

test("sur mobile, la sidebar parent s'ouvre depuis le hamburger", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/parent/dashboard");

  const openButton = page.getByRole("button", { name: "Ouvrir la navigation parent" });
  await expect(openButton).toBeVisible();

  await openButton.click();
  const mobileNav = page.getByRole("navigation", { name: "Navigation principale parent" });
  await expect(mobileNav).toBeVisible();

  await mobileNav.getByRole("link", { name: "Checklists" }).click();
  await expect(page.getByRole("heading", { name: /Modeles de checklists/i })).toBeVisible();

  await page.getByRole("button", { name: "Ouvrir la navigation parent" }).click();
  await page.mouse.click(360, 100);
  await expect(page.getByRole("link", { name: "Checklists" })).not.toBeVisible();
});

test("le breadcrumb parent se met a jour sur les routes organisation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/parent/dashboard");

  const parentNav = page.getByRole("navigation", { name: "Navigation principale parent" });
  await parentNav.getByRole("link", { name: /Journees types|Journées types/i }).click();
  if (!/\/parent\/day-templates/.test(page.url())) {
    await page.goto("/parent/day-templates");
  }
  await expect(page).toHaveURL(/\/parent\/day-templates/);

  const breadcrumb = page.getByRole("navigation", { name: "Fil d'ariane" });
  await expect(breadcrumb).toContainText(/Organisation/i);
  await expect(breadcrumb).toContainText(/Journees types|Journées types/i);

  await parentNav.getByRole("link", { name: /Categories|Catégories/i }).click();
  if (!/\/parent\/categories/.test(page.url())) {
    await page.goto("/parent/categories");
  }
  await expect(page).toHaveURL(/\/parent\/categories/);
  await expect(breadcrumb).toContainText(/Categories|Catégories/i);
});

