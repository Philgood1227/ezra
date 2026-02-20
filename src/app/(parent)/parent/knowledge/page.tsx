import { PageLayout } from "@/components/ds";
import { KnowledgeOverviewManager } from "@/features/knowledge/components";
import { getKnowledgeSubjectsForCurrentFamily } from "@/lib/api/knowledge";

export default async function ParentKnowledgePage(): Promise<React.JSX.Element> {
  const subjects = await getKnowledgeSubjectsForCurrentFamily();

  return (
    <PageLayout hideHeader
      title="Base de connaissances"
      subtitle="Gestion parent des matieres et fiches d'aide pour les devoirs."
    >
      <KnowledgeOverviewManager subjects={subjects} />
    </PageLayout>
  );
}

