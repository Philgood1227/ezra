import { ChildConjugationHome } from "@/features/conjugation/components";
import { getConjugationChildHomeDataForCurrentChild } from "@/lib/api/conjugation";

export default async function ChildConjugaisonPage(): Promise<React.JSX.Element> {
  const data = await getConjugationChildHomeDataForCurrentChild();
  return <ChildConjugationHome data={data} />;
}
