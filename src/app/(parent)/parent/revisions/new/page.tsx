import { PageLayout } from "@/components/ds";
import { ParentNewRevisionPage } from "@/components/parent/revisions";
import { createDraftRevisionAction } from "./actions";

export default function ParentNewRevisionRoute(): React.JSX.Element {
  return (
    <PageLayout
      title="New revision"
      subtitle="Create a minimal draft card manually (subject, type, level, title)."
      className="max-w-4xl"
    >
      <ParentNewRevisionPage onCreateDraftAction={createDraftRevisionAction} />
    </PageLayout>
  );
}
