import { ParentShell } from "@/components/layout/parent-shell";
import { getParentNavBadges } from "@/lib/api/parent-nav";
import { requireParent } from "@/lib/auth/guards";

export default async function ParentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const context = await requireParent();
  const initialBadges = await getParentNavBadges();

  return (
    <ParentShell
      initialBadges={initialBadges}
      parentProfileId={context.profile?.id ?? null}
      parentDisplayName={context.profile?.display_name ?? "Parent"}
    >
      {children}
    </ParentShell>
  );
}
