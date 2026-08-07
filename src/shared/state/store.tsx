import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { defaultData, emptyPhaseObj } from "./defaultData";
import { deepMerge } from "./deepMerge";
import { migrateToUnifiedStore, type OldStore, type OldOppState } from "./migration";
import { duplicateProjectData } from "../../features/pipeline/duplicateProject";
import { PHASES, STATUS_OPTIONS } from "../lib/constants";
import type { PipelineData, ProjectData, ProjectRecord, Store } from "./types";

// Ported from Component's constructor/upd()/updStore()/persist()
// (Ossa Fee Proposal App.dc.html lines 1440-1934), reworked per the
// Pipeline Unification design spec: the separate opportunity store is
// gone, every project carries its own `pipeline` data, and navigation is
// view-based (pipeline/project/settings) instead of a flat tab number.

const KEY = "ossaFeeProposal.v3";
const OLD_OPP_KEY = "ossaOpportunities.v1";
const MIGRATION_FLAG_KEY = "ossaFeeProposal.pipelineUnifyDone";
const MIGRATION_FLAG_VALUE = "v1";

export type ProjectTab = 1 | 2 | 3 | 7;
export type View = "pipeline" | "project" | "settings";

function freshStore(): Store {
  const id = "p" + Date.now().toString(36);
  return {
    currentId: id,
    order: [id],
    projects: { [id]: { created: Date.now(), updated: Date.now(), data: defaultData() } },
    leads: {},
    leadOrder: [],
    pipelineSettings: { year: String(new Date().getFullYear()), pendingTarget: 500000 },
  };
}

function migrate(d: ProjectData): ProjectData {
  const def = defaultData();
  const merged = deepMerge(def, d) as ProjectData;
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
  if (!(STATUS_OPTIONS as readonly string[]).includes(merged.pipeline.status)) merged.pipeline.status = "New Lead";
  return merged;
}

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function loadStore(): Store {
  let store: Store | null = readJson<Store>(KEY);
  const alreadyMigrated = store && Array.isArray(store.order) && store.order.every((id) => store!.projects?.[id]?.data?.pipeline);

  if (!alreadyMigrated) {
    if (localStorage.getItem(MIGRATION_FLAG_KEY) !== MIGRATION_FLAG_VALUE) {
      const oldStore = readJson<OldStore>(KEY);
      const oldOpp = readJson<OldOppState>(OLD_OPP_KEY);
      store = oldStore && oldStore.projects && Array.isArray(oldStore.order) && oldStore.order.length
        ? migrateToUnifiedStore(oldStore, oldOpp)
        : freshStore();
      try {
        localStorage.setItem(KEY, JSON.stringify(store));
        localStorage.setItem(MIGRATION_FLAG_KEY, MIGRATION_FLAG_VALUE);
      } catch {
        /* storage unavailable */
      }
    }
    // else: flag already set but store doesn't look migrated -- fall through
    // with whatever was read; migrate() below backfills defaults per-project
    // rather than discarding real data.
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
  if (!store.pipelineSettings) store.pipelineSettings = { year: String(new Date().getFullYear()), pendingTarget: 500000 };
  return store;
}

interface AppStateShape {
  store: Store;
  view: View;
  projectTab: ProjectTab;
  savedAt: number | null;
}

interface AppContextShape {
  state: AppStateShape;
  currentProject: ProjectRecord | undefined;
  upd: (fn: (data: ProjectData, store: Store) => void) => void;
  updStore: (fn: (store: Store) => void) => void;
  goToPipeline: () => void;
  goToSettings: () => void;
  openProject: (id: string, tab?: ProjectTab) => void;
  setProjectTab: (tab: ProjectTab) => void;
  addProject: () => void;
  duplicateProject: (sourceId: string) => void;
  removeProject: (id: string) => void;
  updateProjectPipeline: (id: string, field: keyof PipelineData, value: unknown) => void;
  addProjectSplit: (id: string) => void;
  removeProjectSplit: (id: string, index: number) => void;
  updateProjectSplit: (id: string, index: number, field: "year" | "invoiced", value: string | number) => void;
  setPendingTarget: (value: number) => void;
  setPipelineYear: (year: string) => void;
}

const AppContext = createContext<AppContextShape | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppStateShape>(() => ({
    store: loadStore(),
    view: "pipeline",
    projectTab: 1,
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

  const debouncedPersist = useCallback(
    (store: Store) => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => persistStore(store), 0);
    },
    [persistStore],
  );

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

  const goToPipeline = useCallback(() => setState((s) => ({ ...s, view: "pipeline" })), []);
  const goToSettings = useCallback(() => setState((s) => ({ ...s, view: "settings" })), []);

  const openProject = useCallback((id: string, tab?: ProjectTab) => {
    setState((s) => ({
      ...s,
      view: "project",
      projectTab: tab ?? s.projectTab,
      store: { ...s.store, currentId: id },
    }));
  }, []);

  const setProjectTab = useCallback((tab: ProjectTab) => setState((s) => ({ ...s, projectTab: tab })), []);

  const nextProjectNumber = useCallback((store: Store, year: string) => {
    const yy = String(year).slice(-2);
    let max = 0;
    store.order.forEach((id) => {
      const pl = store.projects[id].data.pipeline;
      if (pl.fallbackYear === String(year) && pl.projectNumber && pl.projectNumber.startsWith(yy + "-")) {
        const n = parseInt(pl.projectNumber.split("-")[1], 10);
        if (n > max) max = n;
      }
    });
    return yy + "-" + String(max + 1).padStart(2, "0");
  }, []);

  const addProject = useCallback(() => {
    setState((s) => {
      const store: Store = JSON.parse(JSON.stringify(s.store));
      const id = "p" + Date.now().toString(36);
      const year = String(new Date().getFullYear());
      const data = defaultData();
      data.pipeline.projectNumber = nextProjectNumber(store, year);
      store.projects[id] = { created: Date.now(), updated: Date.now(), data };
      store.order.push(id);
      store.currentId = id;
      store.pipelineSettings.year = year;
      persistStore(store);
      return { ...s, store, view: "project", projectTab: 1, savedAt: Date.now() };
    });
  }, [nextProjectNumber, persistStore]);

  const duplicateProject = useCallback(
    (sourceId: string) => {
      setState((s) => {
        const store: Store = JSON.parse(JSON.stringify(s.store));
        const source = store.projects[sourceId];
        if (!source) return s;
        const id = "p" + Date.now().toString(36);
        const year = String(new Date().getFullYear());
        const projectNumber = nextProjectNumber(store, year);
        store.projects[id] = { created: Date.now(), updated: Date.now(), data: duplicateProjectData(source.data, projectNumber) };
        store.order.push(id);
        store.currentId = id;
        store.pipelineSettings.year = year;
        persistStore(store);
        return { ...s, store, view: "project", projectTab: 1, savedAt: Date.now() };
      });
    },
    [nextProjectNumber, persistStore],
  );

  const removeProject = useCallback(
    (id: string) => {
      if (!window.confirm("Remove this project? This cannot be undone.")) return;
      setState((s) => {
        const store: Store = JSON.parse(JSON.stringify(s.store));
        const idx = store.order.indexOf(id);
        if (idx === -1) return s;
        delete store.projects[id];
        store.order.splice(idx, 1);
        if (store.currentId === id) store.currentId = store.order[0] || "";
        persistStore(store);
        const wasOpen = s.view === "project" && s.store.currentId === id;
        return { ...s, store, view: wasOpen ? "pipeline" : s.view, savedAt: Date.now() };
      });
    },
    [persistStore],
  );

  // Business rules preserved from the pre-unification updateOppProject:
  // reaching 100% win chance auto-advances status to Won/In Process
  // (unless already Completed), and setting status to Won/Completed pins
  // chances to 100 (or drops back to 50 when moving off one of those).
  const updateProjectPipeline = useCallback(
    (id: string, field: keyof PipelineData, value: unknown) => {
      setState((s) => {
        const store: Store = JSON.parse(JSON.stringify(s.store));
        const rec = store.projects[id];
        if (!rec) return s;
        const pl = rec.data.pipeline as unknown as Record<string, unknown>;
        const prevStatus = pl.status as string;
        (pl as Record<string, unknown>)[field] = value;
        if (field === "chances" && Number(value) === 100) {
          pl.status = prevStatus === "Completed" ? "Completed" : "Won / In Process";
        }
        if (field === "status") {
          if (value === "Won / In Process" || value === "Completed") pl.chances = 100;
          else if (prevStatus === "Won / In Process" || prevStatus === "Completed") pl.chances = 50;
        }
        rec.updated = Date.now();
        debouncedPersist(store);
        return { ...s, store, savedAt: Date.now() };
      });
    },
    [debouncedPersist],
  );

  const addProjectSplit = useCallback(
    (id: string) => {
      setState((s) => {
        const store: Store = JSON.parse(JSON.stringify(s.store));
        const pl = store.projects[id]?.data.pipeline;
        if (!pl) return s;
        const splits = pl.yearSplits.length ? [...pl.yearSplits] : [{ year: pl.date?.slice(0, 4) || pl.fallbackYear, invoiced: Number(pl.invoiced) || 0 }];
        splits.push({ year: store.pipelineSettings.year, invoiced: 0 });
        pl.yearSplits = splits;
        debouncedPersist(store);
        return { ...s, store, savedAt: Date.now() };
      });
    },
    [debouncedPersist],
  );

  const removeProjectSplit = useCallback(
    (id: string, index: number) => {
      setState((s) => {
        const store: Store = JSON.parse(JSON.stringify(s.store));
        const pl = store.projects[id]?.data.pipeline;
        if (!pl) return s;
        pl.yearSplits = pl.yearSplits.filter((_sp, i) => i !== index);
        debouncedPersist(store);
        return { ...s, store, savedAt: Date.now() };
      });
    },
    [debouncedPersist],
  );

  const updateProjectSplit = useCallback(
    (id: string, index: number, field: "year" | "invoiced", value: string | number) => {
      setState((s) => {
        const store: Store = JSON.parse(JSON.stringify(s.store));
        const pl = store.projects[id]?.data.pipeline;
        if (!pl) return s;
        pl.yearSplits = pl.yearSplits.map((sp, i) => (i === index ? { ...sp, [field]: value } : sp));
        debouncedPersist(store);
        return { ...s, store, savedAt: Date.now() };
      });
    },
    [debouncedPersist],
  );

  const setPendingTarget = useCallback(
    (value: number) => {
      setState((s) => {
        const store: Store = JSON.parse(JSON.stringify(s.store));
        store.pipelineSettings.pendingTarget = Number(value) || 0;
        debouncedPersist(store);
        return { ...s, store };
      });
    },
    [debouncedPersist],
  );

  const setPipelineYear = useCallback(
    (year: string) => {
      setState((s) => {
        const store: Store = JSON.parse(JSON.stringify(s.store));
        store.pipelineSettings.year = year;
        debouncedPersist(store);
        return { ...s, store };
      });
    },
    [debouncedPersist],
  );

  const currentProject = state.store.projects[state.store.currentId];

  const value = useMemo<AppContextShape>(
    () => ({
      state,
      currentProject,
      upd,
      updStore,
      goToPipeline,
      goToSettings,
      openProject,
      setProjectTab,
      addProject,
      duplicateProject,
      removeProject,
      updateProjectPipeline,
      addProjectSplit,
      removeProjectSplit,
      updateProjectSplit,
      setPendingTarget,
      setPipelineYear,
    }),
    [
      state,
      currentProject,
      upd,
      updStore,
      goToPipeline,
      goToSettings,
      openProject,
      setProjectTab,
      addProject,
      duplicateProject,
      removeProject,
      updateProjectPipeline,
      addProjectSplit,
      removeProjectSplit,
      updateProjectSplit,
      setPendingTarget,
      setPipelineYear,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextShape {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
