function extractReportObject(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const nested = root["csp-report"] ?? root.body ?? root.report;

  if (nested && typeof nested === "object") {
    return nested as Record<string, unknown>;
  }

  return root;
}

function readStringField(report: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!report) {
    return undefined;
  }

  for (const key of keys) {
    const value = report[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    const report = extractReportObject(payload);
    const blockedUri = readStringField(report, ["blocked-uri", "blockedURI", "blockedUri"]) ?? "unknown";
    const violatedDirective =
      readStringField(report, ["violated-directive", "violatedDirective"]) ?? "unknown";
    const effectiveDirective =
      readStringField(report, ["effective-directive", "effectiveDirective"]) ?? "unknown";

    console.warn(
      `CSP report: blocked-uri=${blockedUri} violated-directive=${violatedDirective} effective-directive=${effectiveDirective}`,
    );
  } catch {
    console.warn("CSP report: blocked-uri=unknown violated-directive=unknown effective-directive=unknown");
  }

  return new Response(null, { status: 204 });
}
