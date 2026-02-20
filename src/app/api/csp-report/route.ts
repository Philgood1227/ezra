const RATE_LIMIT_WINDOW_MS = 10_000;

type ReportObject = Record<string, unknown>;

type RateLimitEntry = {
  lastLoggedAt: number;
  skippedCount: number;
};

type CspSummary = {
  directive: string;
  blockedUri: string;
  documentUri: string;
  source: string;
  signature: string;
};

const logRateLimitState = new Map<string, RateLimitEntry>();

function extractReportObject(payload: unknown): ReportObject | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as ReportObject;
  const nested = root["csp-report"] ?? root.body;

  if (nested && typeof nested === "object") {
    return nested as ReportObject;
  }

  return root;
}

function readStringField(report: ReportObject | null, keys: string[]): string | undefined {
  if (!report) {
    return undefined;
  }

  for (const key of keys) {
    const value = report[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function readLineField(report: ReportObject | null): string {
  if (!report) {
    return "unknown";
  }

  for (const key of ["line-number", "lineNumber"]) {
    const value = report[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "unknown";
}

function buildSummary(report: ReportObject | null): CspSummary {
  const effectiveDirective = readStringField(report, ["effective-directive", "effectiveDirective"]);
  const violatedDirective = readStringField(report, ["violated-directive", "violatedDirective"]);
  const directive = effectiveDirective ?? violatedDirective ?? "unknown";
  const blockedUri = readStringField(report, ["blocked-uri", "blockedURI", "blockedUri"]) ?? "unknown";
  const documentUri = readStringField(report, ["document-uri", "documentURI", "documentUri"]) ?? "unknown";
  const sourceFile = readStringField(report, ["source-file", "sourceFile"]) ?? "unknown";
  const source = `${sourceFile}:${readLineField(report)}`;
  const signature = `${directive}|${blockedUri}`;

  return { directive, blockedUri, documentUri, source, signature };
}

function logSummaryWithRateLimit(summary: CspSummary): void {
  const now = Date.now();
  const existing = logRateLimitState.get(summary.signature);

  if (existing && now - existing.lastLoggedAt < RATE_LIMIT_WINDOW_MS) {
    existing.skippedCount += 1;
    logRateLimitState.set(summary.signature, existing);
    return;
  }

  const suffix = existing && existing.skippedCount > 0 ? ` (x${existing.skippedCount + 1})` : "";

  console.warn(
    `[CSP-RO] ${summary.directive} blocked=${summary.blockedUri} doc=${summary.documentUri} src=${summary.source}${suffix}`,
  );

  logRateLimitState.set(summary.signature, { lastLoggedAt: now, skippedCount: 0 });
}

export async function POST(request: Request): Promise<Response> {
  let report: ReportObject | null = null;

  try {
    const payload = await request.json();
    report = extractReportObject(payload);
  } catch {
    report = null;
  }

  logSummaryWithRateLimit(buildSummary(report));

  return new Response(null, { status: 204 });
}
