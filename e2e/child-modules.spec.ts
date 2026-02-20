import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

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

test.setTimeout(60_000);

test.beforeEach(async ({ context }) => {
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
});

test("navigation vers tous les modules enfant", async ({ page }) => {
  await page.goto("/child/checklists");
  await expect(page.getByRole("heading", { name: /Mes checklists/i })).toBeVisible();

  await page.goto("/child/knowledge");
  await expect(page).toHaveURL(/\/child\/knowledge$/);
  await expect(page.getByRole("heading", { name: /d.*couv|decouv/i })).toBeVisible();

  await page.getByRole("button", { name: "Plus" }).click();
  await page.locator('a[href="/child/achievements"]').last().click();
  await page.waitForURL(/\/child\/achievements$/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/child\/achievements$/);
  await expect(page.getByRole("heading", { name: /succ/i })).toBeVisible();

  await page.goto("/child/cinema");
  await expect(page).toHaveURL(/\/child\/cinema$/);
  await expect(page.getByRole("heading", { name: /cin/i })).toBeVisible();

  await page.goto("/child/meals");
  await expect(page).toHaveURL(/\/child\/meals$/);
  await expect(page.getByRole("heading", { name: /Mes repas/i })).toBeVisible();
});

test("interactions principales des modules", async ({ page }) => {
  await page.goto("/child/checklists");

  const checkboxes = page.getByRole("checkbox");
  if (await checkboxes.count()) {
    await checkboxes.first().click();
  } else {
    await expect(page.getByText(/Aucune checklist/i)).toBeVisible();
  }

  await page.goto("/child/emotions");

  const happyButton = page.getByRole("button", { name: /Tres content|Tr.s content/i });
  if (await happyButton.count()) {
    await happyButton.first().click();
    await page.getByRole("button", { name: "Enregistrer" }).first().click();
    await expect(page.getByText(/enregistr/i).first()).toBeVisible();
  }

  await page.goto("/child/cinema");
  await expect(page).toHaveURL(/\/child\/cinema$/);
  await expect(page.getByRole("heading", { name: /cin/i })).toBeVisible();

  const voteButton = page.getByRole("button", { name: /choisis ce film/i });
  if (await voteButton.count()) {
    await expect(voteButton.first()).toBeVisible();
  } else {
    await expect(
      page.getByText(/session|film choisi|aucune session|derni.re session/i).first(),
    ).toBeVisible();
  }
});
