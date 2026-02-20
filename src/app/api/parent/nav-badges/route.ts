import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getParentNavBadges } from "@/lib/api/parent-nav";
import { EMPTY_PARENT_NAV_BADGES } from "@/lib/navigation/parent-nav-badges";

export async function GET(): Promise<NextResponse> {
  const context = await getCurrentProfile();
  if (context.role !== "parent" && context.role !== "viewer") {
    return NextResponse.json(EMPTY_PARENT_NAV_BADGES, { status: 401 });
  }

  const badges = await getParentNavBadges();
  return NextResponse.json(badges);
}
