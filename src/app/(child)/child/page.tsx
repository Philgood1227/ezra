import { ChildHomeLive } from "@/components/child/child-home-live";
import { getChildHomeData, getEmptyChildHomeData } from "@/lib/api/child-home";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getFamilyLocationForCurrentFamily } from "@/lib/time/family-location.server";

export default async function ChildHomePage(): Promise<React.JSX.Element> {
  const context = await getCurrentProfile();
  const profileId = context.profile?.id;
  const homeData = profileId ? await getChildHomeData(profileId) : getEmptyChildHomeData();
  const familyLocation = await getFamilyLocationForCurrentFamily();

  return (
    <ChildHomeLive
      data={homeData}
      initialDateIso={homeData.date.toISOString()}
      timezone={familyLocation.timezone}
    />
  );
}
