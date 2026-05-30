export const TIME_SLOTS = [
  "12h00 - 12h30",
  "12h30 - 13h00",
  "13h00 - 13h30",
  "13h30 - 14h00",
  "19h00 - 19h30",
  "19h30 - 20h00",
  "20h00 - 20h30",
  "20h30 - 21h00",
];

export function isValidOrderDate(selected: Date, now: Date = new Date()): boolean {
  const minDate = new Date(now);
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + 1);

  const selectedDay = new Date(selected);
  selectedDay.setHours(0, 0, 0, 0);

  return selectedDay.getTime() >= minDate.getTime();
}

export function minBookingDate(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function formatHumanDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const DELIVERY_FEE = 3;
