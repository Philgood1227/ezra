import Link from "next/link";
import { Badge, Card, CardContent, PageLayout } from "@/components/ds";
import {
  type ConjugationChildExerciseListItem,
  type ConjugationTimeDefinition,
  type ConjugationTimeKey,
} from "@/lib/conjugation/types";

interface ChildConjugationExercisesListProps {
  items: ConjugationChildExerciseListItem[];
  timeDefinitions: readonly ConjugationTimeDefinition[];
  selectedTimeKey: ConjugationTimeKey | null;
}

function getExerciseTypeLabel(type: ConjugationChildExerciseListItem["exercise"]["content"]["type"]): string {
  if (type === "qcm") {
    return "QCM";
  }
  if (type === "fill_blank") {
    return "Phrases a trous";
  }
  if (type === "match") {
    return "Associer";
  }
  return "Transformer";
}

function renderFilterLink(
  definition: ConjugationTimeDefinition,
  isActive: boolean,
): React.JSX.Element {
  return (
    <Link
      key={definition.key}
      href={`/child/conjugaison/exercises?time=${definition.key}`}
      className={`inline-flex h-touch-sm items-center rounded-radius-pill border px-3 text-xs font-semibold transition-colors duration-200 ${
        isActive
          ? "border-brand-primary bg-brand-50 text-brand-primary"
          : "border-border-default bg-bg-elevated text-text-primary hover:bg-bg-surface-hover"
      }`}
    >
      {definition.title}
    </Link>
  );
}

export function ChildConjugationExercisesList({
  items,
  timeDefinitions,
  selectedTimeKey,
}: ChildConjugationExercisesListProps): React.JSX.Element {
  const selectedDefinition = selectedTimeKey
    ? timeDefinitions.find((entry) => entry.key === selectedTimeKey) ?? null
    : null;

  return (
    <PageLayout
      title="Mes exercices de conjugaison"
      subtitle={
        selectedDefinition
          ? `Filtre actif: ${selectedDefinition.title}`
          : "Tous les exercices publies pour toi"
      }
      className="max-w-5xl"
      actions={
        <Link
          href="/child/conjugaison"
          className="inline-flex h-touch-sm items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-3 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
        >
          Retour
        </Link>
      }
    >
      <Card className="border-border-default bg-bg-surface/95 shadow-card">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/child/conjugaison/exercises"
              className={`inline-flex h-touch-sm items-center rounded-radius-pill border px-3 text-xs font-semibold transition-colors duration-200 ${
                selectedTimeKey === null
                  ? "border-brand-primary bg-brand-50 text-brand-primary"
                  : "border-border-default bg-bg-elevated text-text-primary hover:bg-bg-surface-hover"
              }`}
            >
              Tous
            </Link>
            {timeDefinitions.map((definition) =>
              renderFilterLink(definition, selectedTimeKey === definition.key),
            )}
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card className="border-border-default bg-bg-surface/95 shadow-card">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-semibold text-text-primary">Aucun exercice disponible</p>
            <p className="text-sm text-text-secondary">
              Papa/Maman n&apos;a pas encore publie d&apos;exercice pour ce filtre.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.exercise.id} className="border-border-default bg-bg-surface/95 shadow-card">
              <CardContent className="space-y-3 p-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-text-primary">{item.exercise.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{getExerciseTypeLabel(item.exercise.content.type)}</Badge>
                    <Badge variant={item.isCompleted ? "success" : "warning"}>
                      {item.isCompleted ? "Termine" : "Nouveau"}
                    </Badge>
                  </div>
                </div>
                {item.latestAttempt ? (
                  <p className="text-xs text-text-secondary">
                    Dernier score:{" "}
                    <span className="font-semibold text-text-primary">
                      {item.latestAttempt.score}%
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-text-secondary">Pas encore commence.</p>
                )}
                <Link
                  href={`/child/conjugaison/exercises/${item.exercise.id}`}
                  className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
                >
                  Ouvrir l&apos;exercice
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
