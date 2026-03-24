import { Card, CardContent, PageLayout, Skeleton } from "@/components/ds";

export default function ParentBooksResourcesLoading(): React.JSX.Element {
  return (
    <PageLayout
      title="Livres & Fiches"
      subtitle="Chargement des ressources..."
      className="max-w-6xl"
    >
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Card>
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-full max-w-lg" />
            <Skeleton className="h-10 w-full max-w-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
