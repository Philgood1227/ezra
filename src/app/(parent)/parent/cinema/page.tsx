import { PageLayout } from "@/components/ds";
import { ParentCinemaManager } from "@/features/cinema/components";
import {
  getCinemaFamilyMembers,
  getMovieSessionsForCurrentFamily,
  getSuggestedCinemaRotation,
} from "@/lib/api/cinema";

export default async function ParentCinemaPage(): Promise<React.JSX.Element> {
  const [sessions, members, suggestedRotation] = await Promise.all([
    getMovieSessionsForCurrentFamily(),
    getCinemaFamilyMembers(),
    getSuggestedCinemaRotation(),
  ]);

  return (
    <PageLayout hideHeader
      title="Cinema familial"
      subtitle="Organisation parent des sessions film avec regles simples et transparentes."
    >
      <ParentCinemaManager
        sessions={sessions}
        members={members}
        suggestedRotation={suggestedRotation}
      />
    </PageLayout>
  );
}

