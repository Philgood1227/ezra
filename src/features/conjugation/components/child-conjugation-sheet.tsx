import Link from "next/link";
import { Badge, Card, CardContent, PageLayout } from "@/components/ds";
import {
  type ConjugationSheetRecord,
  type ConjugationTimeDefinition,
  type ConjugationTimeKey,
} from "@/lib/conjugation/types";

interface ChildConjugationSheetProps {
  timeDefinition: ConjugationTimeDefinition;
  sheet: ConjugationSheetRecord;
  exerciseCount: number;
}

interface SheetSectionProps {
  title: string;
  html: string;
}

function SheetSection({ title, html }: SheetSectionProps): React.JSX.Element | null {
  const trimmed = html.trim();
  if (!trimmed) {
    return null;
  }

  return (
    <Card className="border-border-default bg-bg-surface/95 shadow-card">
      <CardContent className="space-y-2 p-4">
        <h3 className="text-base font-bold text-text-primary">{title}</h3>
        <div
          className="prose prose-sm max-w-none text-text-primary [&_ul]:pl-4"
          dangerouslySetInnerHTML={{ __html: trimmed }}
        />
      </CardContent>
    </Card>
  );
}

function getBadgeVariant(
  key: ConjugationTimeKey,
): "info" | "success" | "warning" | "neutral" {
  if (key === "present-indicatif") {
    return "info";
  }
  if (key === "imparfait-indicatif") {
    return "success";
  }
  if (key === "passe-compose") {
    return "warning";
  }
  return "neutral";
}

export function ChildConjugationSheet({
  timeDefinition,
  sheet,
  exerciseCount,
}: ChildConjugationSheetProps): React.JSX.Element {
  const badgeVariant = getBadgeVariant(timeDefinition.key);

  return (
    <PageLayout
      title={timeDefinition.title}
      subtitle={timeDefinition.subtitle}
      className="max-w-4xl"
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Francais</Badge>
            <Badge variant="neutral">Conjugaison</Badge>
            <Badge variant={badgeVariant}>{timeDefinition.title}</Badge>
          </div>
          <p className="text-sm text-text-secondary">{timeDefinition.explanation}</p>
        </CardContent>
      </Card>

      <SheetSection title="A quoi ca sert" html={sheet.blocks.aQuoiCaSertHtml} />
      <SheetSection title="Marques du temps" html={sheet.blocks.marquesDuTempsHtml} />
      <SheetSection
        title="Exemple de conjugaison complete"
        html={sheet.blocks.exempleConjugaisonCompleteHtml}
      />
      <SheetSection title="Verbes auxiliaires" html={sheet.blocks.verbesAuxiliairesHtml} />
      <SheetSection title="Trucs et astuces" html={sheet.blocks.trucsAstucesHtml} />

      <Card className="border-border-default bg-bg-surface/95 shadow-card">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm text-text-secondary">
            Exercice(s) disponible(s) pour ce temps:{" "}
            <span className="font-bold text-text-primary">{exerciseCount}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/child/conjugaison/exercises?time=${timeDefinition.key}`}
              className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
            >
              Faire des exercices
            </Link>
            <Link
              href="/child/conjugaison/exercises"
              className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
            >
              Tous mes exercices
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
