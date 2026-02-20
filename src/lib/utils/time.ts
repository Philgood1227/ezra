function withCapitalizedFirstLetter(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatHeure(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getNomJour(date: Date): string {
  const dayName = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(date);
  return withCapitalizedFirstLetter(dayName);
}

export function getNomMois(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(date);
}

export function getNomsMois(): string[] {
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const date = new Date(2026, monthIndex, 1);
    return getNomMois(date);
  });
}
