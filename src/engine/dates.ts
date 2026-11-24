/* Datumshelfer: ISO-Strings (JJJJ-MM-TT) in Ortszeit, gerechnet um 12:00, damit die Zeitumstellung nichts verschiebt. */
export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => iso(new Date());
const parse = (s: string) => new Date(`${s}T12:00:00`);

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
/** Montag = 0 … Sonntag = 6 */
export const dowIndex = (s: string) => (parse(s).getDay() + 6) % 7;
export const mondayOf = (s: string) => addDays(s, -dowIndex(s));
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

export function fmtDate(s: string): string {
  const d = parse(s);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
}
