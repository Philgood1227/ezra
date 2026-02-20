import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import {
  createDemoCategory,
  createDemoTemplateBlock,
  createDemoTemplateTask,
  resetDemoDayTemplatesStore,
  upsertDemoTemplate,
} from "./src/lib/demo/day-templates-store";
import { resetDemoGamificationStore } from "./src/lib/demo/gamification-store";

const FAMILY_ID = "dev-family-id";
const CHILD_SESSION_COOKIE = "ezra_child_session";
const DEV_CHILD_SECRET = "ezra-dev-child-session-secret";

function token(displayName: string): string {
  const payload = {
    profileId: "dev-child-id",
    familyId: FAMILY_ID,
    displayName,
    role: "child",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const b = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const s = createHmac("sha256", DEV_CHILD_SECRET).update(b).digest("base64url");
  return `${b}.${s}`;
}

function seed(): void {
  resetDemoDayTemplatesStore(FAMILY_ID);
  resetDemoGamificationStore(FAMILY_ID);

  const schoolCategory = createDemoCategory(FAMILY_ID, {
    name: "Ecole",
    icon: "??",
    colorKey: "category-ecole",
    defaultItemKind: "mission",
  });
  const activityCategory = createDemoCategory(FAMILY_ID, {
    name: "Activite physique",
    icon: "?",
    colorKey: "category-sport",
    defaultItemKind: "activity",
  });
  const missionCategory = createDemoCategory(FAMILY_ID, {
    name: "Devoirs",
    icon: "??",
    colorKey: "category-routine",
    defaultItemKind: "mission",
  });
  const leisureCategory = createDemoCategory(FAMILY_ID, {
    name: "Loisir",
    icon: "??",
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

async function run(): Promise<void> {
  seed();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addCookies([
    {
      name: CHILD_SESSION_COOKIE,
      value: token("Ezra"),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/child/my-day", { waitUntil: "networkidle" });
  await page.waitForTimeout(1100);

  const cards = await page.locator('[data-testid^="timeline-task-"]').evaluateAll((els) =>
    els
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const title = (el.querySelector("p")?.textContent ?? "").trim();
        return {
          title,
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          width: rect.width,
          left: rect.left,
          display: getComputedStyle(el).display,
        };
      })
      .filter((item) => item.width > 0 && item.height > 0)
      .sort((a, b) => a.top - b.top),
  );

  console.log(cards);
  await page.screenshot({ path: "tmp-debug-desktop.png", fullPage: false });
  await browser.close();
}

run();
