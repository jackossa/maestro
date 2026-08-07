import { useState } from "react";
import { useAppState } from "../../shared/state/store";
import { computeFeeCalc } from "../../shared/lib/feeCalc";
import { computeSchedule } from "../../shared/lib/schedule";
import { getPhaseGates } from "../../shared/lib/phases";
import { money, moneyX, fmtIsoD, fmtIsoDCompact, pct } from "../../shared/lib/formatters";
import { SERVICE_DESCRIPTIONS } from "../../shared/lib/serviceDescriptions";
import { PHASES } from "../../shared/lib/constants";

const fmtDShort = (dt: Date) => dt.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });

// Ported from Component.renderVals() "Fee Proposal Summary" section (Ossa Fee
// Proposal App.dc.html lines 2181-2261) plus the Coordination and Liability
// fee, the print-document computed fields (~2846-2887), and onCreatePdf.
export function useProposalBuilder() {
  const { currentProject, upd } = useAppState();
  // currentProject is typed as possibly undefined because it genuinely can be
  // (zero-projects state), but this hook only mounts inside ProposalBuilderTab,
  // which App.tsx's Shell gates on hasProject -- see src/app/App.tsx.
  const { data } = currentProject!;
  const { info, settings: S, proposal } = data;
  const fc = computeFeeCalc(data);
  const { activePhases } = getPhaseGates(info);
  const sched = computeSchedule(data);
  const { schedPhases } = getPhaseGates(info);
  const scheduleOnlyKeys = new Set(PHASES.filter((p) => p.scheduleOnly).map((p) => p.k));

  const [descOpen, setDescOpen] = useState<Record<string, boolean>>({});
  const toggleDesc = (key: string) => setDescOpen((s) => ({ ...s, [key]: !s[key] }));
  const descOverrides = proposal.serviceDescOverrides || {};

  const onDescChange = (key: string, body: string) =>
    upd((d) => {
      if (!d.proposal.serviceDescOverrides) d.proposal.serviceDescOverrides = {};
      d.proposal.serviceDescOverrides[key] = body;
    });

  // ---- Design Fee (Section D phases + on-screen list) ----
  const sumPhaseRows = activePhases.map((p) => {
    const descKey = p.k === "bid" ? "bidding" : p.k;
    const desc = SERVICE_DESCRIPTIONS[descKey];
    return {
      key: p.k,
      label: p.label,
      fee: money(fc.phaseArchFee[p.k] || 0),
      pct: fc.subArch > 0 ? pct((fc.phaseArchFee[p.k] || 0) / fc.subArch) : "—",
      hasDesc: !!desc,
      descBody: desc ? (descOverrides[descKey] ?? desc.body) : "",
      descOpen: !!descOpen[p.k],
      onToggleDesc: () => toggleDesc(p.k),
      onDescChange: (v: string) => onDescChange(descKey, v),
      toggleGlyph: descOpen[p.k] ? "▾" : "▸",
    };
  });

  // ---- Other Services (checked, non-bidding) ----
  const { sfT, ccT } = fc;
  const otherServiceRows = S.otherServices
    .filter((s) => s.id !== "bidding")
    .filter((s) =>
      s.id === "testfit"
        ? info.services.testfit === true
        : s.id === "projectManual"
          ? info.projectManual === "Yes"
          : s.id === "vr"
            ? info.services.vr === true
            : s.id === "ec"
              ? info.services.ec === true
              : !!(info.otherServicesChecked || {})[s.id],
    )
    .map((s) => {
      const desc = SERVICE_DESCRIPTIONS[s.id];
      const fee = s.perSF ? (+s.perSF || 0) * sfT : s.pctCC ? Math.max(+s.minPrice! || 0, (+s.pctCC! || 0) * ccT) : s.price;
      return {
        key: s.id,
        label: s.name,
        fee: money(fee),
        hasDesc: !!desc,
        descBody: desc ? (descOverrides[s.id] ?? desc.body) : "",
        descOpen: !!descOpen[s.id],
        onToggleDesc: () => toggleDesc(s.id),
        onDescChange: (v: string) => onDescChange(s.id, v),
        toggleGlyph: descOpen[s.id] ? "−" : "+",
      };
    });
  const hasOtherServices = otherServiceRows.length > 0;

  // ---- Section B service description list (checked services with a description) ----
  const SVC_DEFS = [
    { key: "sd", label: "Schematic Design" },
    { key: "dd", label: "Design Development" },
    { key: "cd", label: "Construction Documents" },
    { key: "ca", label: "Construction Administration" },
    { key: "hourlyCa", label: "Hourly Construction Administration" },
  ];
  const svcChecked: Record<string, boolean> = {
    ec: !!info.services.ec, testfit: !!info.services.testfit, vr: !!info.services.vr,
    sd: !!info.services.sd, dd: !!info.services.dd, cd: !!info.services.cd, ca: !!info.services.ca, hourlyCa: !!info.services.hourlyCa,
    projectManual: info.projectManual === "Yes", bidding: info.bidding === "Yes",
  };
  S.otherServices.forEach((s) => {
    if (!(s.id in svcChecked)) svcChecked[s.id] = !!(info.otherServicesChecked || {})[s.id];
  });
  const allServiceKeys = ["ec", ...SVC_DEFS.map((s) => s.key), ...S.otherServices.filter((s) => s.id !== "ec").map((s) => s.id)];
  const serviceDescRows = allServiceKeys
    .filter((k) => svcChecked[k] && SERVICE_DESCRIPTIONS[k])
    .map((k, i) => ({ num: i + 1, title: SERVICE_DESCRIPTIONS[k].title, body: descOverrides[k] ?? SERVICE_DESCRIPTIONS[k].body }));

  // ---- Engineering Consultants ----
  const consAmts = S.consultants.map((_c, i) => +data.calc.consultants[i] || 0);
  const sumConsRows = S.consultants.map((c, i) => ({ label: c.name, fee: money(consAmts[i]), pct: fc.totalFee > 0 ? pct(consAmts[i] / fc.totalFee) : "—" }));
  const consMarkupAmt = fc.consBilled - fc.consSub;
  const hasConsMarkup = S.consultants.length > 0 && consMarkupAmt > 0;
  const consMarkupLabel = "Engineering Coordination (" + pct(S.markups.cons, 0) + " markup)";
  const subEng = fc.consBilled;

  // ---- Schedule Summary ----
  const sumSchedRows = sched.schedRows.filter((r) => r.weeks > 0 && !scheduleOnlyKeys.has(r.k)).map((r) => ({ name: r.name, weeks: r.weeks + " weeks", range: fmtDShort(r.s0) + " – " + fmtDShort(r.e0) }));

  // matches schedule.ts's spanEnd calculation exactly (latest phase end date)
  const lastEnd = sched.schedRows.length ? sched.schedRows.reduce((max, r) => (r.e0 > max ? r.e0 : max), sched.schedRows[0].e0) : new Date(sched.startIso + "T00:00:00");
  const completionLongLabel = lastEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // ---- Invoicing schedule ----
  const downPct = S.downPayment;
  const downAmt = fc.totalFee * downPct;
  const monthBuckets: Record<string, number> = {};
  activePhases.forEach((p) => {
    const row = sched.schedRows.find((r) => r.k === p.k);
    const amt = (fc.phaseArchFee[p.k] || 0) * (1 - downPct) * (fc.subArch > 0 ? fc.totalFee / fc.subArch : 0);
    if (!row || amt <= 0 || !(row.e0 > row.s0)) return;
    const totalDays = (row.e0.getTime() - row.s0.getTime()) / 864e5;
    let cur = new Date(row.s0);
    while (cur < row.e0) {
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const segEnd = monthEnd < row.e0 ? monthEnd : row.e0;
      const days = (segEnd.getTime() - cur.getTime()) / 864e5;
      const key = cur.getFullYear() + "-" + cur.getMonth();
      monthBuckets[key] = (monthBuckets[key] || 0) + amt * (days / totalDays);
      cur = segEnd;
    }
  });
  const monthKeys = Object.keys(monthBuckets).sort((a, b) => {
    const [ay, am] = a.split("-").map(Number);
    const [by, bm] = b.split("-").map(Number);
    return ay - by || am - bm;
  });
  const invoiceRows = monthKeys.map((k, i) => {
    const [y, m] = k.split("-").map(Number);
    const label = "Month " + (i + 1) + " — " + new Date(y, m, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return { label, amt: money(monthBuckets[k]) };
  });
  const invoiceTotal = money(downAmt + monthKeys.reduce((a, k) => a + monthBuckets[k], 0));

  // ---- header / firm-proposal fields ----
  const sumLocation = info.address || "—";
  const clientAddressLine = info.clientAddr || "";
  const proposalNumberDisplay = info.proposalNumber || "OS-" + (info.date || "").replace(/-/g, "").slice(0, 6);
  const projectSizeDisplay = fc.sfT ? Math.round(fc.sfT).toLocaleString("en-US") + " SF" : "—";
  const constructionBudgetDisplay = info.constructionBudget ? (isNaN(+info.constructionBudget) ? info.constructionBudget : money(+info.constructionBudget)) : "—";
  const projectDescriptionDisplay = info.description || `Design services for ${info.name || "this project"} at ${sumLocation}.`;
  const hourlyRateRows = S.team.map((t) => ({ name: t.name, role: t.role, rate: moneyX(t.rate) }));

  const onCreatePdf = () => {
    const prevTitle = document.title;
    document.title = (info.name || "Project") + " Proposal";
    const style = document.createElement("style");
    style.id = "proposalPrintOverride";
    style.textContent = "@media print{ @page{ size: letter portrait; margin: 0; } .print-proposal{ display:block !important; } }";
    document.head.appendChild(style);
    const cleanup = () => {
      document.title = prevTitle;
      document.getElementById("proposalPrintOverride")?.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  return {
    sumProject: info.name || "Project Name",
    sumClient: info.client || "Client Name",
    sumLocation,
    sumDate: fmtIsoD(info.date),
    sumTotal: money(fc.totalFee),
    coordLiabilityLabel: "Coordination and Liability (15%)",
    coordLiabilityFee: money(fc.coordLiability),
    sumPhaseRows,
    subArch: money(fc.subArch),
    subArchPct: fc.totalFee > 0 ? pct(fc.subArch / fc.totalFee) : "—",
    hasOtherServices,
    otherServiceRows,
    serviceDescRows,
    sumConsRows,
    subEng: money(subEng),
    subEngPct: fc.totalFee > 0 ? pct(subEng / fc.totalFee) : "—",
    hasConsMarkup,
    consMarkupLabel,
    consMarkupFee: money(consMarkupAmt),
    summaryTitleLine2: sumConsRows.length > 0 ? "Architectural and Engineering Design Services" : "Architectural Design Services",
    sumReimb: money(fc.reimbBilled),
    sumReimbPct: fc.totalFee > 0 ? pct(fc.reimbBilled / fc.totalFee) : "—",
    sumSchedRows,
    completionLong: completionLongLabel,
    clarifications: proposal.clarifications,
    onClarifications: (v: string) => upd((d) => { d.proposal.clarifications = v; }),
    notIncluded: proposal.notIncluded,
    onNotIncluded: (v: string) => upd((d) => { d.proposal.notIncluded = v; }),
    downPctLabel: pct(downPct, 0),
    downAmt: money(downAmt),
    invoiceRows,
    invoiceTotal,
    onCreatePdf,
    // print-document-only fields
    fpProposalNumber: proposalNumberDisplay,
    fpClientCompany: info.clientCompany || "",
    fpContactPerson: info.contactPerson || info.client || "Client Name",
    fpClientEmail: info.clientEmail || "",
    fpHasClientEmail: !!info.clientEmail,
    fpClientAddressLine: clientAddressLine,
    fpHasClientAddr: !!clientAddressLine,
    fpProjectSize: projectSizeDisplay,
    fpConstructionBudget: constructionBudgetDisplay,
    fpDescription: projectDescriptionDisplay,
    hourlyRateRows,
    coverLetterFirstName: (info.client || "Client").split(" ")[0],
  };
}
