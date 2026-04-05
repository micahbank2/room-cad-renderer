/** Returns `room-YYYYMMDD-HHmm.png` using local-time components of the given date. */
export function formatExportFilename(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = date.getFullYear().toString();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `room-${yyyy}${mm}${dd}-${hh}${mi}.png`;
}
