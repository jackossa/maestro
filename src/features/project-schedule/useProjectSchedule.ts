import { useAppState } from "../../shared/state/store";
import { computeSchedule } from "../../shared/lib/schedule";
import { fmtIsoD } from "../../shared/lib/formatters";

// Ported from Component.renderVals() (schedule fields) + the onPrintSchedule
// handler (Ossa Fee Proposal App.dc.html lines 2834-2844).
export function useProjectSchedule() {
  const { currentProject, upd } = useAppState();
  // currentProject is typed as possibly undefined because it genuinely can be
  // (zero-projects state), but this hook only mounts inside ProjectScheduleTab,
  // which App.tsx's Shell gates on hasProject -- see src/app/App.tsx.
  const { data } = currentProject!;
  const sched = computeSchedule(data);

  const onWeeksChange = (k: string, v: number) => upd((d) => { d.calc.weeks[k] = v; });
  const onStartChange = (k: string, v: string) =>
    upd((d) => {
      if (!d.calc.starts) d.calc.starts = {};
      d.calc.starts[k] = v || null as unknown as string;
    });
  const onResetStart = (k: string) =>
    upd((d) => {
      if (d.calc.starts) delete d.calc.starts[k];
    });
  const onSchedStart = (v: string) => upd((d) => { d.schedule.start = v; });

  const onPrintSchedule = () => {
    const style = document.createElement("style");
    style.id = "landscapePrintOverride";
    style.textContent = "@media print{ @page{ size: letter landscape; margin:0; } .print-schedule{ display:block !important; } }";
    document.head.appendChild(style);
    const prevTitle = document.title;
    document.title = (data.info.name || "Project") + " Schedule";
    const cleanup = () => {
      style.remove();
      document.title = prevTitle;
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  return {
    ...sched,
    schedStart: sched.startIso,
    onSchedStart,
    onWeeksChange,
    onStartChange,
    onResetStart,
    onPrintSchedule,
    sumProject: data.info.name || "Project Name",
    sumClient: data.info.client || "Client Name",
    sumDate: fmtIsoD(data.info.date),
  };
}
