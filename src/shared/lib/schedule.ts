import type { ProjectData } from "../state/types";
import { getPhaseGates } from "./phases";

// Ported verbatim from the "Schedule" block of Component.renderVals()
// (Ossa Fee Proposal App.dc.html lines 2140-2179).

const SCHED_COLORS: Record<string, string> = {
  ec: "#918F92", prog: "#A1AFC1", sd: "#1C80C4", dd: "#4C7E9C", cd: "#74C4CA",
  perm: "#F49633", testfit: "#F8B74B", bid: "#F8B74B", ca: "#EB5B28", hourlyCa: "#EB5B28",
  close: "#918F92", post: "#918F92",
};

const fmtD = (dt: Date) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const isoOf = (dt: Date) => dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");

export interface SchedRow {
  k: string;
  name: string;
  weeks: number;
  weeksDisp: number | "";
  days: number;
  s0: Date;
  e0: Date;
  color: string;
  overridden: boolean;
  start: string;
  end: string;
  left: string;
  width: string;
  startInput: string;
}

export function computeSchedule(data: ProjectData) {
  const { calc: wk, info } = data;
  const { schedPhases } = getPhaseGates(info);
  const startIso = data.schedule.start || "2026-08-03";
  let cursor = new Date(startIso + "T00:00:00");
  const starts = wk.starts || {};

  const raw = schedPhases.map((p) => {
    const w = +wk.weeks[p.k] || 0;
    const s0 = starts[p.k] ? new Date(starts[p.k] + "T00:00:00") : new Date(cursor);
    const e0 = new Date(s0.getTime() + w * 7 * 864e5);
    cursor = e0;
    return { k: p.k, name: p.label, weeks: w, weeksDisp: (w ? w : "") as number | "", days: w * 5, s0, e0, color: SCHED_COLORS[p.k], overridden: !!starts[p.k] };
  });

  const spanStart = raw.length ? new Date(Math.min(...raw.map((r) => r.s0.getTime()), new Date(startIso + "T00:00:00").getTime())) : cursor;
  const spanEnd = raw.length ? new Date(Math.max(...raw.map((r) => r.e0.getTime()), spanStart.getTime())) : cursor;
  const spanMsTotal = Math.max(spanEnd.getTime() - spanStart.getTime(), 7 * 864e5);

  const schedRows: SchedRow[] = raw.map((r) => ({
    ...r,
    start: fmtD(r.s0),
    end: fmtD(r.e0),
    left: (((r.s0.getTime() - spanStart.getTime()) / spanMsTotal) * 100).toFixed(2) + "%",
    width: Math.max(((r.e0.getTime() - r.s0.getTime()) / spanMsTotal) * 100, 0).toFixed(2) + "%",
    startInput: isoOf(r.s0),
  }));

  const cdRow = schedRows.find((r) => r.k === "cd");
  const caRow = schedRows.find((r) => r.k === "ca");
  const estPermitSubmission = cdRow ? cdRow.end : "—";
  const estConstructionCompletion = caRow ? caRow.end : "—";

  const monthTicks: { left: string; label: string }[] = [];
  let mTick = new Date(spanStart.getFullYear(), spanStart.getMonth() + 1, 1);
  while (mTick < spanEnd && monthTicks.length < 24) {
    monthTicks.push({
      left: (((mTick.getTime() - spanStart.getTime()) / spanMsTotal) * 100).toFixed(2) + "%",
      label: mTick.toLocaleDateString("en-US", { month: "short" }) + (mTick.getMonth() === 0 ? " " + mTick.getFullYear() : ""),
    });
    mTick = new Date(mTick.getFullYear(), mTick.getMonth() + 1, 1);
  }

  const schedTotalWeeks = schedPhases.reduce((a, p) => a + (+wk.weeks[p.k] || 0), 0);
  const schedTotalDays = schedTotalWeeks * 5;

  return { schedRows, monthTicks, estPermitSubmission, estConstructionCompletion, completion: fmtD(spanEnd), schedTotalWeeks, schedTotalDays, startIso };
}
