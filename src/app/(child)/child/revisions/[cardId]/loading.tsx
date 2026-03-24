import { Card, CardContent, Skeleton } from "@/components/ds";

export default function ChildRevisionLoading(): React.JSX.Element {
  return (
    <section className="space-y-4" aria-busy="true" aria-live="polite">
      <Card>
        <CardContent className="space-y-4 py-4">
          <Skeleton className="h-6 w-64 max-w-full" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 py-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </section>
  );
}
