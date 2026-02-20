import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageLayout, Skeleton } from "@/components/ds";

export default function RootLoading(): React.JSX.Element {
  return (
    <PageLayout
      title="Chargement"
      subtitle="Preparation de votre espace Ezra..."
      className="max-w-3xl"
    >
      <Card aria-busy="true" aria-live="polite">
        <CardHeader>
          <CardTitle>Un instant</CardTitle>
          <CardDescription>Les donnees de la famille sont en cours de chargement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-11 w-full rounded-radius-button" />
          <Skeleton className="h-11 w-full rounded-radius-button" />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
