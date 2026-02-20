import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  DEFAULT_FAMILY_LOCATION_GENEVA,
  type FamilyLocation,
} from "@/lib/time/family-location";

async function readFamilyLocationSetting(familyId: string | null): Promise<FamilyLocation | null> {
  void familyId;
  // TODO(family_location): read persisted `family_location` from the family settings table
  // once the parent dashboard exposes location configuration.
  return null;
}

export async function getFamilyLocationForCurrentFamily(): Promise<FamilyLocation> {
  const context = await getCurrentProfile();
  const configuredLocation = await readFamilyLocationSetting(context.familyId);
  return configuredLocation ?? DEFAULT_FAMILY_LOCATION_GENEVA;
}
