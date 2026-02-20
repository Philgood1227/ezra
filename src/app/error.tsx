"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageLayout,
  buttonVariants,
} from "@/components/ds";
import { cn } from "@/lib/utils";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps): React.JSX.Element {
  useEffect(() => {
    // Keep error details in the console for debugging while showing a user-safe message.
    console.error(error);
  }, [error]);

  return (
    <PageLayout
      title="Oups, un probleme est survenu"
      subtitle="La page n&apos;a pas pu se charger."
      className="max-w-3xl"
    >
      <Card>
        <CardHeader>
          <CardTitle>Erreur temporaire</CardTitle>
          <CardDescription>
            Vous pouvez reessayer maintenant ou revenir a l&apos;accueil.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>
            Reessayer
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "secondary" }))}>
            Retour a l&apos;accueil
          </Link>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
