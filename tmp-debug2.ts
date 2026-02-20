import { chromium } from "playwright";
import { createHmac } from "node:crypto";

const CHILD_SESSION_COOKIE = "ezra_child_session";
const DEV_CHILD_SECRET = "ezra-dev-child-session-secret";
const FAMILY_ID = "dev-family-id";

function token(): string {
  const payload = {
    profileId: "dev-child-id",
    familyId: FAMILY_ID,
    displayName: "Ezra",
    role: "child",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const b = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const s = createHmac("sha256", DEV_CHILD_SECRET).update(b).digest("base64url");
  return `${b}.${s}`;
}

async function run(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([
    { name: CHILD_SESSION_COOKIE, value: token(), domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/child/my-day", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  console.log("h1:", await page.locator("h1").first().textContent());
  console.log("has timeline card:", await page.locator('[data-testid^="timeline-task-"]').count());
  console.log("has empty state:", await page.getByText(/Pas encore de planning/i).count());
  console.log("url:", page.url());
  await page.screenshot({ path: "tmp-debug-page.png", fullPage: false });
  await browser.close();
}

run();
