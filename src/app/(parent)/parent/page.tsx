import { redirect } from "next/navigation";

export default function ParentIndexPage(): never {
  redirect("/parent/dashboard");
}
