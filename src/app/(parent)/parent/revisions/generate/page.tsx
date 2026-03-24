import { PageLayout } from "@/components/ds";
import { ParentGenerateRevisionPage } from "@/components/parent/revisions";
import { generateRevisionAction } from "../ai-actions";

export default function ParentRevisionGeneratePage(): React.JSX.Element {
  return (
    <PageLayout
      title="Generate revision"
      subtitle="Create an AI-assisted draft from subject, level, and topic."
      className="max-w-4xl"
    >
      <ParentGenerateRevisionPage onGenerateAction={generateRevisionAction} />
    </PageLayout>
  );
}
