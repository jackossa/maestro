import { useAppState } from "../../shared/state/store";
import { computeAreaCalc } from "../../shared/lib/areaCalc";
import { num } from "../../shared/lib/formatters";
import { oppStatusColor } from "../../shared/lib/statusColor";
import { STOP_COLOR, POSITIVE_COLOR, CAUTION_COLOR } from "../../shared/lib/severityColors";
import { GO_Q, USE_TYPES } from "../../shared/lib/constants";

// Business logic for Tab 1, ported from the relevant slices of
// Component.renderVals() (Ossa Fee Proposal App.dc.html):
// - service checkbox rows: lines 2417-2455
// - project areas: lines 1983-2010 (area totals) + area CRUD not shown inline
//   in renderVals (add/remove are plain upd() calls)
// - Go/No-Go scorecard: lines 2308-2321

export function useProjectInfo() {
  const { currentProject, upd } = useAppState();
  // currentProject is typed as possibly undefined because it genuinely can be
  // (zero-projects state), but this hook only mounts inside ProjectInfoTab,
  // which App.tsx's Shell gates on hasProject -- see src/app/App.tsx.
  const info = currentProject!.data.info;
  const settings = currentProject!.data.settings;
  const pipeline = currentProject!.data.pipeline;

  const { sfT } = computeAreaCalc(info, settings);
  const totalSF = num(sfT) + " SF";

  // ---- services ----
  const svcSet = (key: string, val: boolean) =>
    upd((d) => {
      if (!d.info.services) d.info.services = {} as typeof d.info.services;
      (d.info.services as unknown as Record<string, boolean>)[key] = val;
    });

  const SVC_DEFS = [
    { key: "sd", label: "Schematic Design" },
    { key: "dd", label: "Design Development" },
    { key: "cd", label: "Construction Documents" },
    { key: "ca", label: "Construction Administration" },
    { key: "hourlyCa", label: "Hourly Construction Administration" },
  ];

  const serviceRowsLeft = SVC_DEFS.map((s) => {
    const checked = !!(info.services as unknown as Record<string, boolean>)[s.key];
    return {
      key: s.key,
      label: s.label,
      checked,
      onChange: (v: boolean) => {
        if (s.key === "ca") {
          upd((d) => {
            d.info.services.ca = v;
            if (v) d.info.services.hourlyCa = false;
          });
        } else if (s.key === "hourlyCa") {
          upd((d) => {
            d.info.services.hourlyCa = v;
            if (v) d.info.services.ca = false;
          });
        } else {
          svcSet(s.key, v);
        }
      },
    };
  });

  const serviceRowsRight = settings.otherServices.map((s) => {
    const checked =
      s.id === "projectManual"
        ? info.projectManual === "Yes"
        : s.id === "bidding"
          ? info.bidding === "Yes"
          : s.id === "ec"
            ? !!info.services.ec
            : s.id === "testfit"
              ? !!info.services.testfit
              : s.id === "vr"
                ? !!info.services.vr
                : !!(info.otherServicesChecked || {})[s.id];
    return {
      key: s.id,
      label: s.name,
      checked,
      onChange: (v: boolean) => {
        if (s.id === "projectManual") upd((d) => { d.info.projectManual = v ? "Yes" : "No"; });
        else if (s.id === "bidding") upd((d) => { d.info.bidding = v ? "Yes" : "No"; });
        else if (s.id === "ec" || s.id === "testfit" || s.id === "vr") svcSet(s.id, v);
        else
          upd((d) => {
            if (!d.info.otherServicesChecked) d.info.otherServicesChecked = {};
            d.info.otherServicesChecked[s.id] = v;
          });
      },
    };
  });

  const basicServiceRows = serviceRowsRight.filter((r) => r.key === "ec").concat(serviceRowsLeft);
  const additionalServiceRows = serviceRowsRight.filter((r) => r.key !== "ec");

  // ---- project areas ----
  const adder = (info.projectManual === "Yes" ? settings.adders.specs : 0) + (info.publicSector === "Yes" ? settings.adders.public : 0);
  const areaRows = info.areas.map((a, i) => ({
    ...a,
    num: String(i + 1),
    onArea: (v: string) => upd((d) => { d.info.areas[i].area = v; }),
    onUseType: (v: string) =>
      upd((d) => {
        d.info.areas[i].useType = v;
        const b = settings.bench.find((x) => x.type === v);
        if (b) {
          d.info.areas[i].selPct = Math.round((+b.feePct || 0) * (1 + adder) * 10000) / 100;
          d.info.areas[i].selSF = Math.round((+b.feeSF || 0) * (1 + adder) * 100) / 100;
        }
      }),
    onSf: (v: string) => upd((d) => { d.info.areas[i].sf = v.replace(/[^0-9.]/g, ""); }),
    onRemove: () => upd((d) => { if (d.info.areas.length > 1) d.info.areas.splice(i, 1); }),
  }));

  const onAddArea = () => upd((d) => { d.info.areas.push({ area: "", useType: "", sf: "", selPct: null, selSF: null }); });

  // ---- go/no-go scorecard ----
  let goWT = 0,
    goET = 0;
  const goRows = GO_Q.map((q, i) => {
    const g = info.go[i];
    goWT += +g.weight;
    goET += +g.score * +g.weight;
    return {
      q,
      score: g.score,
      weight: g.weight,
      weighted: +g.score * +g.weight,
      onScore: (v: number) => upd((d) => { d.info.go[i].score = v; }),
      onWeight: (v: number) => upd((d) => { d.info.go[i].weight = v; }),
    };
  });
  const goPct = goWT > 0 ? goET / (3 * goWT) : 0;
  const verdict = goPct >= 0.75 ? "GO" : goPct >= 0.6 ? "CAUTION" : "NO-GO";
  // Shares its palette with Fee Calculation's health status (POSITIVE/CAUTION/STOP)
  // instead of steel/tangerine, which double as Pipeline stage colors -- design review COLOR-01
  const verdictColor = verdict === "GO" ? POSITIVE_COLOR : verdict === "CAUTION" ? CAUTION_COLOR : STOP_COLOR;

  // ---- header status pill ----
  const projectStatusLabel = pipeline.status || "New Lead";
  const projectStatusPillColor = oppStatusColor(projectStatusLabel);

  return {
    info,
    upd,
    totalSF,
    useTypeOptions: USE_TYPES,
    basicServiceRows,
    additionalServiceRows,
    areaRows,
    onAddArea,
    goRows,
    goWeightTotal: goWT,
    goWeightedTotal: goET,
    goPctLabel: Math.round(goPct * 100) + "%",
    verdict,
    verdictColor,
    projectStatusLabel,
    projectStatusPillColor,
  };
}
