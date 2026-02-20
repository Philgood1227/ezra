import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { resetDemoDayTemplatesStore } from "../src/lib/demo/day-templates-store";
import { resetDemoGamificationStore } from "../src/lib/demo/gamification-store";

const CHILD_SESSION_COOKIE = "ezra_child_session";
const DEV_CHILD_SECRET = "ezra-dev-child-session-secret";
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
  const signature = createHmac("sha256", DEV_CHILD_SECRET).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${signature}`;
}

async function setChildSessionCookie(context: import("@playwright/test").BrowserContext): Promise<void> {
  await context.addCookies([
    {
      name: CHILD_SESSION_COOKIE,
      value: createChildSessionToken("Ezra"),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function ensureTimelineTaskForToday(
  context: import("@playwright/test").BrowserContext,
  page: import("@playwright/test").Page,
): Promise<void> {
  resetDemoDayTemplatesStore("dev-family-id");
  resetDemoGamificationStore("dev-family-id");

  const suffix = Date.now().toString();
  const weekday = new Date().getDay();
  const categoryName = `Home cockpit category ${suffix}`;
  const templateName = `Home cockpit template ${suffix}`;
  const taskName = `Current task ${suffix}`;

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/categories");
  await page.locator("#category-name").fill(categoryName);
  await page.locator("#category-icon").fill("T");
  await page.getByRole("button", { name: /Ajouter/ }).click();
  await expect(page.getByText(categoryName)).toBeVisible();

  await page.goto(`/parent/day-templates/new?weekday=${weekday}`);
  await page.locator("#template-name").fill(templateName);
  await page.getByRole("button", { name: /Creer|Cr\u00E9er/ }).click();

  await page.locator("#task-title").fill(taskName);
  await page.locator("#task-start").fill("00:00");
  await page.locator("#task-end").fill("23:59");
  await page.getByRole("button", { name: "Ajouter le bloc" }).click();
}

test("auth pages remain available", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: "Connexion parent" })).toBeVisible();

  await page.goto("/auth/register");
  await expect(page.getByRole("heading", { name: /compte parent/i })).toBeVisible();

  await page.goto("/auth/pin");
  await expect(page.getByRole("heading", { name: /code pin/i })).toBeVisible();
});

test("child home renders compact french cockpit and stays above the fold on tablet landscape", async ({
  context,
  page,
}) => {
  await setChildSessionCookie(context);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/child");

  const header = page.getByTestId("today-header");
  const nowCard = page.getByTestId("child-home-now-card");
  const toolsCard = page.getByTestId("tools-and-knowledge-card");
  const layout = page.getByTestId("child-home-layout");
  const sharedContainer = page.getByTestId("child-home-shared-container");

  await expect(header).toBeVisible();
  await expect(header.getByTestId("today-hero-visual")).toBeVisible();
  await expect(header.getByText("Aujourd'hui")).toBeVisible();
  await expect(header).toHaveClass(/md:p-3.5/);
  await expect(header.getByTestId("today-week-strip")).toBeVisible();
  await expect(header.getByTestId("today-week-strip").getByText(/^L$/)).toBeVisible();
  await expect(header.getByTestId("today-week-strip").getByText(/^M$/).first()).toBeVisible();
  await expect(header.getByTestId("today-week-strip").getByText(/^J$/)).toBeVisible();
  await expect(header.getByTestId("today-week-strip").getByText(/^V$/)).toBeVisible();
  await expect(header.getByTestId("today-week-strip").getByText(/^S$/)).toBeVisible();
  await expect(header.getByTestId("today-week-strip").getByText(/^D$/)).toBeVisible();

  await expect(page.getByText("En ce moment")).toBeVisible();
  await expect(nowCard.locator("span").filter({ hasText: "Maintenant" }).first()).toBeVisible();
  await expect(nowCard.locator("p").filter({ hasText: "ENSUITE" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Voir ma journee" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Fiches d'aide/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Outils de travail/i })).toBeVisible();
  await expect(layout).toHaveClass(/max-w-full/);
  await expect(sharedContainer.getByTestId(/today-header|child-home-now-card|tools-and-knowledge-card/)).toHaveCount(3);

  await expect(page.getByText("Your day now")).toHaveCount(0);
  await expect(page.getByText("Time and markers")).toHaveCount(0);
  await expect(page.getByText("Today's points")).toHaveCount(0);
  await expect(page.getByText("Discoveries")).toHaveCount(0);
  await expect(page.getByText("Ta journee maintenant")).toHaveCount(0);
  await expect(header.getByTestId("day-night-ring-compact")).toHaveCount(0);
  await expect(header.getByText(/Lever du soleil/i)).toHaveCount(0);
  await expect(header.getByText(/Coucher du soleil/i)).toHaveCount(0);
  await expect(header.getByText(/^Matin$/)).toHaveCount(0);
  await expect(header.getByText(/^Midi$/)).toHaveCount(0);
  await expect(header.getByText(/^Après-midi$/)).toHaveCount(0);
  await expect(header.getByText(/^Soir$/)).toHaveCount(0);
  await expect(header.getByText(/^Nuit$/)).toHaveCount(0);

  const nav = page.getByRole("navigation", { name: "Navigation enfant" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Accueil" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Ma journ\u00E9e" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Checklists" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Fiches" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Plus" })).toBeVisible();

  const navIconCount = await nav.locator('[data-slot="tab-icon"] svg').count();
  expect(navIconCount).toBeGreaterThanOrEqual(5);

  const navFontSizePx = await nav.getByRole("link", { name: "Accueil" }).evaluate((element) => {
    return Number.parseFloat(window.getComputedStyle(element).fontSize);
  });
  expect(navFontSizePx).toBeGreaterThanOrEqual(14);

  const viewportHeight = page.viewportSize()?.height ?? 0;
  const headerBox = await header.boundingBox();
  const nowCardBox = await nowCard.boundingBox();
  const toolsCardBox = await toolsCard.boundingBox();
  const navBox = await nav.boundingBox();
  const weekdayChipBox = await header.getByTestId("today-week-day-lundi").boundingBox();
  const headerPaddingTop = await header.evaluate((element) => Number.parseFloat(window.getComputedStyle(element).paddingTop));
  const headerPrimaryDateFontSize = await page
    .getByTestId("today-primary-date")
    .evaluate((element) => Number.parseFloat(window.getComputedStyle(element).fontSize));
  const nowCardTitleFontSize = await page
    .getByRole("heading", { name: "En ce moment" })
    .evaluate((element) => Number.parseFloat(window.getComputedStyle(element).fontSize));

  expect(headerBox).not.toBeNull();
  expect(nowCardBox).not.toBeNull();
  expect(toolsCardBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(weekdayChipBox).not.toBeNull();

  if (headerBox) {
    expect(headerBox.height).toBeLessThanOrEqual(280);
    expect(headerBox.y).toBeGreaterThanOrEqual(0);
  }

  if (nowCardBox) {
    expect(nowCardBox.y + nowCardBox.height).toBeLessThanOrEqual(viewportHeight + 1);
    expect(nowCardBox.y).toBeGreaterThanOrEqual(0);
  }

  if (toolsCardBox && navBox) {
    expect(toolsCardBox.y + toolsCardBox.height).toBeLessThanOrEqual(navBox.y - 4);
    expect(toolsCardBox.y).toBeGreaterThanOrEqual(0);
  }

  if (headerBox && nowCardBox && toolsCardBox) {
    expect(headerBox.y).toBeLessThan(nowCardBox.y);
    expect(nowCardBox.y).toBeLessThan(toolsCardBox.y);
  }

  if (weekdayChipBox) {
    expect(weekdayChipBox.width).toBeGreaterThanOrEqual(43.9);
    expect(weekdayChipBox.height).toBeGreaterThanOrEqual(43.9);
  }

  expect(headerPaddingTop).toBeLessThanOrEqual(16);
  expect(headerPrimaryDateFontSize).toBeLessThanOrEqual(28);
  expect(nowCardTitleFontSize).toBeLessThanOrEqual(24);

  const initialScrollY = await page.evaluate(() => window.scrollY);
  expect(initialScrollY).toBe(0);
});

test("focus block CTA opens the timeline and shows current context", async ({ context, page }) => {
  await ensureTimelineTaskForToday(context, page);
  await setChildSessionCookie(context);

  await page.goto("/child");
  await page.getByRole("button", { name: "Voir ma journee" }).click();
  await page.waitForURL(/\/child\/my-day/, { timeout: 15_000 });

  await expect(page).toHaveURL(/\/child\/my-day/);
  await expect(page.getByRole("heading", { name: /Ma journ/i })).toBeVisible();
  await expect(page.locator('[data-testid^="timeline-task-"]').first()).toBeVisible();
});

test("plus menu still opens from child navigation", async ({ context, page }) => {
  await setChildSessionCookie(context);

  await page.goto("/child");
  await page.getByRole("button", { name: "Plus" }).click();

  await expect(page.getByRole("link", { name: /Succ\u00E8s|Succes/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cin\u00E9ma|Cinema/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /\u00C9motions|Emotions/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Repas/i })).toBeVisible();
});

test("manifest remains reachable", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(manifest.name).toBe("Ezra");
});
