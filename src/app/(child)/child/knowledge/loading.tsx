import { ChildKnowledgeView } from "@/components/child/knowledge";

export default function ChildKnowledgeLoading(): React.JSX.Element {
  return (
    <ChildKnowledgeView
      subjects={[]}
      selectedSubjectId={null}
      categories={[]}
      favoriteCards={[]}
      isLoading
    />
  );
}

