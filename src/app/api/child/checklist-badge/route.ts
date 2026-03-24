import { NextResponse } from "next/server";
import { getUncheckedChecklistCountForCurrentChild } from "@/lib/api/checklists";
import { getCurrentProfile } from "@/lib/auth/current-profile";

export async function GET(): Promise<NextResponse> {
  const context = await getCurrentProfile();
  if (context.role !== "child") {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }

  const count = await getUncheckedChecklistCountForCurrentChild();
  return NextResponse.json({ count });
}
