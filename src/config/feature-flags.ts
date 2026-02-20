function isTruthyFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isDayPlanV2Enabled(): boolean {
  return isTruthyFlag(process.env.DAY_PLAN_V2) || isTruthyFlag(process.env.NEXT_PUBLIC_DAY_PLAN_V2);
}
