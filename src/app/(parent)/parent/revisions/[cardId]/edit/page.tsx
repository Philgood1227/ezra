import { notFound } from "next/navigation";
import { PageLayout } from "@/components/ds";
import { ParentRevisionEditPage } from "@/components/parent/revisions";
import { getStoredRevisionCardById } from "@/lib/api/revisions";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { saveRevisionCardAction } from "./actions";

interface ParentRevisionEditRouteProps {
  params: Promise<{
    cardId: string;
  }>;
}

export default async function ParentRevisionEditRoute({
  params,
}: ParentRevisionEditRouteProps): Promise<React.JSX.Element> {
  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id || context.role !== "parent") {
    notFound();
  }

  const { cardId } = await params;
  const card = await getStoredRevisionCardById(cardId);
  if (!card) {
    notFound();
  }

  return (
    <PageLayout
      title="Edit Revision"
      subtitle="Update revision content with live child preview before publishing."
      className="max-w-7xl"
    >
      <ParentRevisionEditPage initialCard={card} onSaveAction={saveRevisionCardAction} />
    </PageLayout>
  );
}
