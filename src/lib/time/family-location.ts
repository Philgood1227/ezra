export const FAMILY_LOCATION_CONFIG_KEY = "family_location";

export interface FamilyLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const DEFAULT_FAMILY_LOCATION_GENEVA: FamilyLocation = {
  city: "Geneve",
  country: "Suisse",
  latitude: 46.2044,
  longitude: 6.1432,
  timezone: "Europe/Zurich",
};

export function getFamilyLocationLabel(location: FamilyLocation): string {
  return `${location.city}, ${location.country}`;
}
