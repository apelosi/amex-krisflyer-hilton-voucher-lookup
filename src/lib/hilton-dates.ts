/** Calendar-local YYYY-MM-DD helpers (avoid UTC shift from toISOString). */

export function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) throw new Error(`Invalid date: ${ymd}`);
  return new Date(y, m - 1, d);
}

export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const dt = parseYmdLocal(ymd);
  dt.setDate(dt.getDate() + days);
  return formatYmdLocal(dt);
}
