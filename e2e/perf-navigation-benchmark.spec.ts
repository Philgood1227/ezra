import { createHmac } from "node:crypto";
import { test } from "@playwright/test";

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

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedValues.length) - 1),
  );
  return sortedValues[index] ?? 0;
}

function summarize(values: number[]): { median: number; p95: number; avg: number } {
  if (values.length === 0) {
    return { median: 0, p95: 0, avg: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    avg: Math.round(sum / values.length),
  };
}

async function measureTransition(
  action: () => Promise<void>,
  waitReady: () => Promise<void>,
): Promise<number> {
  const startedAt = Date.now();
  await action();
  await waitReady();
  return Date.now() - startedAt;
}

async function waitForRouteReady(page: import("@playwright/test").Page, urlPattern: RegExp): Promise<void> {
  await page.waitForURL(urlPattern);
  await page.locator("main").first().waitFor({ state: "visible" });
  // Wait one extra paint frame to include post-navigation UI updates.
  await page.waitForTimeout(120);
}

function pushMeasurement(
  buckets: Record<string, number[]>,
  key: string,
  value: number,
): void {
  const bucket = buckets[key];
  if (!bucket) {
    return;
  }
  bucket.push(value);
}

test("benchmark parent/child navigation timings", async ({ context, page }) => {
  test.setTimeout(120_000);

  await context.addCookies([DEV_PARENT_COOKIE]);

  await page.setViewportSize({ width: 1280, height: 900 });

  const parentRuns = 5;
  const childRuns = 5;

  const parentMeasures: Record<string, number[]> = {
    "dashboard->revisions": [],
    "revisions->books": [],
    "books->generate": [],
    "generate->dashboard": [],
  };

  await page.goto("/parent/dashboard");
  await waitForRouteReady(page, /\/parent\/dashboard/);

  // Warmup pass (compilation/chunk download in dev mode)
  await page.locator('a[href="/parent/revisions"]').first().click();
  await waitForRouteReady(page, /\/parent\/revisions/);
  await page.locator('a[href="/parent/resources/books"]').first().click();
  await waitForRouteReady(page, /\/parent\/resources\/books/);
  await page.locator('a[href="/parent/revisions/generate"]').first().click();
  await waitForRouteReady(page, /\/parent\/revisions\/generate/);
  await page.locator('a[href="/parent/dashboard"]').first().click();
  await waitForRouteReady(page, /\/parent\/dashboard/);

  for (let run = 0; run < parentRuns; run += 1) {
    pushMeasurement(
      parentMeasures,
      "dashboard->revisions",
      await measureTransition(
        async () => {
          await page.locator('a[href="/parent/revisions"]').first().click();
        },
        async () => {
          await waitForRouteReady(page, /\/parent\/revisions/);
        },
      ),
    );

    pushMeasurement(
      parentMeasures,
      "revisions->books",
      await measureTransition(
        async () => {
          await page.locator('a[href="/parent/resources/books"]').first().click();
        },
        async () => {
          await waitForRouteReady(page, /\/parent\/resources\/books/);
        },
      ),
    );

    pushMeasurement(
      parentMeasures,
      "books->generate",
      await measureTransition(
        async () => {
          await page.locator('a[href="/parent/revisions/generate"]').first().click();
        },
        async () => {
          await waitForRouteReady(page, /\/parent\/revisions\/generate/);
        },
      ),
    );

    pushMeasurement(
      parentMeasures,
      "generate->dashboard",
      await measureTransition(
        async () => {
          await page.locator('a[href="/parent/dashboard"]').first().click();
        },
        async () => {
          await waitForRouteReady(page, /\/parent\/dashboard/);
        },
      ),
    );
  }

  await context.clearCookies();
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

  const childMeasures: Record<string, number[]> = {
    "today->checklists": [],
    "checklists->tools": [],
    "tools->achievements": [],
    "achievements->today": [],
  };

  await page.goto("/child");
  await waitForRouteReady(page, /\/child$/);

  // Warmup child routes
  await page.locator('a[href="/child/checklists"]').first().click();
  await waitForRouteReady(page, /\/child\/checklists/);
  await page.locator('a[href="/child/tools"]').first().click();
  await waitForRouteReady(page, /\/child\/tools/);
  await page.locator('a[href="/child/achievements"]').first().click();
  await waitForRouteReady(page, /\/child\/achievements/);
  await page.locator('a[href="/child"]').first().click();
  await waitForRouteReady(page, /\/child$/);

  for (let run = 0; run < childRuns; run += 1) {
    pushMeasurement(
      childMeasures,
      "today->checklists",
      await measureTransition(
        async () => {
          await page.locator('a[href="/child/checklists"]').first().click();
        },
        async () => {
          await waitForRouteReady(page, /\/child\/checklists/);
        },
      ),
    );

    pushMeasurement(
      childMeasures,
      "checklists->tools",
      await measureTransition(
        async () => {
          await page.locator('a[href="/child/tools"]').first().click();
        },
        async () => {
          await waitForRouteReady(page, /\/child\/tools/);
        },
      ),
    );

    pushMeasurement(
      childMeasures,
      "tools->achievements",
      await measureTransition(
        async () => {
          await page.locator('a[href="/child/achievements"]').first().click();
        },
        async () => {
          await waitForRouteReady(page, /\/child\/achievements/);
        },
      ),
    );

    pushMeasurement(
      childMeasures,
      "achievements->today",
      await measureTransition(
        async () => {
          await page.locator('a[href="/child"]').first().click();
        },
        async () => {
          await waitForRouteReady(page, /\/child$/);
        },
      ),
    );
  }

  const parentReport = Object.entries(parentMeasures).map(([transition, values]) => ({
    transition,
    ...summarize(values),
    samplesMs: values.join(", "),
  }));
  const childReport = Object.entries(childMeasures).map(([transition, values]) => ({
    transition,
    ...summarize(values),
    samplesMs: values.join(", "),
  }));

  console.info("\n[perf] Parent navigation benchmark");
  console.table(parentReport);
  console.info("\n[perf] Child navigation benchmark");
  console.table(childReport);
});
