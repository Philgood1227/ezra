import { Card, CardContent, Skeleton } from "@/components/ds";

export default function ChildToolsLoading(): React.JSX.Element {
  return (
    <section className="space-y-4" aria-busy="true" aria-live="polite">
      <header className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </header>
      <Card>
        <CardContent className="space-y-3 py-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 py-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    </section>
  );
}
