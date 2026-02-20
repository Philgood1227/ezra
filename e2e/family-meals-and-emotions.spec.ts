import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { resetDemoWellbeingStore } from "../src/lib/demo/wellbeing-store";

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
  const signature = createHmac("sha256", "ezra-dev-child-session-secret").update(payloadBase64).digest("base64url");

  return `${payloadBase64}.${signature}`;
}

test("parent saisit un repas, enfant renseigne emotions, dashboard parent agrege", async ({ context, page }) => {
  resetDemoWellbeingStore("dev-family-id");

  const suffix = Date.now().toString();
  const mealLabel = `Pates test ${suffix}`;

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/meals");
  const todayKey = await page.evaluate(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  await page.locator("#meal-date").fill(todayKey);
  await page.locator("#meal-type").selectOption("diner");
  await page.locator("#meal-description").fill(mealLabel);
  await page.locator("#meal-prepared-by-label").fill("Papa et Maman");
  await page.locator("form button[type='submit']").click();

  await expect(page.getByText(/Repas ajoute/i)).toBeVisible();
  await expect(page.getByText(new RegExp(mealLabel))).toBeVisible();

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

  await page.goto("/child/emotions");
  await page.getByRole("button", { name: /Très content|Tres content/i }).first().click();
  await page.getByRole("button", { name: "Enregistrer" }).first().click();
  await page.getByRole("button", { name: /Content/i }).first().click();
  await page.getByRole("button", { name: "Enregistrer" }).first().click();
  await expect(page.getByText(/Météo enregistrée|Meteo enregistree/i)).toBeVisible();

  await context.clearCookies();
  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/dashboard");
  await expect(page.getByText(/Repas de la semaine/i)).toBeVisible();
  await expect(page.getByText(/Emotions de la semaine|Humeur de la semaine/i)).toBeVisible();
});
