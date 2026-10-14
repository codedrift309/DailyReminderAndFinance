export const CURRENCY = "INR";
export function money(v) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(v ?? 0);
}
export function today() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const part = (type) => parts.find(x => x.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function startOfMonth() {
  return `${today().slice(0, 7)}-01`;
}
export function isoDate(d) {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0,10);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function displayDate(d) {
  const s = isoDate(d);
  if (!s) return "";
  const [y,m,day] = s.split("-");
  return `${day}-${m}-${y}`;
}

export function formatKolkataDateTime(value) {
  if (!value) return "";
  const text = String(value);
  if (text.startsWith("9999-")) return "Completed/Disabled";
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(text);
  const date = new Date(hasZone ? text : `${text}+05:30`);
  if (Number.isNaN(date.getTime())) return text;
  return `${new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short"
  }).format(date)} IST`;
}
