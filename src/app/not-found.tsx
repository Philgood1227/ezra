import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageLayout } from "@/components/ds";

export default function NotFoundPage(): React.JSX.Element {
  return (
    <PageLayout title="Page introuvable" subtitle="Le lien utilise n'existe pas ou n'est plus valide." className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Erreur 404</CardTitle>
          <CardDescription>
            Verifiez le menu de navigation ou retournez a votre espace principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-ink-inverse transition duration-[var(--motion-fast)] hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          >
            Retour a l&apos;accueil
          </Link>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
