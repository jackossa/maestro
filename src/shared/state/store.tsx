import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { defaultData, emptyPhaseObj } from "./defaultData";
import { PHASES, STATUS_OPTIONS, OPP_SEED, migrateOppStatus } from "../lib/constants";
import type { OppProject } from "../lib/constants";
import type { ProjectData, ProjectRecord, Store } from "./types";

// Ported from Component's constructor/upd()/updStore()/persist() and the
// pipeline (opp) state management (Ossa Fee Proposal App.dc.html lines
// 1440-1934). Same localStorage keys, same migrate/merge-on-load behavior,
// same single-mutator-function persistence pattern.

const KEY = "ossaFeeProposal.v3";
const OPP_KEY = "ossaOpportunities.v1";
const IMPORT_FLAG_KEY = "ossaOpportunities.importFlag";
const IMPORT_FLAG_VALUE = "single-sample-project-v4";

interface OppState {
  projects: OppProject[];
  year: string;
  pendingTarget: number;
}

function freshStore(): Store {
  const id = "p" + Date.now().toString(36);
  return {
    currentId: id,
    order: [id],
    projects: { [id]: { created: Date.now(), updated: Date.now(), data: defaultData() } },
    leads: {},
    leadOrder: [],
  };
}

// deep-merge saved data onto current defaults so new fields introduced later
// don't crash old saved projects -- mirrors Component.merge()
function merge(def: unknown, sav: unknown): unknown {
  if (sav === undefined || sav === null) return def;
  if (Array.isArray(def)) {
    if (!Array.isArray(sav)) return def;
    if (def.length && typeof def[0] === "object" && def[0] !== null && !Array.isArray(def[0])) {
      return sav.map((s, i) => merge(def[Math.min(i, def.length - 1)], s));
    }
    return sav;
  }
  if (def && typeof def === "object") {
    const o: Record<string, unknown> = {};
    const defObj = def as Record<string, unknown>;
    const savObj = (sav && typeof sav === "object" ? sav : {}) as Record<string, unknown>;
    for (const k of Object.keys(defObj)) o[k] = merge(defObj[k], savObj[k]);
    for (const k of Object.keys(savObj)) if (!(k in o)) o[k] = savObj[k];
    return o;
  }
  return sav;
}

function migrate(d: ProjectData): ProjectData {
  const def = defaultData();
  const merged = merge(def, d) as ProjectData;
  PHASES.forEach((p) => {
    if (typeof merged.calc.weeks[p.k] !== "number") merged.calc.weeks[p.k] = def.calc.weeks[p.k];
  });
  merged.calc.hrs = (merged.calc.hrs || []).map((h) => {
    const fixed = emptyPhaseObj(0);
    PHASES.forEach((p) => {
      fixed[p.k] = typeof h?.[p.k] === "number" ? h[p.k] : 0;
    });
    return fixed;
  });
  const teamLen = merged.settings.team.length;
  while (merged.calc.hrs.length < teamLen) merged.calc.hrs.push(emptyPhaseObj(0));
  merged.calc.hrs.length = teamLen;
  while (merged.calc.consultants.length < merged.settings.consultants.length) merged.calc.consultants.push(0);
  merged.calc.consultants.length = merged.settings.consultants.length;
  if (!(STATUS_OPTIONS as readonly string[]).includes(merged.info.outcome)) merged.info.outcome = "New Lead";
  return merged;
}

function loadStore(): Store {
  let store: Store | null = null;
  try {
    store = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    store = null;
  }
  if (!store || !store.projects || !Array.isArray(store.order)) store = freshStore();
  store.order = store.order.filter((id) => store!.projects[id]);
  if (!store.order.length) store = freshStore();
  for (const id of store.order) {
    try {
      store.projects[id].data = migrate(store.projects[id].data);
    } catch {
      store.projects[id].data = defaultData();
    }
  }
  if (!store.projects[store.currentId]) store.currentId = store.order[0];
  if (!store.leads || typeof store.leads !== "object") store.leads = {};
  if (!Array.isArray(store.leadOrder)) store.leadOrder = [];
  store.leadOrder = store.leadOrder.filter((id) => store!.leads[id]);
  return store;
}

function loadOpp(): OppState {
  let opp: OppState | null = null;
  try {
    opp = JSON.parse(localStorage.getItem(OPP_KEY) || "null");
  } catch {
    opp = null;
  }
  if (!opp || !Array.isArray(opp.projects)) {
    opp = { projects: JSON.parse(JSON.stringify(OPP_SEED)), year: "2026", pendingTarget: 500000 };
  }
  if (localStorage.getItem(IMPORT_FLAG_KEY) !== IMPORT_FLAG_VALUE) {
    opp.projects = JSON.parse(JSON.stringify(OPP_SEED));
    opp.year = "2026";
    try {
      localStorage.setItem(IMPORT_FLAG_KEY, IMPORT_FLAG_VALUE);
      localStorage.setItem(OPP_KEY, JSON.stringify({ projects: opp.projects, year: opp.year, pendingTarget: opp.pendingTarget || 500000 }));
    } catch {
      /* storage unavailable */
    }
  }
  opp.projects = opp.projects.map((p) => ({
    ...p,
    status: migrateOppStatus(p.status),
    yearSplits: Array.isArray(p.yearSplits) ? p.yearSplits.map((s) => ({ year: String(s.year || ""), invoiced: +s.invoiced || 0 })) : [],
  }));
  return opp;
}

interface AppStateShape {
  store: Store;
  opp: OppState;
  tab: number;
  savedAt: number | null;
}

interface AppContextShape {
  state: AppStateShape;
  currentProject: ProjectRecord;
  setTab: (tab: number) => void;
  /** mutate the active project's data in place (Immer-less draft via JSON clone), matching Component.upd() */
  upd: (fn: (data: ProjectData, store: Store) => void) => void;
  /** mutate the whole store (project list ops), matching Component.updStore() */
  updStore: (fn: (store: Store) => void) => void;
  setOppState: (fn: ((opp: OppState) => Partial<OppState>) | Partial<OppState>) => void;
  addOppProject: () => void;
  updateOppProject: (id: string, field: string, value: unknown) => void;
  openOrCreateOppProject: (id: string) => void;
  removeOppProject: (id: string) => void;
  addOppSplit: (id: string) => void;
  removeOppSplit: (id: string, index: number) => void;
  updateOppSplit: (id: string, index: number, field: "year" | "invoiced", value: string | number) => void;
  setOppPendingTarget: (value: number) => void;
}

const AppContext = createContext<AppContextShape | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppStateShape>(() => ({
    store: loadStore(),
    opp: loadOpp(),
    tab: 1,
    savedAt: null,
  }));
  const persistTimer = useRef<number | null>(null);

  const persistStore = useCallback((store: Store) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const persistOpp = useCallback((opp: OppState) => {
    try {
      localStorage.setItem(OPP_KEY, JSON.stringify(opp));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setTab = useCallback((tab: number) => setState((s) => ({ ...s, tab })), []);

  const upd = useCallback(
    (fn: (data: ProjectData, store: Store) => void) => {
      setState((s) => {
        const store: Store = JSON.parse(JSON.stringify(s.store));
        fn(store.projects[store.currentId].data, store);
        store.projects[store.currentId].updated = Date.now();
        persistStore(store);
        return { ...s, store, savedAt: Date.now() };
      });
    },
    [persistStore],
  );

  const updStore = useCallback(
    (fn: (store: Store) => void) => {
      setState((s) => {
        const store: Store = JSON.parse(JSON.stringify(s.store));
        fn(store);
        persistStore(store);
        return { ...s, store, savedAt: Date.now() };
      });
    },
    [persistStore],
  );

  const setOppState = useCallback(
    (fn: ((opp: OppState) => Partial<OppState>) | Partial<OppState>) => {
      setState((s) => {
        const patch = typeof fn === "function" ? fn(s.opp) : fn;
        const opp = { ...s.opp, ...patch };
        if (persistTimer.current) window.clearTimeout(persistTimer.current);
        persistTimer.current = window.setTimeout(() => persistOpp(opp), 0);
        return { ...s, opp };
      });
    },
    [persistOpp],
  );

  // ---- Opportunity CRUD, ported from Component's opp-project methods
  // (Ossa Fee Proposal App.dc.html lines 1587-1677). These touch both `store`
  // (creating/linking projects) and `opp` (the pipeline list), so they run as
  // one combined setState rather than composing upd()+setOppState() separately.
  const nextProjectNumber = useCallback(
    (year: string) => {
      const yy = String(year).slice(-2);
      let max = 0;
      state.opp.projects.forEach((p) => {
        if (p.fallbackYear === String(year) && p.projectNumber && p.projectNumber.startsWith(yy + "-")) {
          const n = parseInt(p.projectNumber.split("-")[1], 10);
          if (n > max) max = n;
        }
      });
      return yy + "-" + String(max + 1).padStart(2, "0");
    },
    [state.opp.projects],
  );

  const addOppProject = useCallback(() => {
    const iso = new Date().toISOString().slice(0, 10);
    const y = iso.slice(0, 4);
    const newP = {
      _id: "new-" + Date.now(), date: iso, fallbackYear: y, status: "New Lead", client: "", project: "",
      potentialFee: 0, invoiced: 0, remaining: 0, chances: 25, projectNumber: nextProjectNumber(y),
      lostReason: "", yearSplits: [] as { year: string; invoiced: number }[],
    };
    setOppState((opp) => ({ projects: [newP, ...opp.projects], year: y }));
  }, [nextProjectNumber, setOppState]);

  const updateOppProject = useCallback(
    (id: string, field: string, value: unknown) => {
      setState((s) => {
        let store = s.store;
        let opp = s.opp;
        const cur = opp.projects.find((p) => p._id === id);

        if (field === "status" && value === "Write Proposal" && cur && !cur.projectId) {
          const newProjId = "p" + Date.now().toString(36);
          const data = defaultData();
          data.info.name = cur.project || "Untitled Project";
          data.info.client = cur.client || "";
          data.info.outcome = "Write Proposal";
          store = JSON.parse(JSON.stringify(store));
          store.projects[newProjId] = { created: Date.now(), updated: Date.now(), data };
          store.order.push(newProjId);
          persistStore(store);
          opp = { ...opp, projects: opp.projects.map((p) => (p._id === id ? { ...p, status: "Write Proposal", projectId: newProjId } : p)) };
          if (persistTimer.current) window.clearTimeout(persistTimer.current);
          persistTimer.current = window.setTimeout(() => persistOpp(opp), 0);
          return { ...s, store, opp };
        }

        if (field === "status" && cur?.projectId && store.projects[cur.projectId]) {
          store = JSON.parse(JSON.stringify(store));
          store.projects[cur.projectId].data.info.outcome = value as string;
          persistStore(store);
        }

        opp = {
          ...opp,
          projects: opp.projects.map((p) => {
            if (p._id !== id) return p;
            const next = { ...p, [field]: value };
            if (field === "chances" && Number(value) === 100) next.status = p.status === "Completed" ? "Completed" : "Won / In Process";
            if (field === "status") {
              if (value === "Won / In Process" || value === "Completed") next.chances = 100;
              else if (p.status === "Won / In Process" || p.status === "Completed") next.chances = 50;
            }
            return next;
          }),
        };
        if (persistTimer.current) window.clearTimeout(persistTimer.current);
        persistTimer.current = window.setTimeout(() => persistOpp(opp), 0);
        return { ...s, store, opp };
      });
    },
    [persistStore, persistOpp],
  );

  const openOrCreateOppProject = useCallback(
    (id: string) => {
      setState((s) => {
        const cur = s.opp.projects.find((p) => p._id === id);
        if (!cur) return s;
        let store = s.store;
        let opp = s.opp;
        let projId = cur.projectId;
        if (!projId || !store.projects[projId]) {
          projId = "p" + Date.now().toString(36);
          const data = defaultData();
          data.info.name = cur.project || "Untitled Project";
          data.info.client = cur.client || "";
          data.info.outcome = cur.status;
          store = JSON.parse(JSON.stringify(store));
          store.projects[projId] = { created: Date.now(), updated: Date.now(), data };
          store.order.push(projId);
          opp = { ...opp, projects: opp.projects.map((p) => (p._id === id ? { ...p, projectId: projId } : p)) };
        } else if (store.projects[projId].data.info.outcome !== cur.status) {
          store = JSON.parse(JSON.stringify(store));
          store.projects[projId].data.info.outcome = cur.status;
        }
        store.currentId = projId;
        persistStore(store);
        if (persistTimer.current) window.clearTimeout(persistTimer.current);
        persistTimer.current = window.setTimeout(() => persistOpp(opp), 0);
        return { ...s, store, opp, tab: 1 };
      });
    },
    [persistStore, persistOpp],
  );

  const removeOppProject = useCallback(
    (id: string) => {
      if (!window.confirm("Remove this opportunity? This cannot be undone.")) return;
      setOppState((opp) => ({ projects: opp.projects.filter((p) => p._id !== id) }));
    },
    [setOppState],
  );

  const addOppSplit = useCallback(
    (id: string) => {
      setOppState((opp) => ({
        projects: opp.projects.map((p) => {
          if (p._id !== id) return p;
          const splits = p.yearSplits && p.yearSplits.length ? [...p.yearSplits] : [{ year: p.date?.slice(0, 4) || p.fallbackYear, invoiced: Number(p.invoiced) || 0 }];
          splits.push({ year: opp.year, invoiced: 0 });
          return { ...p, yearSplits: splits };
        }),
      }));
    },
    [setOppState],
  );

  const removeOppSplit = useCallback(
    (id: string, index: number) => {
      setOppState((opp) => ({
        projects: opp.projects.map((p) => (p._id === id ? { ...p, yearSplits: (p.yearSplits || []).filter((_s, i) => i !== index) } : p)),
      }));
    },
    [setOppState],
  );

  const updateOppSplit = useCallback(
    (id: string, index: number, field: "year" | "invoiced", value: string | number) => {
      setOppState((opp) => ({
        projects: opp.projects.map((p) =>
          p._id === id ? { ...p, yearSplits: (p.yearSplits || []).map((s, i) => (i === index ? { ...s, [field]: value } : s)) } : p,
        ),
      }));
    },
    [setOppState],
  );

  const setOppPendingTarget = useCallback((value: number) => setOppState({ pendingTarget: Number(value) || 0 }), [setOppState]);

  const currentProject = state.store.projects[state.store.currentId];

  const value = useMemo<AppContextShape>(
    () => ({
      state,
      currentProject,
      setTab,
      upd,
      updStore,
      setOppState,
      addOppProject,
      updateOppProject,
      openOrCreateOppProject,
      removeOppProject,
      addOppSplit,
      removeOppSplit,
      updateOppSplit,
      setOppPendingTarget,
    }),
    [
      state,
      currentProject,
      setTab,
      upd,
      updStore,
      setOppState,
      addOppProject,
      updateOppProject,
      openOrCreateOppProject,
      removeOppProject,
      addOppSplit,
      removeOppSplit,
      updateOppSplit,
      setOppPendingTarget,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextShape {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
