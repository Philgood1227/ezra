import Link from "next/link";
import { Badge, Card, CardContent, PageLayout } from "@/components/ds";
import { type ConjugationChildHomeData, type ConjugationTimeDefinition } from "@/lib/conjugation/types";

interface ChildConjugationHomeProps {
  data: ConjugationChildHomeData;
}

function getDefinitionBadgeColor(index: number): "info" | "success" | "warning" | "neutral" {
  if (index === 0) {
    return "info";
  }
  if (index === 1) {
    return "success";
  }
  if (index === 2) {
    return "warning";
  }
  return "neutral";
}

function renderTimeCard(definition: ConjugationTimeDefinition, index: number): React.JSX.Element {
  const color = getDefinitionBadgeColor(index);
  return (
    <Card key={definition.key} className="border-border-default bg-bg-surface/95 shadow-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-text-primary">{definition.title}</h3>
            <p className="text-sm text-text-secondary">{definition.subtitle}</p>
          </div>
          <Badge variant={color}>Temps</Badge>
        </div>
        <p className="text-sm text-text-secondary">{definition.explanation}</p>
        <Link
          href={`/child/conjugaison/${definition.key}`}
          className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
        >
          Voir la fiche
        </Link>
      </CardContent>
    </Card>
  );
}

export function ChildConjugationHome({ data }: ChildConjugationHomeProps): React.JSX.Element {
  const timeDefinitions = data.timeDefinitions.filter((entry) => entry.key !== "auxiliaires");
  const auxiliaries = data.timeDefinitions.find((entry) => entry.key === "auxiliaires") ?? null;

  return (
    <PageLayout
      title="Conjugaison"
      subtitle="Decouvre les temps de l'indicatif et entraine-toi !"
      className="max-w-5xl"
    >
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black text-text-primary">Les temps</h2>
          <Badge variant="info">{timeDefinitions.length} fiches</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {timeDefinitions.map((definition, index) => renderTimeCard(definition, index))}
        </div>
      </section>

      {auxiliaries ? (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-text-primary">Auxiliaires etre & avoir</h2>
          <Card className="border-border-default bg-bg-surface/95 shadow-card">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-text-primary">{auxiliaries.title}</h3>
                  <p className="text-sm text-text-secondary">{auxiliaries.subtitle}</p>
                </div>
                <Badge variant="warning">Base</Badge>
              </div>
              <p className="text-sm text-text-secondary">{auxiliaries.explanation}</p>
              <Link
                href={`/child/conjugaison/${auxiliaries.key}`}
                className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
              >
                Voir la fiche
              </Link>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-black text-text-primary">Mes exercices de conjugaison</h2>
        <Card className="border-border-default bg-bg-surface/95 shadow-card">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-text-secondary">
              Tu as{" "}
              <span className="font-bold text-text-primary">{data.pendingExerciseCount}</span>{" "}
              exercice(s) en attente.
            </p>
            <div className="flex flex-wrap gap-2">
              {data.timeDefinitions.map((definition) => {
                const pendingCount = data.byTimePending[definition.key];
                if (pendingCount <= 0) {
                  return null;
                }
                return (
                  <Link
                    key={definition.key}
                    href={`/child/conjugaison/exercises?time=${definition.key}`}
                    className="inline-flex h-touch-sm items-center gap-2 rounded-radius-pill border border-border-default bg-bg-elevated px-3 text-xs font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
                  >
                    {definition.title}
                    <Badge variant="warning">{pendingCount}</Badge>
                  </Link>
                );
              })}
              {data.pendingExerciseCount === 0 ? (
                <Badge variant="success">Tout est termine</Badge>
              ) : null}
            </div>
            <Link
              href="/child/conjugaison/exercises"
              className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
            >
              Voir mes exercices
            </Link>
          </CardContent>
        </Card>
      </section>
    </PageLayout>
  );
}
