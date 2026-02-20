import { Skeleton } from "@/components/ds";

export default function ParentChecklistsLoading(): React.JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-radius-card border border-border-subtle bg-bg-surface/80 p-5 shadow-card backdrop-blur-sm">
        <p className="text-sm text-text-secondary">Organisation</p>
        <h1 className="font-display text-2xl font-black text-text-primary">Modeles de checklists</h1>
        <Skeleton className="mt-3 h-4 w-72" />
      </div>
      <Skeleton className="h-56 rounded-radius-card" />
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-radius-card" count={4} />
      </div>
    </section>
  );
}
