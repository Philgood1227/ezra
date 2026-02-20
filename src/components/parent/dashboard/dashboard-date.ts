function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function formatDayShort(dateKey: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short" })
    .format(parseDateKey(dateKey))
    .replace(".", "");
}

export function formatDateShort(dateKey: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(parseDateKey(dateKey));
}

