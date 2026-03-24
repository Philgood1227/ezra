import Link from "next/link";
import { Card, CardContent, PageLayout } from "@/components/ds";

export default function ChildToolsPage(): React.JSX.Element {
  return (
    <PageLayout
      title="Outils"
      subtitle="Lance un outil simple pour avancer dans ta journee."
      className="max-w-3xl px-0 py-0"
      hideHeader
    >
      <section className="space-y-4" aria-label="Outils enfant">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-black tracking-tight text-text-primary">
            Outils
          </h1>
          <p className="text-sm text-text-secondary">
            Choisis un outil pour te concentrer ou revoir une fiche.
          </p>
        </header>

        <Card className="border-border-default bg-bg-surface/95 shadow-card">
          <CardContent className="space-y-3 p-4">
            <h2 className="text-lg font-bold text-text-primary">Focus et timer</h2>
            <p className="text-sm text-text-secondary">
              Ouvre ta journee pour lancer le timer ou un pomodoro sur ta mission.
            </p>
            <Link
              href="/child/my-day"
              className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
            >
              Ouvrir ma journee
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border-default bg-bg-surface/95 shadow-card">
          <CardContent className="space-y-3 p-4">
            <h2 className="text-lg font-bold text-text-primary">Fiches de revision</h2>
            <p className="text-sm text-text-secondary">
              Retrouve tes fiches pour revoir l&apos;essentiel.
            </p>
            <Link
              href="/child/knowledge"
              className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
            >
              Ouvrir les fiches
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border-default bg-bg-surface/95 shadow-card">
          <CardContent className="space-y-3 p-4">
            <h2 className="text-lg font-bold text-text-primary">Conjugaison</h2>
            <p className="text-sm text-text-secondary">
              Decouvre les temps de l&apos;indicatif et fais des exercices.
            </p>
            <Link
              href="/child/conjugaison"
              className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
            >
              Ouvrir conjugaison
            </Link>
          </CardContent>
        </Card>
      </section>
    </PageLayout>
  );
}
