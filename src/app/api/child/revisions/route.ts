import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { listChildVisibleRevisionCards } from "@/lib/api/revisions";

export async function GET(): Promise<NextResponse> {
  const context = await getCurrentProfile();
  if (context.role !== "child" || !context.profile?.id) {
    return NextResponse.json([], { status: 401 });
  }

  const cards = await listChildVisibleRevisionCards(context.profile.id);
  return NextResponse.json(cards);
}
