import { useAppState } from "../../shared/state/store";
import { pct, pctDisp } from "../../shared/lib/formatters";
import { PHASES } from "../../shared/lib/constants";
import { STOP_COLOR } from "../../shared/lib/severityColors";

// Ported verbatim from the "Settings rows" block of Component.renderVals()
// (Ossa Fee Proposal App.dc.html lines 2323-2381).
export function useSettings() {
  const { currentProject, upd } = useAppState();
  const S = currentProject.data.settings;

  const teamSetRows = S.team.map((t, i) => ({
    name: t.name,
    role: t.role,
    rate: t.rate,
    participation: pctDisp(t.participation),
    onName: (v: string) => upd((d) => { d.settings.team[i].name = v; }),
    onRole: (v: string) => upd((d) => { d.settings.team[i].role = v; }),
    onRate: (v: number) => upd((d) => { d.settings.team[i].rate = Math.max(0, v); }),
    onParticipation: (v: number) => upd((d) => { d.settings.team[i].participation = Math.max(0, v) / 100; }),
    onRemove: () =>
      upd((d) => {
        if (d.settings.team.length > 1) {
          d.settings.team.splice(i, 1);
          d.calc.hrs.splice(i, 1);
        }
      }),
  }));
  const onAddTeam = () =>
    upd((d) => {
      d.settings.team.push({ name: "New Member", role: "Role", rate: 100, participation: 0 });
      d.calc.hrs.push(Object.fromEntries(PHASES.map((p) => [p.k, 0])));
    });
  const participationSum = S.team.reduce((a, t) => a + (+t.participation || 0), 0);
  const participationSumWarn = Math.abs(participationSum - 1) > 0.005;
  const participationSumLabel = pct(participationSum, 0);
  const participationSumColor = participationSumWarn ? STOP_COLOR : "#918f92";

  const benchRows = S.bench.map((b, i) => ({
    type: b.type,
    cost: b.cost,
    feePct: pctDisp(b.feePct),
    feeSF: b.feeSF,
    onType: (v: string) => upd((d) => { d.settings.bench[i].type = v; }),
    onCost: (v: number) => upd((d) => { d.settings.bench[i].cost = Math.max(0, v); }),
    onFeePct: (v: number) => upd((d) => { d.settings.bench[i].feePct = Math.max(0, v) / 100; }),
    onFeeSF: (v: number) => upd((d) => { d.settings.bench[i].feeSF = Math.max(0, v); }),
    onRemove: () =>
      upd((d) => {
        if (d.settings.bench.length > 1) d.settings.bench.splice(i, 1);
      }),
  }));
  const onAddBench = () => upd((d) => { d.settings.bench.push({ type: "New Project Type", cost: 100, feePct: 0.1, feeSF: 10 }); });

  const consSetRows = S.consultants.map((c, i) => ({
    name: c.name,
    pct: pctDisp(c.typicalPct),
    onName: (v: string) => upd((d) => { d.settings.consultants[i].name = v; }),
    onPct: (v: number) => upd((d) => { d.settings.consultants[i].typicalPct = Math.max(0, v) / 100; }),
    onRemove: () =>
      upd((d) => {
        if (d.settings.consultants.length > 1) {
          d.settings.consultants.splice(i, 1);
          d.calc.consultants.splice(i, 1);
        }
      }),
  }));
  const onAddConsultant = () =>
    upd((d) => {
      d.settings.consultants.push({ name: "New Consultant", typicalPct: 0 });
      d.calc.consultants.push(0);
    });

  const otherServiceSetRows = S.otherServices.map((s, i) => ({
    name: s.name,
    price: s.price,
    isPerSF: !!s.perSF,
    isPctCC: !!s.pctCC,
    isFlat: !s.perSF && !s.pctCC,
    perSF: s.perSF || 0,
    pctCC: s.pctCC ? Math.round(s.pctCC * 10000) / 100 : 0,
    minPrice: s.minPrice || 0,
    onName: (v: string) => upd((d) => { d.settings.otherServices[i].name = v; }),
    onPrice: (v: number) => upd((d) => { d.settings.otherServices[i].price = Math.max(0, v); }),
    onPerSF: (v: number) => upd((d) => { d.settings.otherServices[i].perSF = Math.max(0, v); }),
    onPctCC: (v: number) => upd((d) => { d.settings.otherServices[i].pctCC = Math.max(0, v) / 100; }),
    onMinPrice: (v: number) => upd((d) => { d.settings.otherServices[i].minPrice = Math.max(0, v); }),
    onRemove: () =>
      upd((d) => {
        if (d.settings.otherServices.length > 1) d.settings.otherServices.splice(i, 1);
      }),
  }));
  const onAddOtherService = () =>
    upd((d) => {
      d.settings.otherServices.push({ id: "svc" + Date.now(), name: "New Service", price: 0 });
    });

  const leadSourceSetRows = S.leadSources.map((s, i) => ({
    name: s,
    onName: (v: string) => upd((d) => { d.settings.leadSources[i] = v; }),
    onRemove: () =>
      upd((d) => {
        if (d.settings.leadSources.length > 1) d.settings.leadSources.splice(i, 1);
      }),
  }));
  const onAddLeadSource = () => upd((d) => { d.settings.leadSources.push("New Source"); });

  const feeablePhases = PHASES.filter((p) => !p.scheduleOnly);
  const phaseSetRows = feeablePhases.map((p) => ({
    key: p.k,
    label: p.label,
    priv: pctDisp(S.phase[p.k].private),
    pub: pctDisp(S.phase[p.k].public),
    onPriv: (v: number) => upd((d) => { d.settings.phase[p.k].private = Math.max(0, v) / 100; }),
    onPub: (v: number) => upd((d) => { d.settings.phase[p.k].public = Math.max(0, v) / 100; }),
  }));
  const phPrivSum = feeablePhases.reduce((a, p) => a + S.phase[p.k].private, 0);
  const phPubSum = feeablePhases.reduce((a, p) => a + S.phase[p.k].public, 0);
  const phPrivLabel = pct(phPrivSum, 0);
  const phPubLabel = pct(phPubSum, 0);
  const phPrivColor = Math.abs(phPrivSum - 1) > 0.005 ? STOP_COLOR : "#1d1d1e";
  const phPubColor = Math.abs(phPubSum - 1) > 0.005 ? STOP_COLOR : "#1d1d1e";

  return {
    setProfit: pctDisp(S.profit),
    onSetProfit: (v: number) => upd((d) => { d.settings.profit = Math.max(0, v) / 100; }),
    teamSetRows,
    onAddTeam,
    participationSumWarn,
    participationSumLabel,
    participationSumColor,
    benchRows,
    onAddBench,
    setAdderSpecs: pctDisp(S.adders.specs),
    onSetAdderSpecs: (v: number) => upd((d) => { d.settings.adders.specs = Math.max(0, v) / 100; }),
    setAdderPublic: pctDisp(S.adders.public),
    onSetAdderPublic: (v: number) => upd((d) => { d.settings.adders.public = Math.max(0, v) / 100; }),
    setMkCons: pctDisp(S.markups.cons),
    onSetMkCons: (v: number) => upd((d) => { d.settings.markups.cons = Math.max(0, v) / 100; }),
    setMkReimb: pctDisp(S.markups.reimb),
    onSetMkReimb: (v: number) => upd((d) => { d.settings.markups.reimb = Math.max(0, v) / 100; }),
    consSetRows,
    onAddConsultant,
    otherServiceSetRows,
    onAddOtherService,
    setDownPct: pctDisp(S.downPayment),
    onSetDownPct: (v: number) => upd((d) => { d.settings.downPayment = Math.max(0, v) / 100; }),
    leadSourceSetRows,
    onAddLeadSource,
    phaseSetRows,
    phPrivLabel,
    phPubLabel,
    phPrivColor,
    phPubColor,
  };
}
