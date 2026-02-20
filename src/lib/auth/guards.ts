import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";

export async function requireParent() {
  const context = await getCurrentProfile();
  if (context.role !== "parent" && context.role !== "viewer") {
    redirect("/auth/login");
  }
  return context;
}

export async function requireChild() {
  const context = await getCurrentProfile();
  if (context.role !== "child") {
    redirect("/auth/pin");
  }
  return context;
}

export async function redirectIfAuthenticated() {
  const context = await getCurrentProfile();
  if (context.role === "parent" || context.role === "viewer") {
    redirect("/parent/dashboard");
  }
  if (context.role === "child") {
    redirect("/child");
  }
}
