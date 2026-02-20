"use client";

import { useRouter } from "next/navigation";
import { Button, Card, CardContent } from "@/components/ds";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import {
  EmotionsWidget,
  KpiCard,
  MealsWidget,
  SchoolDiaryWidget,
  TodayLoadWidget,
  WeeklyPointsWidget,
  WeeklyTasksWidget,
} from "@/components/parent/dashboard";
import { shiftWeekStartKey, type DashboardWeekSummary } from "@/lib/domain/dashboard";

interface ParentDashboardDiaryEntryPreview {
  id: string;
  type: string;
  date: string;
  title: string;
}

interface ParentDashboardViewProps {
  childName: string;
  weekStart: string;
  summary: DashboardWeekSummary;
  schoolDiaryCount: number;
  schoolDiaryUpcoming: ParentDashboardDiaryEntryPreview[];
}

function StarIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 17l-5.2 2.5 1-5.8-4.2-4.1 5.8-.8L12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d="m5.4 12.2 4.1 4.1 9.1-9.1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SmileIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9 14.5c.7.8 1.8 1.3 3 1.3s2.3-.5 3-1.3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle cx="9.2" cy="10.2" r="1" fill="currentColor" />
      <circle cx="14.8" cy="10.2" r="1" fill="currentColor" />
    </svg>
  );
}

function GaugeIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d="M4.5 14a7.5 7.5 0 1 1 15 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path d="m12 13 3.2-3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function formatWeekLabel(weekStartKey: string): string {
  const [year, month, day] = weekStartKey.split("-").map(Number);
  const start = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatMoodValue(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return value.toFixed(1);
}

export function ParentDashboardView({
  childName,
  weekStart,
  summary,
  schoolDiaryCount,
  schoolDiaryUpcoming,
}: ParentDashboardViewProps): React.JSX.Element {
  const router = useRouter();

  const favoriteMealsCount = summary.favoriteMeals.reduce((count, meal) => count + meal.count, 0);
  const moodValue = formatMoodValue(summary.averageMoodScore);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">Pilotage parent de {childName}</p>
            <h2 className="font-display text-2xl font-black tracking-tight text-text-primary">
              Semaine du {formatWeekLabel(weekStart)}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => router.push(`/parent/dashboard?weekStart=${shiftWeekStartKey(weekStart, -1)}`)}>
              Semaine precedente
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/parent/dashboard?weekStart=${shiftWeekStartKey(weekStart, 1)}`)}>
              Semaine suivante
            </Button>
          </div>
        </CardContent>
      </Card>

      <StaggerContainer className="space-y-4">
        <StaggerItem>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Taches completees cette semaine"
              value={`${summary.completionRateWeek}%`}
              icon={<CheckIcon />}
              detail={`${summary.daily.reduce((count, day) => count + day.completedTasks, 0)} taches validees`}
              trend={summary.completionRateWeek >= 70 ? "+ dynamique stable" : "- a renforcer"}
              trendTone={summary.completionRateWeek >= 70 ? "up" : "down"}
            />
            <KpiCard
              label="Points cumules cette semaine"
              value={`${summary.pointsTotalWeek}`}
              icon={<StarIcon />}
              detail="Total de points hebdomadaire"
              trend={summary.pointsTotalWeek >= 80 ? "+ bonne dynamique" : "- marge de progression"}
              trendTone={summary.pointsTotalWeek >= 80 ? "up" : "neutral"}
            />
            <KpiCard
              label="Humeur moyenne"
              value={moodValue}
              icon={<SmileIcon />}
              detail={summary.moodMessage}
              trend="Semaine emotionnelle"
              trendTone="neutral"
            />
            <KpiCard
              label="Charge d'aujourd'hui"
              value={`${summary.todayLoadScore}/5`}
              icon={<GaugeIcon />}
              detail={summary.todayLoadLabel}
              trend={summary.todayLoadScore >= 4 ? "+ charge elevee" : "- charge controlee"}
              trendTone={summary.todayLoadScore >= 4 ? "down" : "up"}
            />
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <WeeklyTasksWidget daily={summary.daily} />
            <WeeklyPointsWidget daily={summary.daily} />
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-4 xl:grid-cols-3">
            <EmotionsWidget daily={summary.daily} moodMessage={summary.moodMessage} />
            <TodayLoadWidget
              score={summary.todayLoadScore}
              label={summary.todayLoadLabel}
              assignments={summary.todayAssignmentShare}
            />
            <MealsWidget
              mealsCount={summary.mealsWeekCount}
              ratedMealsCount={summary.ratedMealsWeekCount}
              favoriteMealsCount={favoriteMealsCount}
              bofStreak={summary.bofStreak}
            />
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <SchoolDiaryWidget totalCount={schoolDiaryCount} entries={schoolDiaryUpcoming} />
            <Card>
              <CardContent className="space-y-3">
                <h3 className="text-lg font-bold text-text-primary">Actions rapides</h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button fullWidth variant="secondary" onClick={() => router.push("/parent/school-diary")}>
                    Ajuster le carnet
                  </Button>
                  <Button fullWidth variant="secondary" onClick={() => router.push("/parent/meals")}>
                    Ajuster les repas
                  </Button>
                  <Button fullWidth variant="secondary" onClick={() => router.push("/parent/day-templates")}>
                    Modifier la journee type
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </section>
  );
}
