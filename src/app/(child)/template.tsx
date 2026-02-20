import { PageTransition } from "@/components/motion";

export default function ChildTemplate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return <PageTransition>{children}</PageTransition>;
}
