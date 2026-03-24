"use client";

import { useEffect, useRef } from "react";

let hasTriggeredForPageLoad = false;

export default function CspTestPage() {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    if (hasTriggeredRef.current || hasTriggeredForPageLoad) {
      return;
    }

    hasTriggeredRef.current = true;
    hasTriggeredForPageLoad = true;

    try {
      // Intentionally trigger a CSP report-only violation in development.
      const run = new Function("return 1 + 1;");
      run();
    } catch {
      // Ignore runtime errors; the goal is to emit a CSP report.
    }
  }, []);

  return (
    <main className="p-6">
      <p className="text-sm font-medium">CSP report test running (dev-only)</p>
    </main>
  );
}
