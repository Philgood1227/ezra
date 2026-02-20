import { ChildCinemaView } from "@/components/child/cinema";
import { getMovieSessionProfilesById, getNextMovieSessionForCurrentChild } from "@/lib/api/cinema";

export default async function ChildCinemaPage(): Promise<React.JSX.Element> {
  const data = await getNextMovieSessionForCurrentChild();
  const profiles = data.session
    ? await getMovieSessionProfilesById(data.session.session.id)
    : { proposer: null, picker: null };

  return (
    <ChildCinemaView
      session={data.session}
      myVoteOptionId={data.myVoteOptionId}
      proposerLabel={profiles.proposer?.display_name ?? null}
      pickerLabel={profiles.picker?.display_name ?? null}
    />
  );
}
