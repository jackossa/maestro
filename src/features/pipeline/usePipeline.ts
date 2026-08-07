import { useState, type DragEvent } from "react";
import { useAppState } from "../../shared/state/store";
import { computeFeeCalc } from "../../shared/lib/feeCalc";
import { computeAreaCalc } from "../../shared/lib/areaCalc";
import { money, moneySF, pct, fmtIsoDCompact } from "../../shared/lib/formatters";
import { oppEffectiveYear, oppFmtMoney, oppInvoicedInYear, oppParseMoney } from "../../shared/lib/oppHelpers";
import { oppStatusColor } from "../../shared/lib/statusColor";
import type { PipelineData, Store } from "../../shared/state/types";

// Ported from Component.renderVals() "Portfolio Insights" and "Business
// Development / Opportunity Tracker" sections, reworked per the Pipeline
// Unification design spec: reads directly from the unified project list
// (store.order / store.projects[id].data.pipeline) instead of a separate
// opp.projects array. Ephemeral UI state (filters, sort, active inline-edit
// field, list/board toggle) stays local component state, same as before.

const OPP_STATUSES = ["New Lead", "Write Proposal", "Pending Approval", "Won / In Process", "Completed", "Lost", "Cancelled"];

interface PipelineRow extends PipelineData {
  id: string;
  name: string;
}

// Pipeline can edit a row that isn't the "current" project, so client/project
// name edits go through updStore directly by id rather than the currentId-
// scoped upd(). Plain top-level functions, not hook calls -- useAppState()
// must only ever be called once per component/hook, at the top of the body.
function updClientById(updStore: (fn: (s: Store) => void) => void, id: string, v: string) {
  updStore((s) => { s.projects[id].data.info.client = v; });
}
function updProjectNameById(updStore: (fn: (s: Store) => void) => void, id: string, v: string) {
  updStore((s) => { s.projects[id].data.info.name = v; });
}

export function usePipeline() {
  const {
    state,
    updStore,
    openProject,
    addProject,
    duplicateProject,
    removeProject,
    updateProjectPipeline,
    addProjectSplit,
    removeProjectSplit,
    updateProjectSplit,
    setPendingTarget,
    setPipelineYear,
  } = useAppState();
  const { store } = state;

  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState(1);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [splitOpenId, setSplitOpenId] = useState<string | null>(null);

  const allRows: PipelineRow[] = store.order.map((id) => ({
    id,
    name: store.projects[id].data.info.client,
    ...store.projects[id].data.pipeline,
  }));

  // ---- Portfolio Insights (fee-health across every project) ----
  const portfolioRows = store.order.map((id) => {
    const pd = store.projects[id].data;
    const { sfT, ccT } = computeAreaCalc(pd.info, pd.settings);
    const fc = computeFeeCalc(pd);
    let goWT = 0,
      goET = 0;
    pd.info.go.forEach((g) => {
      goWT += +g.weight;
      goET += +g.score * +g.weight;
    });
    const goPct = goWT > 0 ? goET / (3 * goWT) : 0;
    const verdict = goWT === 0 ? null : goPct >= 0.75 ? "GO" : goPct >= 0.6 ? "CAUTION" : "NO-GO";
    const statusKey = fc.floorV > fc.totalFee ? "red" : fc.totalFee < fc.laborTotal + fc.consBilled + fc.reimbBilled ? "yellow" : "green";
    return { id, totalFee: fc.totalFee, ccT, sfT, verdict, statusKey, consSub: fc.consSub, consActualPct: fc.totalFee > 0 ? fc.consSub / fc.totalFee : null, useTypes: pd.info.areas.map((a) => a.useType).filter(Boolean) };
  });
  const withFee = portfolioRows.filter((r) => r.totalFee > 0);
  const pfCount = store.order.length;
  const pfPipeline = portfolioRows.reduce((a, r) => a + r.totalFee, 0);
  const pfAvgFee = withFee.length ? pfPipeline / withFee.length : 0;
  const ccRows = withFee.filter((r) => r.ccT > 0);
  const pfAvgPctCC = ccRows.length ? ccRows.reduce((a, r) => a + r.totalFee / r.ccT, 0) / ccRows.length : null;
  const sfRows = withFee.filter((r) => r.sfT > 0);
  const pfAvgFeeSF = sfRows.length ? sfRows.reduce((a, r) => a + r.totalFee / r.sfT, 0) / sfRows.length : null;
  const verdictCounts: Record<string, number> = { GO: 0, CAUTION: 0, "NO-GO": 0 };
  portfolioRows.forEach((r) => {
    if (r.verdict && verdictCounts[r.verdict] !== undefined) verdictCounts[r.verdict]++;
  });
  const scoredCount = verdictCounts.GO + verdictCounts.CAUTION + verdictCounts["NO-GO"];
  const winRate = scoredCount > 0 ? (verdictCounts.GO + verdictCounts.CAUTION) / scoredCount : null;
  const statusCounts = { green: 0, yellow: 0, red: 0 };
  withFee.forEach((r) => (statusCounts as Record<string, number>)[r.statusKey]++);
  const avgConsActual = withFee.length ? withFee.reduce((a, r) => a + (r.consActualPct || 0), 0) / withFee.length : null;
  const avgConsTyp = store.order.length
    ? store.order.reduce((a, id) => a + store.projects[id].data.settings.consultants.reduce((aa, c) => aa + (+c.typicalPct || 0), 0), 0) / store.order.length
    : null;
  const useTypeFreq: Record<string, number> = {};
  portfolioRows.forEach((r) => r.useTypes.forEach((u) => (useTypeFreq[u] = (useTypeFreq[u] || 0) + 1)));
  const topUseType = Object.keys(useTypeFreq).sort((a, b) => useTypeFreq[b] - useTypeFreq[a])[0];

  const advice: string[] = [];
  if (pfCount < 2) advice.push("Save a few more projects — trend advice sharpens once there is a track record to compare against.");
  if (statusCounts.red > 0) advice.push(statusCounts.red + " saved project" + (statusCounts.red > 1 ? "s are" : " is") + " priced below break-even floor — revisit fees before sending.");
  if (winRate !== null && winRate < 0.5) advice.push("Only " + Math.round(winRate * 100) + "% of scored projects came back GO/CAUTION — tighten qualification before proposals go out.");
  if (avgConsActual !== null && avgConsTyp !== null && avgConsTyp > 0 && avgConsActual < avgConsTyp - 0.03) {
    advice.push("Consultant costs average " + pct(avgConsActual, 0) + " of fee vs a " + pct(avgConsTyp, 0) + " typical benchmark across your projects — check engineering scope isn’t being under-billed.");
  }
  if (topUseType) advice.push('"' + topUseType + '" is your most common project area — consider tightening its benchmark based on actual outcomes.');
  if (pfAvgPctCC !== null) advice.push("Average realized fee is " + pct(pfAvgPctCC, 1) + " of construction cost across priced projects.");
  if (!advice.length) advice.push("No saved data yet — fill out projects to build a track record.");

  const outcomeCounts: Record<string, number> = { "New Lead": 0, "Write Proposal": 0, "Pending Approval": 0, "Won / In Process": 0, Completed: 0, Lost: 0, Cancelled: 0 };
  allRows.forEach((r) => (outcomeCounts[r.status] = (outcomeCounts[r.status] || 0) + 1));
  const outcomeOpen = outcomeCounts["New Lead"] + outcomeCounts["Write Proposal"] + outcomeCounts["Pending Approval"];

  // ---- Opportunity Tracker (the unified project list, CRM view) ----
  const oppYear = store.pipelineSettings.year;
  const oppYearsSet = new Set(allRows.map((p) => oppEffectiveYear(p)));
  oppYearsSet.add(String(new Date().getFullYear()));
  oppYearsSet.add(oppYear);
  const oppYearOptions = [...oppYearsSet].sort((a, b) => b.localeCompare(a));
  const oppAllYear = allRows.filter((p) => oppEffectiveYear(p) === oppYear);

  const oppSumWhere = (pred: (p: PipelineRow) => boolean, field: "potentialFee") => oppAllYear.filter(pred).reduce((a, p) => a + (Number(p[field]) || 0), 0);
  const oppComputedExpected = (p: PipelineRow) => ((Number(p.potentialFee) || 0) * (Number(p.chances) || 0)) / 100;
  const oppTotalPotential = oppSumWhere((p) => p.status !== "Lost" && p.status !== "Cancelled", "potentialFee");
  const oppTotalSecured = oppSumWhere((p) => p.status === "Won / In Process" || p.status === "Completed", "potentialFee");
  const oppTotalCompleted = oppSumWhere((p) => p.status === "Completed", "potentialFee");
  const oppTotalInvoiced = allRows.reduce((a, p) => a + oppInvoicedInYear(p, oppYear), 0);
  const oppWeightedPipeline = oppAllYear.filter((p) => ["New Lead", "Write Proposal", "Pending Approval"].includes(p.status)).reduce((a, p) => a + oppComputedExpected(p), 0);
  const oppPendingTotal = oppSumWhere((p) => p.status === "Pending Approval", "potentialFee");
  const oppTarget = store.pipelineSettings.pendingTarget || 500000;
  const oppProgressPct = Math.min(100, oppTarget ? (oppPendingTotal / oppTarget) * 100 : 0);

  const oppKpis = [
    { label: "Total Potential", value: oppFmtMoney(oppTotalPotential), sub: "Active + completed fees", color: "#1d1d1e" },
    { label: "Total Secured", value: oppFmtMoney(oppTotalSecured), sub: "Signed, in process", color: "#1C80C4" },
    { label: "Total Completed", value: oppFmtMoney(oppTotalCompleted), sub: oppFmtMoney(oppTotalInvoiced) + " invoiced to date", color: "#57575a" },
    { label: "Weighted Pipeline", value: oppFmtMoney(oppWeightedPipeline), sub: "Expected value, open opportunities", color: "#EB5B28" },
  ];

  const oppTotalsByStatus: Record<string, number> = {};
  let oppGrand = 0;
  OPP_STATUSES.forEach((s) => (oppTotalsByStatus[s] = 0));
  oppAllYear.forEach((p) => {
    oppTotalsByStatus[p.status] = (oppTotalsByStatus[p.status] || 0) + (Number(p.potentialFee) || 0);
    oppGrand += Number(p.potentialFee) || 0;
  });
  const oppStatusBar = OPP_STATUSES.filter((s) => oppTotalsByStatus[s] > 0).map((s) => ({
    title: s + ": " + oppFmtMoney(oppTotalsByStatus[s]),
    widthPct: oppGrand ? (oppTotalsByStatus[s] / oppGrand) * 100 : 0,
    color: oppStatusColor(s),
  }));
  const oppStatusLegend = OPP_STATUSES.filter((s) => oppTotalsByStatus[s] > 0).map((s) => ({ label: s, value: oppFmtMoney(oppTotalsByStatus[s]), color: oppStatusColor(s) }));

  const oppCounts: Record<string, number> = { All: oppAllYear.length };
  OPP_STATUSES.forEach((s) => (oppCounts[s] = oppAllYear.filter((p) => p.status === s).length));
  const oppFilterOptions = ["All", ...OPP_STATUSES.filter((s) => oppCounts[s] > 0)];
  const oppStatusFilters = oppFilterOptions.map((f) => ({ label: `${f} (${oppCounts[f]})`, active: f === statusFilter, onClick: () => setStatusFilter(f) }));

  const oppColDefs: { key: string; label: string; num?: boolean; w: string }[] = [
    { key: "projectNumber", label: "No.", w: "5%" }, { key: "date", label: "Date", w: "7%" }, { key: "status", label: "Status", w: "13%" },
    { key: "name", label: "Client", w: "13%" }, { key: "project", label: "Project", w: "14%" },
    { key: "potentialFee", label: "Potential Fee", num: true, w: "8%" }, { key: "invoiced", label: "Invoiced", num: true, w: "7%" },
    { key: "remaining", label: "Remaining", num: true, w: "7%" }, { key: "chances", label: "Win %", num: true, w: "6%" },
    { key: "expectedValue", label: "Expected Value", num: true, w: "8%" },
  ];
  const oppColumns = oppColDefs.map((c) => ({
    key: c.key,
    label: c.label,
    num: !!c.num,
    w: c.w,
    onClick: () => (sortKey === c.key ? setSortDir((d) => d * -1) : (setSortKey(c.key), setSortDir(1))),
    sortIndicator: sortKey === c.key ? (sortDir === 1 ? "▲" : "▼") : "",
  }));

  let oppFiltered = oppAllYear.filter((p) => {
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    const projectName = store.projects[p.id].data.info.name || "";
    if (q && !(p.name.toLowerCase().includes(q) || projectName.toLowerCase().includes(q))) return false;
    return true;
  });
  if (sortKey) {
    const dir = sortDir;
    oppFiltered = [...oppFiltered].sort((a, b) => {
      const av = sortKey === "project" ? store.projects[a.id].data.info.name : (a as unknown as Record<string, unknown>)[sortKey];
      const bv = sortKey === "project" ? store.projects[b.id].data.info.name : (b as unknown as Record<string, unknown>)[sortKey];
      if (typeof av === "string") return av.localeCompare(String(bv)) * dir;
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });
  }

  const moneyDisplay = (p: PipelineRow, field: "potentialFee" | "invoiced" | "remaining") =>
    activeField === p.id + "::" + field ? String(p[field] ?? 0) : oppFmtMoney(p[field] as number);

  const oppRows = oppFiltered.map((p) => ({
    _id: p.id,
    date: p.date || "",
    dateDisplay: fmtIsoDCompact(p.date),
    status: p.status,
    client: p.name,
    project: store.projects[p.id].data.info.name,
    projectNumber: p.projectNumber || "",
    potentialFeeDisplay: moneyDisplay(p, "potentialFee"),
    invoicedDisplay: moneyDisplay(p, "invoiced"),
    remainingDisplay: moneyDisplay(p, "remaining"),
    expectedValueDisplay: oppFmtMoney(oppComputedExpected(p)),
    chances: p.chances,
    chancesDisabled: p.status === "Won / In Process" || p.status === "Completed",
    statusColor: oppStatusColor(p.status),
    onDateChange: (v: string) => updateProjectPipeline(p.id, "date", v),
    onStatusChange: (v: string) => updateProjectPipeline(p.id, "status", v),
    showLostReason: p.status === "Lost",
    lostReason: p.lostReason || "",
    onLostReasonChange: (v: string) => updateProjectPipeline(p.id, "lostReason", v),
    onClientChange: (v: string) => updClientById(updStore, p.id, v),
    onProjectChange: (v: string) => updProjectNameById(updStore, p.id, v),
    yearSplits: p.yearSplits || [],
    splitOpen: splitOpenId === p.id,
    onToggleSplit: () => setSplitOpenId(splitOpenId === p.id ? null : p.id),
    splitRows: (p.yearSplits || []).map((s, i) => ({
      year: s.year,
      onYearChange: (v: string) => updateProjectSplit(p.id, i, "year", v),
      amountDisplay: activeField === p.id + "::split" + i ? String(s.invoiced ?? 0) : oppFmtMoney(Number(s.invoiced) || 0),
      onAmountFocus: () => setActiveField(p.id + "::split" + i),
      onAmountBlur: () => setActiveField(null),
      onAmountChange: (v: string) => updateProjectSplit(p.id, i, "invoiced", oppParseMoney(v)),
      onRemove: () => removeProjectSplit(p.id, i),
    })),
    onAddSplit: () => addProjectSplit(p.id),
    onPotentialFeeFocus: () => setActiveField(p.id + "::potentialFee"),
    onInvoicedFocus: () => setActiveField(p.id + "::invoiced"),
    onRemainingFocus: () => setActiveField(p.id + "::remaining"),
    onFieldBlur: () => setActiveField(null),
    onPotentialFeeChange: (v: string) => updateProjectPipeline(p.id, "potentialFee", oppParseMoney(v)),
    onInvoicedChange: (v: string) => updateProjectPipeline(p.id, "invoiced", oppParseMoney(v)),
    onRemainingChange: (v: string) => updateProjectPipeline(p.id, "remaining", oppParseMoney(v)),
    onChancesChange: (v: number) => updateProjectPipeline(p.id, "chances", v),
    onOpenProject: () => openProject(p.id, 1),
    onDuplicate: () => duplicateProject(p.id),
    onRemove: () => removeProject(p.id),
  }));

  const onOppDragStart = (id: string) => (e: DragEvent) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onOppDragOverCol = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onOppDropCol = (status: string) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) updateProjectPipeline(id, "status", status);
  };
  const oppBoardColumns = OPP_STATUSES.map((status) => {
    const rows = oppAllYear.filter((p) => p.status === status);
    const total = rows.reduce((a, p) => a + (Number(p.potentialFee) || 0), 0);
    return {
      status,
      color: oppStatusColor(status),
      count: rows.length,
      total: oppFmtMoney(total),
      onDragOver: onOppDragOverCol,
      onDrop: onOppDropCol(status),
      cards: rows.map((p) => ({
        id: p.id,
        onDragStart: onOppDragStart(p.id),
        project: store.projects[p.id].data.info.name || "Untitled",
        client: p.name || "—",
        fee: oppFmtMoney(p.potentialFee || 0),
        chances: p.chances,
        isLost: p.status === "Lost",
        lostReason: p.lostReason || "",
        onLostReasonChange: (v: string) => updateProjectPipeline(p.id, "lostReason", v),
        onOpenProject: () => openProject(p.id, 1),
        onDuplicate: () => duplicateProject(p.id),
      })),
    };
  });

  return {
    pfCount,
    pfPipeline: money(pfPipeline),
    pfAvgFee: money(pfAvgFee),
    pfWinRate: winRate !== null ? Math.round(winRate * 100) + "%" : "—",
    pfAvgPctCC: pfAvgPctCC !== null ? pct(pfAvgPctCC, 1) : "—",
    pfAvgFeeSF: pfAvgFeeSF !== null ? moneySF(pfAvgFeeSF) + "/SF" : "—",
    adviceRows: advice,
    outcomeOpen,
    outcomeWon: outcomeCounts["Won / In Process"],
    outcomeCompleted: outcomeCounts.Completed,
    outcomeLost: outcomeCounts.Lost,
    outcomeCancelled: outcomeCounts.Cancelled,

    oppYearValue: oppYear,
    oppYearOptions,
    onOppYearChange: (v: string) => setPipelineYear(v),
    onOppAddProject: addProject,
    onOppToggleSettings: () => setSettingsOpen((v) => !v),
    oppSettingsOpen: settingsOpen,
    oppPendingTargetDisplay: activeField === "__target__" ? String(oppTarget) : oppFmtMoney(oppTarget),
    onOppTargetFocus: () => setActiveField("__target__"),
    onOppTargetBlur: () => setActiveField(null),
    onOppTargetChange: (v: string) => setPendingTarget(oppParseMoney(v)),
    oppProgressPct,
    oppProgressCaption: oppFmtMoney(oppPendingTotal) + " of " + oppFmtMoney(oppTarget) + " target",
    oppKpis,
    oppStatusBar,
    oppStatusLegend,
    oppStatusFilters,
    oppColumns,
    oppRows,
    oppNoResults: oppRows.length === 0,
    oppResultsCaption: oppRows.length + " of " + oppAllYear.length + " opportunities shown",
    oppSearch: search,
    onOppSearchChange: setSearch,
    oppViewList: view === "list",
    oppViewBoard: view === "board",
    onOppViewList: () => setView("list"),
    onOppViewBoard: () => setView("board"),
    oppBoardColumns,
  };
}
