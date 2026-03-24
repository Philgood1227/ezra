import { PageLayout } from "@/components/ds";
import { ParentFichesManager } from "@/features/fiches/components";

export default function ParentFichesPage(): React.JSX.Element {
  return (
    <PageLayout
      title="Fiches"
      subtitle="Point d'entree unique pour organiser les fiches Francais et Mathematiques."
      hideHeader
      className="max-w-7xl"
    >
      <ParentFichesManager />
    </PageLayout>
  );
}
