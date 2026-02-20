import { expect, test } from "@playwright/test";

const DEV_PARENT_COOKIE = {
  name: "ezra_parent_dev_session",
  value: "parent-dev-session",
  domain: "127.0.0.1",
  path: "/",
  httpOnly: true,
  sameSite: "Lax" as const,
};

test("dashboard parent affiche les KPI et actions rapides", async ({ context, page }) => {
  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/dashboard");
  await expect(page.getByText(/Taches completees cette semaine/i)).toBeVisible();
  await expect(page.getByText(/Points cumules cette semaine/i)).toBeVisible();
  await expect(page.getByText(/Humeur de la semaine/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Ajuster le carnet/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ajuster les repas/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Modifier la journee type/i })).toBeVisible();
});

test("navigation mobile ouvre le drawer parent", async ({ context, page }) => {
  await context.addCookies([DEV_PARENT_COOKIE]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/parent/dashboard");

  await page.getByRole("button", { name: /Ouvrir la navigation parent/i }).click();
  await expect(page.getByRole("navigation", { name: /Navigation principale parent/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Tableau de bord/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Carnet scolaire/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Journ/i }).first()).toBeVisible();
});
