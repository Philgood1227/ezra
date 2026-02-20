import Link from "next/link";
import { Card, CardContent } from "@/components/ds";
import { CategoriesManager } from "@/features/day-templates/components";
import { getTaskCategoriesForCurrentFamily } from "@/lib/api/templates";

export default async function ParentCategoriesPage(): Promise<React.JSX.Element> {
  const categories = await getTaskCategoriesForCurrentFamily();

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-text-secondary">Organisation</p>
            <h1 className="font-display text-2xl font-black text-text-primary">Categories de taches</h1>
          </div>
          <Link
            href="/parent/day-templates"
            className="inline-flex h-touch-sm items-center justify-center rounded-radius-button border border-border-default bg-bg-surface/80 px-3 text-sm font-semibold text-text-primary shadow-card transition hover:bg-bg-surface-hover"
          >
            Ouvrir les journees types
          </Link>
        </CardContent>
      </Card>
      <CategoriesManager categories={categories} />
    </section>
  );
}

