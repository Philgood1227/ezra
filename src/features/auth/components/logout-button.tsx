"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ds";

export function LogoutButton(): React.JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/parent/logout", { method: "POST" });
      const body = (await response.json()) as { redirectTo?: string };
      router.push(body.redirectTo ?? "/auth/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button type="button" variant="ghost" onClick={logout} loading={isLoading}>
      Se déconnecter
    </Button>
  );
}
