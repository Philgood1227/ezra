"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ds";

export function NewRevisionLink(): React.JSX.Element {
  return (
    <Link href="/parent/revisions/new" className={buttonVariants({ variant: "premium", size: "md" })}>
      Nouvelle fiche
    </Link>
  );
}
