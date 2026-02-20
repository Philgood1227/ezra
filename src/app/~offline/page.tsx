import { Card, CardContent, CardHeader, CardTitle, PageLayout } from "@/components/ds";

export default function OfflinePage(): React.JSX.Element {
  return (
    <PageLayout title="Vous etes hors ligne" subtitle="Ezra reste disponible en mode limite.">
      <Card>
        <CardHeader>
          <CardTitle>Connexion perdue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-muted">
            Reconnectez-vous pour synchroniser l&apos;authentification et les donnees de la famille
            depuis Supabase.
          </p>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
