import { Card, CardContent, PageLayout, Skeleton } from "@/components/ds";

export default function ParentRevisionsLoading(): React.JSX.Element {
  return (
    <PageLayout
      title="Revisions"
      subtitle="Chargement de la bibliotheque..."
      className="max-w-6xl"
    >
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Card>
          <CardContent className="space-y-4 py-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-md" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
