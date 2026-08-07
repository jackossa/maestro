import type { PipelineData } from "../state/types";

// Ported verbatim from Component's opp-helper methods
// (Ossa Fee Proposal App.dc.html lines 1514-1545).

export function oppNearestWinPct(v: number): number {
  const allowed = [25, 50, 75, 90, 100];
  v = Number(v) || 0;
  return allowed.reduce((best, cur) => (Math.abs(cur - v) < Math.abs(best - v) ? cur : best), allowed[0]);
}

export function oppEffectiveYear(p: PipelineData): string {
  return p.date && p.date.length >= 4 ? p.date.slice(0, 4) : p.fallbackYear;
}

export function oppInvoicedInYear(p: PipelineData, year: string): number {
  if (Array.isArray(p.yearSplits) && p.yearSplits.length) {
    return p.yearSplits.filter((s) => s.year === year).reduce((a, s) => a + (Number(s.invoiced) || 0), 0);
  }
  return oppEffectiveYear(p) === year ? Number(p.invoiced) || 0 : 0;
}

export function oppFmtMoney(n: number): string {
  n = Number(n) || 0;
  if (n === 0) return "$0";
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function oppParseMoney(str: string): number {
  const n = parseFloat(String(str).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}
