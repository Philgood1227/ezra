import { Skeleton } from "@/components/ds";

export default function ParentRewardsLoading(): React.JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-radius-card border border-border-subtle bg-bg-surface/80 p-5 shadow-card backdrop-blur-sm">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="h-64 rounded-radius-card" />
      <Skeleton className="h-40 rounded-radius-card" />
    </section>
  );
}
