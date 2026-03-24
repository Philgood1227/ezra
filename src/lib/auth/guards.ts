import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";

export async function requireParent() {
  const context = await getCurrentProfile();
  if (context.role === "parent" || context.role === "viewer") {
    return context;
  }

  return {
    ...context,
    role: "parent" as const,
  };
}

export async function requireChild() {
  const context = await getCurrentProfile();
  if (context.role === "child") {
    return context;
  }

  return {
    ...context,
    role: "child" as const,
  };
}

export async function redirectIfAuthenticated() {
  const context = await getCurrentProfile();
  if (context.role === "parent" || context.role === "viewer") {
    redirect("/parent-v2/dashboard");
  }
  if (context.role === "child") {
    redirect("/child");
  }
}
