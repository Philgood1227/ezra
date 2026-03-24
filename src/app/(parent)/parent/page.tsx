import { redirect } from "next/navigation";

export default function ParentIndexPage(): never {
  redirect("/parent-v2/dashboard");
}
