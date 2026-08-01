import { useAppState } from "../../shared/state/store";
import { computeAreaCalc } from "../../shared/lib/areaCalc";
import { computeFeeCalc } from "../../shared/lib/feeCalc";
import { money, moneyX, moneySF, num, pct } from "../../shared/lib/formatters";
import { PHASES } from "../../shared/lib/constants";

// Business logic for Tab 2, ported from Component.renderVals() (Ossa Fee
// Proposal App.dc.html lines 1983-2126) -- Market Price table, Hourly
// Workplan (incl. per-phase fill-first-column-copies-to-all behavior, lines
// 2059-2068), Engineering & Expenses, and the Verdict panel.

export function useFeeCalculation() {
  const { currentProject, upd } = useAppState();
  const { info, calc: wk, settings: S } = currentProject.data;

  const { sfT, ccT, m1T, m2T, calcRows: rawCalcRows } = computeAreaCalc(info, S);
  const fc = computeFeeCalc(currentProject.data);

  const calcRows = rawCalcRows.map((r) => ({
    ...r,
    sfDisp: num(r.sf),
    ccDisp: moneyX(r.cc),
    suggPctDisp: pct(r.suggPct),
    m1Disp: money(r.m1),
    m2Disp: money(r.m2),
    onSelPct: (v: number) => upd((d) => { d.info.areas[r.index].selPct = Math.max(0, v); }),
    onSelSF: (v: number) => upd((d) => { d.info.areas[r.index].selSF = Math.max(0, v); }),
  }));

  const rates = S.team.map((t) => +t.rate || 0);
  const teamRows = S.team.map((t, i) => {
    const h = wk.hrs[i] || {};
    let tot = 0;
    PHASES.forEach((p) => { tot += (+wk.weeks[p.k] || 0) * (+h[p.k] || 0); });
    const fee = tot * rates[i];
    const hrsInputs = fc.activePhases.map((p, j) => ({
      key: p.k,
      val: !h[p.k] ? "" : String(h[p.k]),
      onChange: (raw: string) => {
        const v = raw === "" ? 0 : Math.max(0, parseFloat(raw) || 0);
        upd((d) => {
          d.calc.hrs[i][p.k] = v;
          // matches original: editing the first phase column copies the value to every active phase
          if (j === 0) fc.activePhases.forEach((ap) => { d.calc.hrs[i][ap.k] = v; });
        });
      },
    }));
    return { label: `${t.name}  —  ${t.role}`, rateDisp: moneyX(rates[i]), hrsInputs, totDisp: num(tot), feeDisp: money(fee) };
  });

  const phaseWeekInputs = fc.activePhases.map((p) => ({
    key: p.k,
    val: !wk.weeks[p.k] ? "" : String(wk.weeks[p.k]),
    onChange: (raw: string) => {
      const v = raw === "" ? 0 : Math.max(0, parseFloat(raw) || 0);
      upd((d) => { d.calc.weeks[p.k] = v; });
    },
  }));
  const phaseAbbrevs = fc.activePhases.map((p) => ({ key: p.k, label: p.abbr }));
  const phaseHourTotals = fc.activePhases.map((p) => ({ key: p.k, val: num(fc.phaseHourTot[p.k]) }));

  const hasSfSuggestion = m2T > 0;
  const hasPctSuggestion = m1T > 0;

  const suggestFromTotal = (totalFeeBasis: number) => {
    const out: Record<string, number>[] = S.team.map(() => ({}));
    if (totalFeeBasis > 0) {
      S.team.forEach((t, i) => {
        const rate = rates[i];
        fc.activePhases.forEach((p) => {
          const feePct = p.k === "bid" ? (info.publicSector === "Yes" ? S.phase.bid.public : 0) : info.publicSector === "Yes" ? S.phase[p.k].public : S.phase[p.k].private;
          const phaseFee = totalFeeBasis * (+feePct || 0);
          const hoursTarget = rate > 0 ? (phaseFee * (+t.participation || 0)) / rate : 0;
          const weeks = +wk.weeks[p.k] || 0;
          out[i][p.k] = weeks > 0 ? Math.round(hoursTarget / weeks) : 0;
        });
      });
    }
    return out;
  };
  const sfSuggested = suggestFromTotal(m2T);
  const pctSuggested = suggestFromTotal(m1T);

  const onFillFromSF = () =>
    upd((d) => {
      S.team.forEach((_t, i) => { fc.activePhases.forEach((p) => { if (!d.calc.hrs[i][p.k]) d.calc.hrs[i][p.k] = sfSuggested[i][p.k] || 0; }); });
    });
  const onFillFromPct = () =>
    upd((d) => {
      S.team.forEach((_t, i) => { fc.activePhases.forEach((p) => { if (!d.calc.hrs[i][p.k]) d.calc.hrs[i][p.k] = pctSuggested[i][p.k] || 0; }); });
    });
  const onResetHours = () =>
    upd((d) => {
      S.team.forEach((_t, i) => { fc.activePhases.forEach((p) => { d.calc.hrs[i][p.k] = 0; }); });
    });

  const consRows = S.consultants.map((c, i) => {
    const sugg = fc.totalFee > 0 && c.typicalPct > 0 ? c.typicalPct * fc.totalFee : null;
    const amt = +wk.consultants[i] || 0;
    return {
      label: c.name,
      typPct: c.typicalPct > 0 ? pct(c.typicalPct, 0) : "—",
      sugg: sugg ? moneyX(sugg) : "—",
      amtDisp: !amt ? "" : String(amt),
      pctDisp: fc.totalFee > 0 && amt > 0 ? pct(amt / fc.totalFee) : "—",
      sfDisp: sfT > 0 && amt > 0 ? moneySF(amt / sfT) : "—",
      onAmt: (raw: string) => {
        const v = Math.max(0, parseFloat(raw.replace(/[^0-9.]/g, "")) || 0);
        upd((d) => { d.calc.consultants[i] = v; });
      },
    };
  });
  const consTypTotal = pct(S.consultants.reduce((a, c) => a + (+c.typicalPct || 0), 0), 0);

  const hasConsMarkup = fc.consBilled > 0;
  const grossInfo = (() => {
    const mepf = S.consultants.find((c) => /MEPF/i.test(c.name));
    const struct = S.consultants.find((c) => /Structural/i.test(c.name));
    if (!mepf && !struct) return { show: false as const };
    const combinedPct = (mepf ? +mepf.typicalPct || 0 : 0) + (struct ? +struct.typicalPct || 0 : 0);
    if (combinedPct <= 0 || combinedPct >= 1 || m1T <= 0) return { show: false as const };
    const grossPctCC = ccT > 0 ? m1T / ccT / (1 - combinedPct) : null;
    const grossSF = sfT > 0 ? m2T / sfT / (1 - combinedPct) : null;
    const names = [mepf?.name, struct?.name].filter(Boolean).join(" + ");
    return {
      show: true as const,
      consLabel: names,
      pctLabel: grossPctCC !== null ? pct(grossPctCC) : "—",
      sfLabel: grossSF !== null ? moneySF(grossSF) + "/SF" : "—",
    };
  })();

  return {
    projHeader: `Project: ${info.name || "Project Name"}   |   Client: ${info.client || "Client Name"}`,
    calcRows,
    hasCalcRows: calcRows.length > 0,
    totalSF: num(sfT) + " SF",
    ccTotal: moneyX(ccT),
    m1Total: money(m1T),
    m2Total: money(m2T),
    grossInfo,
    teamRows,
    phaseWeekInputs,
    phaseAbbrevs,
    phaseHourTotals,
    phaseCount: fc.activePhases.length,
    hoursTotal: num(fc.hoursTotal),
    laborTotal: money(fc.laborTotal),
    hasSfSuggestion,
    hasPctSuggestion,
    onFillFromSF,
    onFillFromPct,
    onResetHours,
    consRows,
    consTypTotal,
    consSub: money(fc.consSub),
    consSubPct: fc.totalFee > 0 ? pct(fc.consSub / fc.totalFee) : "—",
    hasConsMarkup,
    coordLiabilityLabel: "Coordination and Liability (15%)",
    coordLiabilityFee: money(fc.coordLiability),
    reimb: wk.reimb ? String(wk.reimb) : "",
    onReimb: (raw: string) => {
      const v = Math.max(0, parseFloat(raw.replace(/[^0-9.]/g, "")) || 0);
      upd((d) => { d.calc.reimb = v; });
    },
    floorLabel: money(fc.floorV),
    feeSelect: wk.feeSelect,
    onFeeSelect: (v: string) => upd((d) => { d.calc.feeSelect = v as typeof d.calc.feeSelect; }),
    customFee: wk.customFee,
    onCustomFee: (v: number) => upd((d) => { d.calc.customFee = v; }),
    archFeeLabel: money(fc.archFee),
    consBilledLabel: money(fc.consBilled),
    reimbBilledLabel: money(fc.reimbBilled),
    totalFeeLabel: money(fc.totalFee),
    totalFeeMetaLabel: (ccT > 0 ? pct(fc.totalFee / ccT) + " of construction" : "") + (sfT > 0 ? "  |  " + moneySF(fc.totalFee / sfT) + "/SF" : ""),
    statusText: fc.status.t,
    statusColor: fc.status.c,
  };
}
