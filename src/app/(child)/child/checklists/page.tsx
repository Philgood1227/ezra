import { ChildChecklistsView } from "@/components/child/checklists";
import { getChecklistPageDataForCurrentChild } from "@/lib/api/checklists";

export default async function ChildChecklistsPage(): Promise<React.JSX.Element> {
  const pageData = await getChecklistPageDataForCurrentChild();
  return <ChildChecklistsView byDay={pageData.byDay} />;
}
