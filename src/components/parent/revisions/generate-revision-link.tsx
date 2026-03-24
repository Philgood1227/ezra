"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ds";

export function GenerateRevisionLink(): React.JSX.Element {
  return (
    <Link href="/parent/revisions/generate" className={buttonVariants({ variant: "secondary", size: "md" })}>
      Generer une fiche
    </Link>
  );
}
