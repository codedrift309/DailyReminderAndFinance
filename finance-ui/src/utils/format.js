export const CURRENCY = "INR";
export function money(v) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(v ?? 0);
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
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