import { ChildChecklistsPreparationView } from "@/components/child/checklists/child-checklists-preparation-view";
import { getChecklistPageDataForCurrentChild } from "@/lib/api/checklists";

export default async function ChildChecklistsPage(): Promise<React.JSX.Element> {
  const pageData = await getChecklistPageDataForCurrentChild();
  return (
    <ChildChecklistsPreparationView
      tomorrow={pageData.tomorrow}
      checklistInstances={pageData.byDay.tomorrow}
    />
  );
}
