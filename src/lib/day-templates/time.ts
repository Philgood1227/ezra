const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

export function normalizeTimeLabel(value: string): string {
  const match = value.match(TIME_PATTERN);
  if (!match) {
    return value;
  }

  const hours = (match[1] ?? "0").padStart(2, "0");
  const minutes = match[2] ?? "00";
  return `${hours}:${minutes}`;
}

export function timeToMinutes(value: string): number {
  const normalized = normalizeTimeLabel(value);
  const [hoursString, minutesString] = normalized.split(":");
  const hours = Number(hoursString);
  const minutes = Number(minutesString);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

export function minutesToTimeLabel(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getCurrentMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}
