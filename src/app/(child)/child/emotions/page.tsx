import { ChildEmotionsView } from "@/components/child/emotions";
import { getChildEmotionPageData, getEmotionLogsForChild } from "@/lib/api/emotions";
import { buildWeekDateKeys, getWeekStartKey } from "@/lib/domain/dashboard";
import type { EmotionValue } from "@/lib/day-templates/types";

export default async function ChildEmotionsPage(): Promise<React.JSX.Element> {
  const data = await getChildEmotionPageData();
  const weekStart = getWeekStartKey(new Date());
  const weekDateKeys = buildWeekDateKeys(weekStart);
  const weekEnd = weekDateKeys[weekDateKeys.length - 1] ?? weekStart;
  const logs = data.child
    ? await getEmotionLogsForChild(data.child.id, { fromDate: weekStart, toDate: weekEnd })
    : [];

  const weekData = weekDateKeys.map((date) => {
    const morning = logs.find((log) => log.date === date && log.moment === "matin")?.emotion;
    const evening = logs.find((log) => log.date === date && log.moment === "soir")?.emotion;
    return {
      date,
      ...(morning ? { matin: morning as EmotionValue } : {}),
      ...(evening ? { soir: evening as EmotionValue } : {}),
    };
  });

  return <ChildEmotionsView todayDate={data.todayDate} todayLogs={data.todayLogs} weekData={weekData} />;
}
