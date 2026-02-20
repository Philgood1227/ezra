import { ChildChecklistsView } from "@/components/child/checklists";

export default function ChildChecklistsLoading(): React.JSX.Element {
  return <ChildChecklistsView byDay={{ today: [], tomorrow: [] }} isLoading />;
}

