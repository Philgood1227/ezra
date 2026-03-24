export default function ChildRewardsLoading(): React.JSX.Element {
  return (
    <div className="min-h-full bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 px-3 py-4 md:px-5">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4">
        <div className="h-44 animate-pulse rounded-[28px] border-4 border-white bg-white/70" />
        <div className="h-24 animate-pulse rounded-3xl border-4 border-white bg-white/70" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-72 animate-pulse rounded-[26px] border-4 border-emerald-200 bg-emerald-100/60" />
          <div className="h-72 animate-pulse rounded-[26px] border-4 border-emerald-200 bg-emerald-100/60" />
          <div className="h-72 animate-pulse rounded-[26px] border-4 border-emerald-200 bg-emerald-100/60" />
        </div>
      </div>
    </div>
  );
}
