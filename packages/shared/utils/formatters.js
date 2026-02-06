export function formatINR(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  const trimmed = raw.trim();
  if (!trimmed) return "₹0";
  if (trimmed.startsWith("₹")) return trimmed;
  if (/^rs\.?/i.test(trimmed)) return `₹${trimmed.replace(/^rs\.?/i, "").trim()}`;
  return `₹${trimmed}`;
}
