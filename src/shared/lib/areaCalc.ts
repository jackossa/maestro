import type { Area, ProjectInfo, Settings } from "../state/types";

// Ported verbatim from the "Fee Calculation: Market Price" block of
// Component.renderVals() (Ossa Fee Proposal App.dc.html lines 1983-2010).

export interface CalcRow {
  area: string;
  use: string;
  sf: number;
  cc: number;
  suggPct: number;
  selPct: number;
  m1: number;
  selSF: number;
  m2: number;
  index: number;
}

export interface AreaCalcResult {
  sfT: number;
  ccT: number;
  m1T: number;
  m2T: number;
  calcRows: CalcRow[];
}

export function computeAreaCalc(info: ProjectInfo, settings: Settings): AreaCalcResult {
  const adder = (info.projectManual === "Yes" ? settings.adders.specs : 0) + (info.publicSector === "Yes" ? settings.adders.public : 0);
  const benchBy: Record<string, Settings["bench"][number]> = {};
  settings.bench.forEach((b) => (benchBy[b.type] = b));

  let sfT = 0,
    ccT = 0,
    m1T = 0,
    m2T = 0;
  const calcRows: CalcRow[] = [];

  info.areas.forEach((a: Area, i: number) => {
    const b = benchBy[a.useType];
    const sf = +a.sf || 0;
    if (!b) return;
    const cc = sf * (+b.cost || 0);
    sfT += sf;
    ccT += cc;
    const suggPct = (+b.feePct || 0) * (1 + adder);
    const suggSF = (+b.feeSF || 0) * (1 + adder);
    const selPct = a.selPct === null || a.selPct === undefined ? suggPct * 100 : a.selPct;
    const selSF = a.selSF === null || a.selSF === undefined ? suggSF : a.selSF;
    const m1 = cc * (selPct / 100);
    const m2 = sf * selSF;
    m1T += m1;
    m2T += m2;
    calcRows.push({ area: a.area || "Area " + (i + 1), use: a.useType, sf, cc, suggPct, selPct, m1, selSF, m2, index: i });
  });

  return { sfT, ccT, m1T, m2T, calcRows };
}
