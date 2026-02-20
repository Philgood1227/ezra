"use client";

import * as React from "react";
import { useToast } from "@/components/ds/toast";

export function NetworkStatusBanner(): React.JSX.Element | null {
  const toast = useToast();
  const [isOnline, setIsOnline] = React.useState(true);
  const hasMountedRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    setIsOnline(navigator.onLine);
    hasMountedRef.current = true;

    const onOnline = (): void => {
      setIsOnline(true);
      toast.info("Connexion retablie.");
    };

    const onOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [toast]);

  if (!hasMountedRef.current || isOnline) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[75] pt-safe">
      <div className="mx-auto max-w-3xl rounded-radius-button border border-status-warning/40 bg-status-warning/14 px-4 py-2 text-center text-sm font-semibold text-text-primary shadow-card">
        Mode hors-ligne active, certaines fonctions sont limitees.
      </div>
    </div>
  );
}

