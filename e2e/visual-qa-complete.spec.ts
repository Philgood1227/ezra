import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  createDemoCategory,
  createDemoTemplateBlock,
  createDemoTemplateTask,
  resetDemoDayTemplatesStore,
  upsertDemoTemplate,
} from "../src/lib/demo/day-templates-store";
import { resetDemoGamificationStore } from "../src/lib/demo/gamification-store";

const CHILD_SESSION_COOKIE = "ezra_child_session";
const DEV_CHILD_SECRET = "ezra-dev-child-session-secret";
const FAMILY_ID = "dev-family-id";
const OUTPUT_DIR = path.join(process.cwd(), "test-results", "visual-qa");
const CAPTURE_SETTLE_MS = 650;

function createChildSessionToken(displayName: string): string {
  const payload = {
    profileId: "dev-child-id",
    familyId: FAMILY_ID,
    displayName,
    role: "child",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", DEV_CHILD_SECRET).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${signature}`;
}

async function setChildSessionCookie(context: BrowserContext): Promise<void> {
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

function setupDeterministicDemoData(): void {
  resetDemoDayTemplatesStore(FAMILY_ID);
  resetDemoGamificationStore(FAMILY_ID);

  const schoolCategory = createDemoCategory(FAMILY_ID, {
    name: "Ecole",
    icon: "school",
    colorKey: "category-ecole",
    defaultItemKind: "mission",
  });
  const activityCategory = createDemoCategory(FAMILY_ID, {
    name: "Activite physique",
    icon: "sport",
    colorKey: "category-sport",
    defaultItemKind: "activity",
  });
  const missionCategory = createDemoCategory(FAMILY_ID, {
    name: "Devoirs",
    icon: "homework",
    colorKey: "category-routine",
    defaultItemKind: "mission",
  });
  const leisureCategory = createDemoCategory(FAMILY_ID, {
    name: "Loisir",
    icon: "leisure",
    colorKey: "category-loisir",
    defaultItemKind: "leisure",
  });

  const template = upsertDemoTemplate(FAMILY_ID, {
    name: "Journee ecole",
    weekday: new Date().getDay(),
    isDefault: true,
  });

  createDemoTemplateBlock(FAMILY_ID, template.id, {
    blockType: "school",
    label: "Ecole",
    startTime: "08:00",
    endTime: "11:00",
  });
  createDemoTemplateBlock(FAMILY_ID, template.id, {
    blockType: "home",
    label: "Maison",
    startTime: "11:00",
    endTime: "13:30",
  });
  createDemoTemplateBlock(FAMILY_ID, template.id, {
    blockType: "school",
    label: "Ecole",
    startTime: "13:30",
    endTime: "16:00",
  });

  createDemoTemplateTask(FAMILY_ID, template.id, {
    categoryId: schoolCategory.id,
    title: "Ecole matin",
    description: null,
    startTime: "08:00",
    endTime: "11:00",
    pointsBase: 1,
    assignedProfileId: null,
    knowledgeCardId: null,
    itemKind: "mission",
    itemSubkind: "homework",
    assignedProfileDisplayName: null,
    assignedProfileRole: null,
    knowledgeCardTitle: null,
  });
  createDemoTemplateTask(FAMILY_ID, template.id, {
    categoryId: schoolCategory.id,
    title: "Ecole apres-midi",
    description: null,
    startTime: "13:30",
    endTime: "16:00",
    pointsBase: 1,
    assignedProfileId: null,
    knowledgeCardId: null,
    itemKind: "mission",
    itemSubkind: "homework",
    assignedProfileDisplayName: null,
    assignedProfileRole: null,
    knowledgeCardTitle: null,
  });
  createDemoTemplateTask(FAMILY_ID, template.id, {
    categoryId: activityCategory.id,
    title: "Boxe Thaï",
    description: null,
    startTime: "16:30",
    endTime: "17:30",
    pointsBase: 2,
    assignedProfileId: "dev-child-id",
    knowledgeCardId: null,
    itemKind: "activity",
    itemSubkind: "sport",
    assignedProfileDisplayName: null,
    assignedProfileRole: null,
    knowledgeCardTitle: null,
  });
  createDemoTemplateTask(FAMILY_ID, template.id, {
    categoryId: missionCategory.id,
    title: "Reviser table de 3",
    description: null,
    startTime: "18:00",
    endTime: "18:30",
    pointsBase: 2,
    assignedProfileId: "dev-child-id",
    knowledgeCardId: null,
    itemKind: "mission",
    itemSubkind: "revision",
    assignedProfileDisplayName: null,
    assignedProfileRole: null,
    knowledgeCardTitle: null,
  });
  createDemoTemplateTask(FAMILY_ID, template.id, {
    categoryId: leisureCategory.id,
    title: "Naruto",
    description: null,
    startTime: "19:00",
    endTime: "19:30",
    pointsBase: 1,
    assignedProfileId: "dev-child-id",
    knowledgeCardId: null,
    itemKind: "leisure",
    itemSubkind: "screen",
    assignedProfileDisplayName: null,
    assignedProfileRole: null,
    knowledgeCardTitle: null,
  });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
}

async function expectNoTimelineCardOverlap(page: Page): Promise<void> {
  const boxes = await page.locator('[data-testid^="timeline-task-"]').evaluateAll((elements) =>
    elements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((box) => box.width > 0 && box.height > 0)
      .sort((left, right) => left.top - right.top),
  );

  for (let index = 1; index < boxes.length; index += 1) {
    const previous = boxes[index - 1];
    const current = boxes[index];
    if (!previous || !current) {
      continue;
    }

    expect(current.top).toBeGreaterThanOrEqual(previous.bottom - 1);
  }
}

async function capture(page: Page, filename: string): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  await page.waitForTimeout(CAPTURE_SETTLE_MS);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, filename),
    fullPage: false,
    animations: "disabled",
    caret: "hide",
  });
}

async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
}

const VIEWPORTS = [
  { name: "mobile-narrow", width: 320, height: 740 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

test.describe("visual QA complete - child home and my-day", () => {
  test.beforeEach(async ({ context }) => {
    setupDeterministicDemoData();
    await setChildSessionCookie(context);
  });

  for (const viewport of VIEWPORTS) {
    test(`captures ${viewport.name} layouts without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto("/child", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: /En ce moment/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await scrollToTop(page);
      await expect(page.getByRole("heading", { name: /En ce moment/i })).toBeVisible();
      await capture(page, `${viewport.name}-child-home-top.png`);
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(CAPTURE_SETTLE_MS);
      await expect(page.getByRole("heading", { name: /En ce moment/i })).toBeVisible();
      await capture(page, `${viewport.name}-child-home-scrolled.png`);

      await page.goto("/child/my-day", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: /Ma journ/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await scrollToTop(page);
      await expect(page.getByRole("heading", { name: /Ma journ/i })).toBeVisible();
      await capture(page, `${viewport.name}-my-day-guided-top.png`);
      await page.mouse.wheel(0, 1300);
      await page.waitForTimeout(CAPTURE_SETTLE_MS);
      await expect(page.getByRole("heading", { name: /Ma journ/i })).toBeVisible();
      await capture(page, `${viewport.name}-my-day-guided-scrolled.png`);
      const visibleDetailPanel = page.locator('[data-testid="timeline-detail-panel"]:visible').first();

      if (viewport.width < 1024) {
        const timelineTab = page.getByRole("button", { name: /^Timeline$/ });
        await expect(timelineTab).toBeVisible();
        await timelineTab.click();
        await expect(visibleDetailPanel).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await expectNoTimelineCardOverlap(page);
        await scrollToTop(page);
        await capture(page, `${viewport.name}-my-day-timeline-top.png`);
        await page.mouse.wheel(0, 1200);
        await page.waitForTimeout(CAPTURE_SETTLE_MS);
        await capture(page, `${viewport.name}-my-day-timeline-scrolled.png`);
      } else {
        await expect(visibleDetailPanel).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await expectNoTimelineCardOverlap(page);
        await scrollToTop(page);
        await capture(page, `${viewport.name}-my-day-timeline-top.png`);
        await page.mouse.wheel(0, 1200);
        await page.waitForTimeout(CAPTURE_SETTLE_MS);
        await capture(page, `${viewport.name}-my-day-timeline-scrolled.png`);
      }
    });
  }
});

