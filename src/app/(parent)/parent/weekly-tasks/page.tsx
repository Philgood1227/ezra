import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ds";
import { getTemplateWeekOverviewForCurrentFamily } from "@/lib/api/templates";

const linkButtonClass =
  "inline-flex h-touch-sm items-center justify-center rounded-radius-button border border-border-default bg-bg-surface/80 px-3 text-sm font-semibold text-text-primary shadow-card transition hover:bg-bg-surface-hover";

export default async function ParentWeeklyTasksPage(): Promise<React.JSX.Element> {
  const overview = await getTemplateWeekOverviewForCurrentFamily();

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Taches hebdomadaires</CardTitle>
            <CardDescription>
              Programmation des taches separee des Journees types.
            </CardDescription>
          </div>
          <Link href="/parent/day-templates" className={linkButtonClass}>
            Gerer les journees types
          </Link>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Par jour de la semaine</CardTitle>
          <CardDescription>Chaque jour utilise son modele par defaut.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {overview.map((day) => (
              <article key={day.weekday} className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3">
                <p className="text-sm font-semibold text-text-primary">{day.weekdayLabel}</p>
                {day.defaultTemplate ? (
                  <>
                    <p className="mt-1 text-sm text-text-secondary">{day.defaultTemplate.name}</p>
                    <Link href={`/parent/weekly-tasks/${day.defaultTemplate.id}`} className={`${linkButtonClass} mt-3`}>
                      Programmer les taches
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-text-secondary">Aucune journee type par defaut</p>
                    <Link href={`/parent/day-templates/new?weekday=${day.weekday}`} className={`${linkButtonClass} mt-3`}>
                      Creer une journee type
                    </Link>
                  </>
                )}
              </article>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
