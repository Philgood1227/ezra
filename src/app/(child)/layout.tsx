import { ChildShell } from "@/components/layout/child-shell";
import { ChildThemeLock } from "@/components/layout/child-theme-lock";
import { getUncheckedChecklistCountForCurrentChild } from "@/lib/api/checklists";
import { requireChild } from "@/lib/auth/guards";

export default async function ChildLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const context = await requireChild();
  const checklistBadgeCount = await getUncheckedChecklistCountForCurrentChild();

  return (
    <ChildShell
      checklistBadgeCount={checklistBadgeCount}
      childProfileId={context.profile?.id ?? null}
      childDisplayName={context.profile?.display_name ?? "Ezra"}
    >
      <ChildThemeLock />
      {children}
    </ChildShell>
  );
}
