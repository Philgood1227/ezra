import { ParentConjugationManager } from "@/features/conjugation/components";
import { getConjugationParentPageData } from "@/lib/api/conjugation";

export default async function ParentV2ConjugaisonPage(): Promise<React.JSX.Element> {
  const data = await getConjugationParentPageData();
  return <ParentConjugationManager initialData={data} />;
}
