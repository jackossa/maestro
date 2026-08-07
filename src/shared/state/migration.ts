import { defaultData } from "./defaultData";
import { deepMerge } from "./deepMerge";
import { migrateOppStatus } from "../lib/constants";
import type { ProjectData, ProjectRecord, Store } from "./types";

// One-time migration from the pre-unification dual-store shape (separate
// store.projects + opp.projects with an optional projectId link) to the
// unified shape where every project carries its own `pipeline` data
// directly. Pure function -- the caller (store.tsx) is responsible for
// reading the raw old localStorage JSON and calling this once, guarded by
// a flag so it never runs twice. See the design spec, "Migration" section.

export interface OldProjectInfo {
  outcome?: string;
  name?: string;
  client?: string;
  [key: string]: unknown;
}

export interface OldProjectData {
  info: OldProjectInfo;
  [key: string]: unknown;
}

export interface OldProjectRecord {
  created: number;
  updated: number;
  data: OldProjectData;
}

export interface OldStore {
  currentId: string;
  order: string[];
  projects: Record<string, OldProjectRecord>;
  leads?: Record<string, unknown>;
  leadOrder?: string[];
}

export interface OldOppProject {
  _id: string;
  client: string;
  project: string;
  status: string;
  potentialFee: number;
  invoiced: number;
  remaining: number;
  chances: number;
  date: string;
  lostReason: string;
  yearSplits: { year: string; invoiced: number }[];
  projectNumber: string;
  fallbackYear: string;
  projectId?: string;
}

export interface OldOppState {
  projects: OldOppProject[];
  year: string;
  pendingTarget: number;
}

function synthesizeId(): string {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function pipelineFromOpp(opp: OldOppProject) {
  return {
    status: migrateOppStatus(opp.status),
    potentialFee: +opp.potentialFee || 0,
    invoiced: +opp.invoiced || 0,
    remaining: +opp.remaining || 0,
    chances: +opp.chances || 0,
    date: opp.date || "",
    fallbackYear: opp.fallbackYear || String(new Date().getFullYear()),
    lostReason: opp.lostReason || "",
    yearSplits: Array.isArray(opp.yearSplits)
      ? opp.yearSplits.map((s) => ({ year: String(s.year || ""), invoiced: +s.invoiced || 0 }))
      : [],
    projectNumber: opp.projectNumber || "",
  };
}

export function migrateToUnifiedStore(oldStore: OldStore, oldOpp: OldOppState | null): Store {
  const oppByProjectId = new Map<string, OldOppProject>();
  const oppWithoutProject: OldOppProject[] = [];
  (oldOpp?.projects || []).forEach((p) => {
    if (p.projectId) oppByProjectId.set(p.projectId, p);
    else oppWithoutProject.push(p);
  });

  const projects: Record<string, ProjectRecord> = {};
  const order: string[] = [];

  for (const id of oldStore.order) {
    const rec = oldStore.projects[id];
    if (!rec) continue;

    const base = defaultData();
    const merged = deepMerge(base, rec.data) as ProjectData;
    const linkedOpp = oppByProjectId.get(id);

    merged.pipeline = linkedOpp
      ? pipelineFromOpp(linkedOpp)
      : {
          status: migrateOppStatus((rec.data.info as OldProjectInfo).outcome || "New Lead"),
          potentialFee: 0,
          invoiced: 0,
          remaining: 0,
          chances: 25,
          date: "",
          fallbackYear: String(new Date().getFullYear()),
          lostReason: "",
          yearSplits: [],
          projectNumber: "",
        };
    delete (merged.info as Record<string, unknown>).outcome;

    projects[id] = { created: rec.created, updated: rec.updated, data: merged };
    order.push(id);
  }

  for (const opp of oppWithoutProject) {
    const id = synthesizeId();
    const data = defaultData();
    data.info.name = opp.project || "Untitled Project";
    data.info.client = opp.client || "";
    data.pipeline = pipelineFromOpp(opp);
    projects[id] = { created: Date.now(), updated: Date.now(), data };
    order.push(id);
  }

  return {
    currentId: order[0] || "",
    order,
    projects,
    leads: {},
    leadOrder: [],
    pipelineSettings: {
      year: oldOpp?.year || String(new Date().getFullYear()),
      pendingTarget: oldOpp?.pendingTarget || 500000,
    },
  };
}
