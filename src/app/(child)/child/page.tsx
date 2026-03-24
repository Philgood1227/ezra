import { ChildHomeLive } from "@/components/child/child-home-live";
import { getChildHomeData, getEmptyChildHomeData } from "@/lib/api/child-home";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getFamilyLocationForFamilyId } from "@/lib/time/family-location.server";
import { parseSelectedDateParam } from "@/lib/weather/date";

interface ChildHomePageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function ChildHomePage({
  searchParams,
}: ChildHomePageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const selectedDate = parseSelectedDateParam(params.date);
  const context = await getCurrentProfile();
  const familyLocation = await getFamilyLocationForFamilyId(context.familyId);
  const profileId = context.profile?.id;
  const homeData = profileId
    ? await getChildHomeData(profileId, {
        selectedDate,
        timezone: familyLocation.timezone,
        childDisplayName: context.profile?.display_name,
      })
    : getEmptyChildHomeData(selectedDate ?? new Date());

  return (
    <ChildHomeLive
      data={homeData}
      initialDateIso={homeData.date.toISOString()}
      timezone={familyLocation.timezone}
    />
  );
}
