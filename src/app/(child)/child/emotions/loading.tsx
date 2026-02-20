import { ChildEmotionsView } from "@/components/child/emotions";

export default function ChildEmotionsLoading(): React.JSX.Element {
  return <ChildEmotionsView todayDate={new Date().toISOString().slice(0, 10)} todayLogs={[]} weekData={[]} isLoading />;
}
