import { notFound } from "next/navigation";
import { PageLayout } from "@/components/ds";
import { RevisionDetailClient } from "@/components/parent/revisions";
import {
  deleteRevisionCardAction,
  setRevisionCardStatusAction,
  type RevisionCardManagementActionResult,
} from "@/lib/actions/revisions";
import { getStoredRevisionCardById } from "@/lib/api/revisions";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import type { RevisionCardStatus } from "@/lib/revisions/types";

interface ParentRevisionDetailPageProps {
  params: Promise<{
    cardId: string;
  }>;
}

export default async function ParentRevisionDetailPage({
  params,
}: ParentRevisionDetailPageProps): Promise<React.JSX.Element> {
  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id || context.role !== "parent") {
    notFound();
  }

  const { cardId } = await params;
  const card = await getStoredRevisionCardById(cardId);
  if (!card) {
    notFound();
  }

  async function submitSetStatusAction(input: {
    cardId: string;
    status: RevisionCardStatus;
  }): Promise<RevisionCardManagementActionResult> {
    "use server";

    return setRevisionCardStatusAction(input);
  }

  async function submitDeleteAction(input: {
    cardId: string;
  }): Promise<RevisionCardManagementActionResult> {
    "use server";

    return deleteRevisionCardAction(input);
  }

  return (
    <PageLayout
      title="Revision Card"
      subtitle="Apercu parent en lecture seule avec actions de publication."
      className="max-w-4xl"
    >
      <RevisionDetailClient
        card={card}
        onSetStatusAction={submitSetStatusAction}
        onDeleteAction={submitDeleteAction}
      />
    </PageLayout>
  );
}
