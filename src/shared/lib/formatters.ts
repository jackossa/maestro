// Ported verbatim from the formatter closures at the top of Component.renderVals()
// (Ossa Fee Proposal App.dc.html lines 1973-1981).

export type Rounding = "Exact" | "Nearest $100" | "Nearest $1,000";

export const num = (v: number): string => Math.round(v || 0).toLocaleString("en-US");

export function roundFee(v: number, rounding: Rounding = "Exact"): number {
  if (rounding === "Nearest $1,000") return Math.round(v / 1000) * 1000;
  if (rounding === "Nearest $100") return Math.round(v / 100) * 100;
  return Math.round(v);
}

export function money(v: number, rounding: Rounding = "Exact"): string {
  return "$" + roundFee(v || 0, rounding).toLocaleString("en-US");
}

export const moneyX = (v: number): string => "$" + Math.round(v || 0).toLocaleString("en-US");

export const moneySF = (v: number): string =>
  "$" + (Math.round((v || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtIsoD(s: string): string {
  try {
    return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

export function fmtIsoDCompact(s: string): string {
  if (!s) return "—";
  try {
    const d = new Date(s + "T00:00:00");
    if (isNaN(d.getTime())) return "—";
    return d.getMonth() + 1 + "/" + d.getDate() + "/" + String(d.getFullYear()).slice(-2);
  } catch {
    return "—";
  }
}

export function pct(v: number | null | undefined, dec = 1): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return (v * 100).toFixed(dec) + "%";
}

export const pctDisp = (v: number): number => Math.round((+v || 0) * 10000) / 100;
