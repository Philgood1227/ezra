import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { resetDemoAchievementsStore } from "../src/lib/demo/achievements-store";
import { resetDemoDayTemplatesStore } from "../src/lib/demo/day-templates-store";
import { resetDemoGamificationStore } from "../src/lib/demo/gamification-store";
import { resetDemoKnowledgeStore } from "../src/lib/demo/knowledge-store";

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

test("parent cree une fiche liee a un devoir puis enfant la consulte", async ({ context, page }) => {
  test.setTimeout(60_000);

  resetDemoDayTemplatesStore("dev-family-id");
  resetDemoGamificationStore("dev-family-id");
  resetDemoKnowledgeStore("dev-family-id");
  resetDemoAchievementsStore("dev-family-id");

  const suffix = Date.now().toString();
  const subjectLabel = `Maths test ${suffix}`;
  const cardTitle = `Aide fractions ${suffix}`;
  const weekday = new Date().getDay();

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.goto("/parent/knowledge");
  await page.locator("#knowledge-subject-label").fill(subjectLabel);
  await page.locator("#knowledge-subject-code").fill(`maths-test-${suffix}`);
  await page.getByRole("button", { name: /^Ajouter$/i }).first().click();
  await expect(page.getByText(subjectLabel)).toBeVisible();

  const subjectCard = page
    .getByRole("heading", { name: subjectLabel })
    .first()
    .locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')][1]");
  const subjectManageLink = subjectCard.getByRole("link", { name: /Gerer les fiches/i }).first();
  const subjectManageHref = await subjectManageLink.getAttribute("href");
  const subjectId = subjectManageHref?.split("/").at(-1) ?? null;
  expect(subjectId).not.toBeNull();
  await subjectManageLink.click();

  await page.locator("#knowledge-category-label").fill("Devoirs");
  await page.locator("#knowledge-category-order").fill("0");
  await page.getByRole("button", { name: /^Ajouter$/i }).first().click();

  await page.locator("#knowledge-card-category").selectOption({ label: "Devoirs" });
  await page.locator("#knowledge-card-title").fill(cardTitle);
  await page.locator("#knowledge-card-summary").fill("Utilise numerateur et denominateur.");
  await page.locator("#knowledge-card-difficulty").fill("CM1");
  await page.locator("#knowledge-card-rappel").fill("Une fraction = une partie d'un tout.");
  await page.locator("#knowledge-card-exemple").fill("1/2 + 1/2 = 1");
  await page.locator("#knowledge-card-astuce").fill("Simplifie quand c'est possible.");
  await page.getByRole("button", { name: /^Ajouter$/i }).nth(1).click();
  await expect(page.getByText(/Fiche ajoutee/i)).toBeVisible();

  await page.goto("/parent/categories");
  await page.locator("#category-name").fill(`Ecole ${suffix}`);
  await page.locator("#category-icon").fill("📚");
  await page.getByRole("button", { name: /Ajouter/i }).click();

  await page.goto(`/parent/day-templates/new?weekday=${weekday}`);
  await page.locator("#template-name").fill(`Journee devoir ${suffix}`);
  await page.getByRole("button", { name: /Cr/i }).first().click();

  await page.locator("#task-title").fill(`Devoir maths ${suffix}`);
  await page.locator("#task-start").fill("17:00");
  await page.locator("#task-end").fill("17:30");
  await page.locator("#task-points").fill("35");
  const knowledgeCardValue = await page
    .locator("#task-knowledge-card option")
    .evaluateAll((options, targetTitle) => {
      const target = options.find((option) => option.textContent?.includes(targetTitle as string));
      return target?.getAttribute("value") ?? null;
    }, cardTitle);
  expect(knowledgeCardValue).not.toBeNull();
  await page.locator("#task-knowledge-card").selectOption(knowledgeCardValue ?? "");
  await page.getByRole("button", { name: /Ajouter le bloc/i }).click();

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

  await page.goto(`/child/knowledge?subjectId=${subjectId}`);
  await expect(page.getByText(new RegExp(cardTitle))).toBeVisible();

  await page.goto("/child/my-day");
  await expect(page.getByText(new RegExp(`Devoir maths ${suffix}`)).first()).toBeVisible();
  await page.getByRole("link", { name: /Voir la fiche/i }).click();
  await expect(page).toHaveURL(/\/child\/knowledge\?cardId=/);
  await expect(page.getByRole("heading", { name: new RegExp(cardTitle) }).first()).toBeVisible();

  await page.goto("/child/achievements");
  await expect(page.getByText(/30 points en un jour/i)).toBeVisible();
});

