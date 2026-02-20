import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

const DEV_PARENT_COOKIE = {
  name: "ezra_parent_dev_session",
  value: "parent-dev-session",
  domain: "127.0.0.1",
  path: "/",
  httpOnly: true,
  sameSite: "Lax" as const,
};

const CHILD_SESSION_COOKIE = "ezra_child_session";
const DEV_CHILD_SECRET = "ezra-dev-child-session-secret";

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

test("layout parent expose skip-link et landmarks", async ({ context, page }) => {
  await context.addCookies([DEV_PARENT_COOKIE]);
  await page.goto("/parent/dashboard");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Aller au contenu principal/i }).first()).toBeVisible();

  await expect(page.locator("header").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigation principale parent" })).toBeVisible();
  await expect(page.locator("main#parent-main-content")).toBeVisible();
});

test("layout enfant expose skip-link, main et navigation", async ({ context, page }) => {
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

  await page.goto("/child");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Aller au contenu principal/i }).first()).toBeVisible();

  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigation enfant" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Plus/i })).toBeVisible();
});
