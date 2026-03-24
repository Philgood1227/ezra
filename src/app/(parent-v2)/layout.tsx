import { ParentV2Shell } from "@/components/layout/parent-v2-shell";
import { requireParent } from "@/lib/auth/guards";

export default async function ParentV2Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const context = await requireParent();

  return (
    <ParentV2Shell parentDisplayName={context.profile?.display_name ?? "Parent"}>
      {children}
    </ParentV2Shell>
  );
}

