import { ChildChecklistsPreparationView } from "@/components/child/checklists/child-checklists-preparation-view";

export default function ChildChecklistsLoading(): React.JSX.Element {
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  return (
    <ChildChecklistsPreparationView
      tomorrow={{
        date: tomorrowDate,
        dateKey: "",
        dayTypeLabel: "Ecole",
        firstTransitionLabel: null,
        keyMoments: [],
      }}
      checklistInstances={[]}
      isLoading
    />
  );
}
