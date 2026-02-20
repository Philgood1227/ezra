import { notFound } from "next/navigation";
import { FocusView } from "@/components/child/focus/focus-view";
import { getTaskInstanceByIdForCurrentProfile } from "@/lib/api/task-instances";

interface ChildFocusPageProps {
  params: Promise<{
    instanceId: string;
  }>;
}

export default async function ChildFocusPage({ params }: ChildFocusPageProps): Promise<React.JSX.Element> {
  const { instanceId } = await params;
  const instance = await getTaskInstanceByIdForCurrentProfile(instanceId);

  if (!instance) {
    notFound();
  }

  return <FocusView instance={instance} />;
}
