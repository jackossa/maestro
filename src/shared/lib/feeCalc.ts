import type { CalcData, ProjectData, Settings } from "../state/types";
import { PHASES } from "./constants";
import { getPhaseGates } from "./phases";
import { computeAreaCalc } from "./areaCalc";
import { money, moneyX, moneySF, num, pct } from "./formatters";
import { STOP_COLOR, POSITIVE_COLOR, CAUTION_COLOR } from "./severityColors";

// Ported verbatim from Component.renderVals() "Hourly Workplan" and
// "Engineering & Expenses" / "Verdict" sections (Ossa Fee Proposal App.dc.html
// lines 2012-2126), plus the Coordination and Liability fee added later
// (lines 2096-2103). This is the core money-math of the whole app --
// shared by the Fee Calculation tab, Proposal Builder, and Pipeline.

export interface FeeCalcResult {
  activePhases: typeof PHASES;
  sfT: number;
  ccT: number;
  m1T: number;
  m2T: number;
  laborTotal: number;
  hoursTotal: number;
  phaseHourTot: Record<string, number>;
  consSub: number;
  reimbV: number;
  otherServicesFee: number;
  floorV: number;
  archFee: number;
  consBilled: number;
  reimbBilled: number;
  coordLiability: number;
  totalFee: number;
  status: { t: string; c: string };
  phaseArchFee: Record<string, number>;
  subArch: number;
}

export function computeFeeCalc(data: ProjectData): FeeCalcResult {
  const { info, calc: wk, settings: S } = data;
  const { isPublic, activePhases } = getPhaseGates(info);
  const svc = info.services;

  const { sfT, ccT, m1T, m2T } = computeAreaCalc(info, S);

  const rates = S.team.map((t) => +t.rate || 0);
  let laborTotal = 0;
  let hoursTotal = 0;
  const phaseHourTot: Record<string, number> = {};
  PHASES.forEach((p) => (phaseHourTot[p.k] = 0));
  S.team.forEach((_t, i) => {
    const h = wk.hrs[i] || {};
    let tot = 0;
    PHASES.forEach((p) => {
      const v = (+wk.weeks[p.k] || 0) * (+h[p.k] || 0);
      tot += v;
      phaseHourTot[p.k] += v;
    });
    laborTotal += tot * rates[i];
    hoursTotal += tot;
  });

  const consAmts = S.consultants.map((_c, i) => +wk.consultants[i] || 0);
  const consSub = consAmts.reduce((a, b) => a + b, 0);
  const reimbV = +wk.reimb || 0;

  const otherServicesFee = S.otherServices
    .filter((s) => s.id !== "bidding")
    .filter((s) =>
      s.id === "testfit"
        ? svc.testfit === true
        : s.id === "projectManual"
          ? info.projectManual === "Yes"
          : s.id === "vr"
            ? svc.vr === true
            : s.id === "ec"
              ? svc.ec === true
              : !!(info.otherServicesChecked || {})[s.id],
    )
    .reduce((a, s) => a + (s.perSF ? (+s.perSF || 0) * sfT : s.pctCC ? Math.max(+s.minPrice! || 0, (+s.pctCC! || 0) * ccT) : +s.price || 0), 0);

  const floorV = laborTotal * (1 - S.profit) + consSub + reimbV;
  const archFee =
    wk.feeSelect === "Custom" ? +wk.customFee || 0 : wk.feeSelect === "Method 1 - % of Construction" ? m1T : wk.feeSelect === "Method 2 - $/SF" ? m2T : laborTotal;
  const consBilled = consSub * (1 + S.markups.cons);
  const reimbBilled = reimbV * (1 + S.markups.reimb);
  // Coordination and Liability: 15% of the Engineering subtotal (= consBilled), folded into the
  // core Total Project Fee so Fee Calculation's total/verdict, Proposal Builder, and Pipeline
  // all stay consistent with what's actually being billed.
  const coordLiability = consBilled * 0.15;
  const totalFee = archFee + consBilled + reimbBilled + otherServicesFee + coordLiability;

  // Same canonical POSITIVE/CAUTION/STOP palette as the Go/No-Go verdict -- design review COLOR-01
  const status =
    floorV > totalFee
      ? { t: "RED — Total fee is below your break-even floor", c: STOP_COLOR }
      : totalFee < laborTotal + consBilled + reimbBilled
        ? { t: "YELLOW — Architecture below workplan labor: thinner margin", c: CAUTION_COLOR }
        : { t: "GREEN — Total fee covers the workplan with target profit", c: POSITIVE_COLOR };

  const biddingFlatPrice = (S.otherServices.find((s) => s.id === "bidding") || { price: 0 }).price;
  const phaseArchFee: Record<string, number> = {};
  activePhases.forEach((p) => {
    if (p.k === "bid") {
      phaseArchFee.bid = isPublic ? archFee * S.phase.bid.public : +biddingFlatPrice || 0;
    } else {
      phaseArchFee[p.k] = archFee * (isPublic ? S.phase[p.k].public : S.phase[p.k].private);
    }
  });
  const subArch = Object.values(phaseArchFee).reduce((a, b) => a + b, 0);

  return {
    activePhases,
    sfT,
    ccT,
    m1T,
    m2T,
    laborTotal,
    hoursTotal,
    phaseHourTot,
    consSub,
    reimbV,
    otherServicesFee,
    floorV,
    archFee,
    consBilled,
    reimbBilled,
    coordLiability,
    totalFee,
    status,
    phaseArchFee,
    subArch,
  };
}

export function formatConsRows(settings: Settings, calc: CalcData, totalFee: number, sfT: number) {
  return settings.consultants.map((c, i) => {
    const sugg = totalFee > 0 && c.typicalPct > 0 ? c.typicalPct * totalFee : null;
    const amt = +calc.consultants[i] || 0;
    return {
      label: c.name,
      typPct: c.typicalPct > 0 ? pct(c.typicalPct, 0) : "—",
      sugg: sugg ? moneyX(sugg) : "—",
      amtRaw: amt,
      pctOfFee: totalFee > 0 && amt > 0 ? pct(amt / totalFee) : "—",
      sf: sfT > 0 && amt > 0 ? moneySF(amt / sfT) : "—",
    };
  });
}

export { money, moneyX, moneySF, num, pct };
