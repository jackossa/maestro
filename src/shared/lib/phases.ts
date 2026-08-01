import { PHASES, type Phase } from "./constants";
import type { ProjectInfo } from "../state/types";

// Ported verbatim from Component.renderVals() phase-gating logic
// (Ossa Fee Proposal App.dc.html lines 1962-1971). Determines which phases
// are active for fee calc / schedule based on public-sector, bidding, and
// per-service checkboxes -- including the CA vs Hourly CA mutual exclusion.

const GATED_KEYS = new Set(["sd", "dd", "cd", "ca", "ec", "hourlyCa"]);

export function getPhaseGates(info: ProjectInfo) {
  const isPublic = info.publicSector === "Yes";
  const isBidding = info.bidding === "Yes";
  const svc = info.services || ({} as ProjectInfo["services"]);

  const permGate = (p: Phase) => p.k !== "perm" || svc.cd !== false;
  const testfitGate = (p: Phase) => p.k !== "testfit" || svc.testfit === true;
  const caGate = (p: Phase) =>
    p.k === "hourlyCa" ? svc.hourlyCa === true : p.k === "ca" ? svc.hourlyCa !== true && svc.ca !== false : true;

  const activePhases = PHASES.filter(
    (p) =>
      (!p.publicOnly || isPublic) &&
      (!p.biddingOnly || isBidding) &&
      (!GATED_KEYS.has(p.k) || (svc as Record<string, boolean>)[p.k] !== false) &&
      !p.scheduleOnly &&
      permGate(p) &&
      caGate(p) &&
      testfitGate(p),
  );

  const schedPhases = PHASES.filter(
    (p) =>
      (!p.publicOnly || isPublic) &&
      (!p.biddingOnly || isBidding) &&
      (!GATED_KEYS.has(p.k) || (svc as Record<string, boolean>)[p.k] !== false) &&
      permGate(p) &&
      caGate(p) &&
      testfitGate(p),
  );

  return { isPublic, isBidding, activePhases, schedPhases };
}
