import { Skeleton } from "@/components/ds";

export default function ParentDayTemplatesLoading(): React.JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-radius-card border border-border-subtle bg-bg-surface/80 p-5 shadow-card backdrop-blur-sm">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <Skeleton className="h-32 rounded-radius-card" count={7} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-28 rounded-radius-card" count={3} />
      </div>
    </section>
  );
}
