import { notFound } from "next/navigation";
import { PageLayout } from "@/components/ds";
import { KnowledgeSubjectManager } from "@/features/knowledge/components";
import { getKnowledgeSubjectDetailForCurrentFamily } from "@/lib/api/knowledge";

interface ParentKnowledgeSubjectPageProps {
  params: Promise<{
    subjectId: string;
  }>;
}

export default async function ParentKnowledgeSubjectPage({
  params,
}: ParentKnowledgeSubjectPageProps): Promise<React.JSX.Element> {
  const resolvedParams = await params;
  const detail = await getKnowledgeSubjectDetailForCurrentFamily(resolvedParams.subjectId);

  if (!detail.subject) {
    notFound();
  }

  return (
    <PageLayout hideHeader
      title={`Fiches - ${detail.subject.label}`}
      subtitle="Edition parent des categories et fiches de cette matiere."
    >
      <KnowledgeSubjectManager subject={detail.subject} categories={detail.categories} />
    </PageLayout>
  );
}
