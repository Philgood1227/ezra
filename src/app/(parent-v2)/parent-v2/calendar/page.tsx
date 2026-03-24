import Link from "next/link";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ds";
import { SchoolCalendarManager } from "@/features/day-templates/components";
import {
  getAllTemplatesForCurrentFamily,
  getSchoolPeriodsForCurrentFamily,
  getTemplateWeekOverviewForCurrentFamily,
} from "@/lib/api/templates";
import { getWeekdaySortKey, WEEKDAY_OPTIONS } from "@/lib/day-templates/constants";
import { deriveDayPeriod } from "@/lib/day-templates/school-calendar";
import type { DayTemplateBlockSummary } from "@/lib/day-templates/types";

const linkButtonClass =
  "inline-flex h-touch-sm items-center justify-center rounded-radius-button border border-border-default bg-bg-surface/80 px-3 text-sm font-semibold text-text-primary shadow-card transition-all hover:-translate-y-0.5 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

function getTodayPeriodLabel(period: "ecole" | "vacances" | "weekend" | "jour_special"): string {
  if (period === "vacances") {
    return "Vacances";
  }

  if (period === "weekend") {
    return "Week-end";
  }

  if (period === "jour_special") {
    return "Jour special";
  }

  return "Ecole";
}

function SchoolBlocksPreview({ blocks }: { blocks: DayTemplateBlockSummary[] }): React.JSX.Element {
  const schoolBlocks = blocks.filter((block) => block.blockType === "school");

  if (schoolBlocks.length === 0) {
    return <p className="mt-2 text-xs text-text-muted">Plages scolaires non definies</p>;
  }

  return (
    <div className="mt-2 space-y-1">
      {schoolBlocks.slice(0, 2).map((block) => (
        <p key={block.id} className="rounded-radius-pill bg-category-ecole/18 px-2 py-1 text-xs font-medium text-text-secondary">
          Ecole {block.startTime} - {block.endTime}
        </p>
      ))}
    </div>
  );
}

export default async function ParentV2CalendarPage(): Promise<React.JSX.Element> {
  const [overview, templates, schoolPeriods] = await Promise.all([
    getTemplateWeekOverviewForCurrentFamily(),
    getAllTemplatesForCurrentFamily(),
    getSchoolPeriodsForCurrentFamily(),
  ]);

  const todayPeriod = deriveDayPeriod(new Date(), schoolPeriods);
  const todayWeekday = new Date().getDay();
  const configuredDaysCount = overview.filter((day) => day.defaultTemplate !== null).length;

  const additionalTemplates = templates
    .filter((template) => !template.isDefault)
    .sort((left, right) => getWeekdaySortKey(left.weekday) - getWeekdaySortKey(right.weekday));

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Calendrier</h1>
        <p className="text-sm text-gray-600">
          Configurez les journees types, les periodes scolaires et les variantes hebdomadaires.
        </p>
      </div>

      <Card className="border-sky-100 bg-gradient-to-br from-sky-50/70 via-white to-white">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Planning hebdomadaire</CardTitle>
            <CardDescription>
              Journees types et contexte scolaire · Periode actuelle : {getTodayPeriodLabel(todayPeriod.period)}
            </CardDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="info">{configuredDaysCount}/7 jours configures</Badge>
              <Badge variant="neutral">Periode: {getTodayPeriodLabel(todayPeriod.period)}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/parent-v2/school-missions" className={linkButtonClass}>
              Missions d&apos;ecole
            </Link>
            <Link href="/parent-v2/pleasure-activities" className={linkButtonClass}>
              Activites plaisir
            </Link>
            <Link href="/parent-v2/calendar/new" className={linkButtonClass}>
              Creer une journee libre
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {overview.map((day) => (
              <article
                key={day.weekday}
                className={`rounded-xl border p-3 transition-all ${
                  day.weekday === todayWeekday
                    ? "border-sky-300 bg-sky-50/70 shadow-md"
                    : "border-border-subtle bg-bg-surface-hover/60 hover:-translate-y-0.5 hover:shadow-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">{day.weekdayLabel}</p>
                  {day.weekday === todayWeekday ? <Badge variant="info">Aujourd&apos;hui</Badge> : null}
                </div>
                {day.defaultTemplate ? (
                  <>
                    <p className="mt-2 text-sm text-text-secondary">{day.defaultTemplate.name}</p>
                    <SchoolBlocksPreview blocks={day.defaultTemplateBlocks} />
                    <Link href={`/parent-v2/calendar/${day.defaultTemplate.id}`} className={`${linkButtonClass} mt-3`}>
                      Modifier
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-text-secondary">Aucune journee type</p>
                    <Link href={`/parent-v2/calendar/new?weekday=${day.weekday}`} className={`${linkButtonClass} mt-3`}>
                      Creer
                    </Link>
                  </>
                )}
              </article>
            ))}
          </div>
        </CardContent>
      </Card>

      <SchoolCalendarManager periods={schoolPeriods} />

      <Card>
        <CardHeader>
          <CardTitle>Autres journees types</CardTitle>
          <CardDescription>Variantes disponibles en plus du modele par defaut.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {additionalTemplates.length === 0 ? (
            <EmptyState
              icon="🗓️"
              title="Aucune variante pour le moment"
              description="Vous pouvez creer des variantes pour differencier les semaines."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {additionalTemplates.map((template) => (
                <article
                  key={template.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3 transition-all hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div>
                    <p className="font-semibold text-text-primary">{template.name}</p>
                    <p className="text-sm text-text-secondary">
                      {WEEKDAY_OPTIONS.find((day) => day.value === template.weekday)?.label ?? "Jour"}
                    </p>
                  </div>
                  <Link href={`/parent-v2/calendar/${template.id}`} className={linkButtonClass}>
                    Modifier
                  </Link>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
