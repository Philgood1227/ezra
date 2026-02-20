import { Skeleton } from "@/components/ds";

export default function ParentMealsLoading(): React.JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-radius-card border border-border-subtle bg-bg-surface/80 p-5 shadow-card backdrop-blur-sm">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="h-24 rounded-radius-card" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Skeleton className="h-80 rounded-radius-card" />
        <Skeleton className="h-80 rounded-radius-card" />
      </div>
      <Skeleton className="h-48 rounded-radius-card" />
    </section>
  );
}
