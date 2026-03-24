import { headers } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { DEFAULT_FAMILY_LOCATION_GENEVA, type FamilyLocation } from "@/lib/time/family-location";

async function readFamilyLocationSetting(familyId: string | null): Promise<FamilyLocation | null> {
  void familyId;
  // TODO(family_location): read persisted `family_location` from the family settings table
  // once the parent dashboard exposes location configuration.
  return null;
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

async function readRequestTimeZone(): Promise<string | null> {
  try {
    const requestHeaders = await headers();
    const headerTimeZone =
      requestHeaders.get("x-vercel-ip-timezone") ?? requestHeaders.get("x-timezone");

    if (!headerTimeZone) {
      return null;
    }

    return isValidTimeZone(headerTimeZone) ? headerTimeZone : null;
  } catch {
    return null;
  }
}

export async function getFamilyLocationForCurrentFamily(): Promise<FamilyLocation> {
  return getFamilyLocationForFamilyId();
}

export async function getFamilyLocationForFamilyId(familyId?: string | null): Promise<FamilyLocation> {
  const resolvedFamilyId =
    typeof familyId === "undefined" ? (await getCurrentProfile()).familyId : familyId;
  const configuredLocation = await readFamilyLocationSetting(resolvedFamilyId);
  if (configuredLocation) {
    return configuredLocation;
  }

  const requestTimeZone = await readRequestTimeZone();
  if (!requestTimeZone) {
    return DEFAULT_FAMILY_LOCATION_GENEVA;
  }

  return {
    ...DEFAULT_FAMILY_LOCATION_GENEVA,
    timezone: requestTimeZone,
  };
}
