# Pipeline Unification & Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `store.projects` and the separate `opp.projects` opportunity list into one record per project, make Pipeline the app's home screen, and rework navigation/creation around that — per `docs/superpowers/specs/2026-08-06-pipeline-unification-design.md`.

**Architecture:** Every project gains a `pipeline` sub-object (status, potential fee, win %, year splits, etc.) replacing the separate `OppProject` record and `ProjectInfo.outcome`. The app's top-level state moves from a flat `tab: number` to a `view: "pipeline" | "project" | "settings"` plus a remembered `projectTab` for when `view === "project"`. A one-time migration reads the old dual-store shape from localStorage and produces the new unified shape.

**Tech Stack:** Vite + React 18 + TypeScript, Tailwind CSS. No test runner exists yet — Task 1 adds Vitest (pairs natively with Vite) for the two pure-logic modules (migration, duplication) that can be genuinely unit-tested without a browser. UI/wiring tasks are verified manually (no component-test framework is being introduced — out of proportion for this change) with exact click-through steps.

## Global Constraints

- No Node.js is available in the environment this plan was written in — every step's "run tests" instruction assumes the *implementer's* machine has Node, not this one. Do not claim a step passed without actually running it.
- Preserve every existing formula, tab's content, and print/PDF behavior untouched — this plan only changes navigation and the project/pipeline data model.
- Match existing code style: no semicolon-free style, double quotes, existing Tailwind token names (`os-*`, `brand-*`). Follow patterns already in the file being edited.
- Every new/changed file gets a comment explaining *why*, matching the codebase's existing convention of citing what a block replaces or is ported from.

---

## Task 1: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/shared/lib/sanity.test.ts`

**Interfaces:**
- Produces: `npm test` command; any `*.test.ts` file under `src/` is picked up automatically.

- [ ] **Step 1: Add the dependency and script**

In `package.json`, add to `devDependencies`:

```json
    "vitest": "^2.1.4"
```

And add to `scripts`:

```json
    "test": "vitest run"
```

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Write a smoke test**

Create `src/shared/lib/sanity.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it**

Run: `npm install && npm test`
Expected: 1 passed, showing `sanity.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts src/shared/lib/sanity.test.ts
git commit -m "Add Vitest for pure-logic unit tests"
```

---

## Task 2: Unified data model — types and defaults

**Files:**
- Modify: `src/shared/state/types.ts`
- Modify: `src/shared/state/defaultData.ts`
- Test: `src/shared/state/defaultData.test.ts`

**Interfaces:**
- Produces: `PipelineData` interface, `ProjectData.pipeline: PipelineData`, `Store.pipelineSettings: { year: string; pendingTarget: number }`. `ProjectInfo` no longer has `outcome`.
- Consumes: nothing new (existing `ProjectData`/`Store`/`ProjectInfo` types).

- [ ] **Step 1: Add `PipelineData` and wire it into `ProjectData`/`Store`**

In `src/shared/state/types.ts`, remove line 25 (`outcome: string;`) from `ProjectInfo`, then add this new interface right after `GoRow` (after line 16):

```ts
export interface PipelineData {
  status: string;
  potentialFee: number;
  invoiced: number;
  remaining: number;
  chances: number;
  date: string;
  fallbackYear: string;
  lostReason: string;
  yearSplits: { year: string; invoiced: number }[];
  projectNumber: string;
}
```

Then modify `ProjectData` (currently lines 118-125) to add the `pipeline` field:

```ts
export interface ProjectData {
  info: ProjectInfo;
  calc: CalcData;
  schedule: { start: string };
  packages: { A: PackageDef; B: PackageDef; C: PackageDef };
  proposal: ProposalData;
  settings: Settings;
  pipeline: PipelineData;
}
```

Then modify `Store` (currently lines 133-139) to add `pipelineSettings`:

```ts
export interface Store {
  currentId: string;
  order: string[];
  projects: Record<string, ProjectRecord>;
  leads: Record<string, unknown>;
  leadOrder: string[];
  pipelineSettings: { year: string; pendingTarget: number };
}
```

- [ ] **Step 2: Update `defaultData()`**

In `src/shared/state/defaultData.ts`, remove line 28 (`outcome: "New Lead",`) from the `info` object. Then add a `pipeline` field to the object `defaultData()` returns, after the `settings: {...}` block (after the current closing `},` of `settings`, before the final `};`):

```ts
    pipeline: {
      status: "New Lead",
      potentialFee: 0,
      invoiced: 0,
      remaining: 0,
      chances: 25,
      date: isoDate(now),
      fallbackYear: String(now.getFullYear()),
      lostReason: "",
      yearSplits: [],
      projectNumber: "",
    },
```

Note: `projectNumber` is left blank here on purpose — it's assigned a real sequential value by the `addProject`/`duplicateProject` actions in Task 5, which have access to every other project's existing numbers. Nothing should ever persist or render a project with a blank `projectNumber`.

- [ ] **Step 3: Write the test**

Create `src/shared/state/defaultData.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { defaultData } from "./defaultData";

describe("defaultData", () => {
  it("includes a pipeline block with New Lead status", () => {
    const d = defaultData();
    expect(d.pipeline.status).toBe("New Lead");
    expect(d.pipeline.chances).toBe(25);
    expect(d.pipeline.yearSplits).toEqual([]);
  });

  it("does not include the old info.outcome field", () => {
    const d = defaultData();
    expect((d.info as Record<string, unknown>).outcome).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run it**

Run: `npm test`
Expected: both new tests pass. (This will not yet compile cleanly with `tsc` since other files still reference `info.outcome` — that's expected until Task 5 and Task 10. Vitest alone will still run this file fine.)

- [ ] **Step 5: Commit**

```bash
git add src/shared/state/types.ts src/shared/state/defaultData.ts src/shared/state/defaultData.test.ts
git commit -m "Add unified PipelineData to the project data model"
```

---

## Task 3: Deep-merge utility (extracted for reuse)

**Files:**
- Create: `src/shared/state/deepMerge.ts`
- Test: `src/shared/state/deepMerge.test.ts`

**Interfaces:**
- Produces: `deepMerge(def: unknown, sav: unknown): unknown`

This is `store.tsx`'s existing unexported `merge()` function (current lines 36-54), pulled into its own file so both `store.tsx` and the new migration module in Task 4 can use it without duplicating it.

- [ ] **Step 1: Write the failing test**

Create `src/shared/state/deepMerge.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deepMerge } from "./deepMerge";

describe("deepMerge", () => {
  it("fills in missing keys from the default", () => {
    const result = deepMerge({ a: 1, b: 2 }, { a: 5 });
    expect(result).toEqual({ a: 5, b: 2 });
  });

  it("keeps extra keys from the saved object", () => {
    const result = deepMerge({ a: 1 }, { a: 1, extra: "kept" });
    expect(result).toEqual({ a: 1, extra: "kept" });
  });

  it("replaces primitive-array values wholesale, not merged", () => {
    const result = deepMerge([1, 2, 3], [9]);
    expect(result).toEqual([9]);
  });

  it("merges arrays of objects element-by-element against the default's first element as template", () => {
    const result = deepMerge([{ a: 1, b: 2 }], [{ a: 9 }, { a: 8, b: 7 }]);
    expect(result).toEqual([{ a: 9, b: 2 }, { a: 8, b: 7 }]);
  });

  it("falls back to the default entirely when saved is null or undefined", () => {
    expect(deepMerge({ a: 1 }, undefined)).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, null)).toEqual({ a: 1 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/shared/state/deepMerge.test.ts`
Expected: FAIL — `Cannot find module './deepMerge'`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/state/deepMerge.ts`:

```ts
// Deep-merges saved data onto a set of defaults, so new fields introduced
// later don't crash old saved projects. Extracted from what was an
// unexported function in store.tsx so the migration module (see
// migration.ts) can share it without duplicating the logic.
export function deepMerge(def: unknown, sav: unknown): unknown {
  if (sav === undefined || sav === null) return def;
  if (Array.isArray(def)) {
    if (!Array.isArray(sav)) return def;
    if (def.length && typeof def[0] === "object" && def[0] !== null && !Array.isArray(def[0])) {
      return sav.map((s, i) => deepMerge(def[Math.min(i, def.length - 1)], s));
    }
    return sav;
  }
  if (def && typeof def === "object") {
    const o: Record<string, unknown> = {};
    const defObj = def as Record<string, unknown>;
    const savObj = (sav && typeof sav === "object" ? sav : {}) as Record<string, unknown>;
    for (const k of Object.keys(defObj)) o[k] = deepMerge(defObj[k], savObj[k]);
    for (const k of Object.keys(savObj)) if (!(k in o)) o[k] = savObj[k];
    return o;
  }
  return sav;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/shared/state/deepMerge.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/state/deepMerge.ts src/shared/state/deepMerge.test.ts
git commit -m "Extract deepMerge into its own module for reuse in migration"
```

---

## Task 4: One-time migration function

**Files:**
- Create: `src/shared/state/migration.ts`
- Test: `src/shared/state/migration.test.ts`

**Interfaces:**
- Consumes: `deepMerge` (Task 3), `defaultData` (`./defaultData`), `migrateOppStatus` (`../lib/constants`), types from `./types`.
- Produces: `migrateToUnifiedStore(oldStore: OldStore, oldOpp: OldOppState | null): Store`

This is a pure function — no localStorage access inside it — so it's fully testable in Node. The caller (Task 5) is responsible for reading the raw JSON out of localStorage and handing it to this function.

- [ ] **Step 1: Write the failing tests**

Create `src/shared/state/migration.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { migrateToUnifiedStore, type OldStore, type OldOppState } from "./migration";

function makeOldStore(overrides: Partial<OldStore> = {}): OldStore {
  return {
    currentId: "p1",
    order: ["p1"],
    projects: {
      p1: {
        created: 1000,
        updated: 2000,
        data: {
          info: { name: "Test Project", client: "Test Client", outcome: "Write Proposal" },
        },
      },
    },
    ...overrides,
  };
}

describe("migrateToUnifiedStore", () => {
  it("merges a linked opportunity's CRM fields onto its project", () => {
    const oldStore = makeOldStore();
    const oldOpp: OldOppState = {
      year: "2026",
      pendingTarget: 500000,
      projects: [
        {
          _id: "opp1", client: "Test Client", project: "Test Project", status: "Pending Approval",
          potentialFee: 45000, invoiced: 10000, remaining: 35000, chances: 75,
          date: "2026-03-01", fallbackYear: "2026", lostReason: "",
          yearSplits: [], projectNumber: "26-01", projectId: "p1",
        },
      ],
    };

    const result = migrateToUnifiedStore(oldStore, oldOpp);

    expect(result.order).toEqual(["p1"]);
    expect(result.projects.p1.data.pipeline).toEqual({
      status: "Pending Approval",
      potentialFee: 45000,
      invoiced: 10000,
      remaining: 35000,
      chances: 75,
      date: "2026-03-01",
      fallbackYear: "2026",
      lostReason: "",
      yearSplits: [],
      projectNumber: "26-01",
    });
    expect((result.projects.p1.data.info as Record<string, unknown>).outcome).toBeUndefined();
    expect(result.pipelineSettings).toEqual({ year: "2026", pendingTarget: 500000 });
  });

  it("synthesizes a new minimal project for an opportunity that was never promoted", () => {
    const oldStore = makeOldStore();
    const oldOpp: OldOppState = {
      year: "2026",
      pendingTarget: 500000,
      projects: [
        {
          _id: "opp2", client: "Raw Lead Client", project: "Raw Lead Project", status: "New Lead",
          potentialFee: 5000, invoiced: 0, remaining: 5000, chances: 25,
          date: "", fallbackYear: "2026", lostReason: "",
          yearSplits: [], projectNumber: "26-02",
          // no projectId -- never promoted
        },
      ],
    };

    const result = migrateToUnifiedStore(oldStore, oldOpp);

    expect(result.order).toHaveLength(2);
    const newId = result.order.find((id) => id !== "p1")!;
    expect(newId).toBeDefined();
    expect(result.projects[newId].data.info.name).toBe("Raw Lead Project");
    expect(result.projects[newId].data.info.client).toBe("Raw Lead Client");
    expect(result.projects[newId].data.pipeline.potentialFee).toBe(5000);
    expect(result.projects[newId].data.pipeline.projectNumber).toBe("26-02");
  });

  it("falls back to info.outcome for a project with no linked opportunity at all", () => {
    const oldStore = makeOldStore();
    const result = migrateToUnifiedStore(oldStore, null);

    expect(result.projects.p1.data.pipeline.status).toBe("Write Proposal");
    expect(result.projects.p1.data.pipeline.potentialFee).toBe(0);
    expect(result.pipelineSettings.pendingTarget).toBe(500000);
  });

  it("applies legacy status renames during migration", () => {
    const oldStore = makeOldStore({
      projects: {
        p1: { created: 1000, updated: 2000, data: { info: { name: "T", client: "C", outcome: "Pending" } } },
      },
    });
    const result = migrateToUnifiedStore(oldStore, null);
    expect(result.projects.p1.data.pipeline.status).toBe("Pending Approval");
  });

  it("skips order entries with no matching project record", () => {
    const oldStore = makeOldStore({ order: ["p1", "ghost"] });
    const result = migrateToUnifiedStore(oldStore, null);
    expect(result.order).toEqual(["p1"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/shared/state/migration.test.ts`
Expected: FAIL — `Cannot find module './migration'`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/state/migration.ts`:

```ts
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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/shared/state/migration.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/state/migration.ts src/shared/state/migration.test.ts
git commit -m "Add pure migration function for the unified project/pipeline model"
```

---

## Task 5: Duplicate-project logic

**Files:**
- Create: `src/features/pipeline/duplicateProject.ts`
- Test: `src/features/pipeline/duplicateProject.test.ts`

**Interfaces:**
- Consumes: `ProjectData` type (`../../shared/state/types`).
- Produces: `duplicateProjectData(source: ProjectData, projectNumber: string): ProjectData`

`projectNumber` is passed in rather than computed here, because computing the next sequential number requires looking at every other project — that's the caller's job (Task 6), not this pure function's.

- [ ] **Step 1: Write the failing tests**

Create `src/features/pipeline/duplicateProject.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { defaultData } from "../../shared/state/defaultData";
import { duplicateProjectData } from "./duplicateProject";

describe("duplicateProjectData", () => {
  it("clones settings, calc, and proposal from the source", () => {
    const source = defaultData();
    source.settings.team[0].rate = 999;
    source.calc.reimb = 1234;
    source.proposal.clarifications = "custom text";

    const result = duplicateProjectData(source, "26-05");

    expect(result.settings.team[0].rate).toBe(999);
    expect(result.calc.reimb).toBe(1234);
    expect(result.proposal.clarifications).toBe("custom text");
  });

  it("does not share references with the source (deep clone, not shallow)", () => {
    const source = defaultData();
    const result = duplicateProjectData(source, "26-05");
    result.settings.team[0].rate = 1;
    expect(source.settings.team[0].rate).not.toBe(1);
  });

  it("clears client/project identity fields", () => {
    const source = defaultData();
    source.info.name = "Old Project";
    source.info.client = "Old Client";
    source.info.clientCompany = "Old Co";
    source.info.clientAddr = "123 Main St";
    source.info.clientEmail = "old@example.com";

    const result = duplicateProjectData(source, "26-05");

    expect(result.info.name).toBe("");
    expect(result.info.client).toBe("");
    expect(result.info.clientCompany).toBe("");
    expect(result.info.clientAddr).toBe("");
    expect(result.info.clientEmail).toBe("");
  });

  it("clears project areas", () => {
    const source = defaultData();
    source.info.areas = [{ area: "Suite 100", useType: "Office Upfit", sf: "5000", selPct: 10, selSF: 11 }];
    const result = duplicateProjectData(source, "26-05");
    expect(result.info.areas).toEqual(defaultData().info.areas);
  });

  it("resets pipeline to New Lead with today's date and the given project number", () => {
    const source = defaultData();
    source.pipeline.status = "Won / In Process";
    source.pipeline.potentialFee = 90000;

    const result = duplicateProjectData(source, "26-07");

    expect(result.pipeline.status).toBe("New Lead");
    expect(result.pipeline.chances).toBe(25);
    expect(result.pipeline.potentialFee).toBe(0);
    expect(result.pipeline.projectNumber).toBe("26-07");
    expect(result.pipeline.date).toBe(new Date().toISOString().slice(0, 10));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/features/pipeline/duplicateProject.test.ts`
Expected: FAIL — `Cannot find module './duplicateProject'`.

- [ ] **Step 3: Write the implementation**

Create `src/features/pipeline/duplicateProject.ts`:

```ts
import type { ProjectData } from "../../shared/state/types";

// "Start a new project from a previous one" -- clones the reusable setup
// (team/rates/markups/service-description overrides/clarifications text)
// but clears client identity and areas, since those are specific to the
// old client, not reusable. Always produces a genuinely new, independent
// project (own pipeline entry at New Lead), not a scratch scenario
// attached to the original -- see the design spec, "Duplicate" section.
export function duplicateProjectData(source: ProjectData, projectNumber: string): ProjectData {
  const cloned: ProjectData = JSON.parse(JSON.stringify(source));
  const today = new Date().toISOString().slice(0, 10);

  cloned.info.name = "";
  cloned.info.client = "";
  cloned.info.clientCompany = "";
  cloned.info.contactPerson = "";
  cloned.info.clientAddr = "";
  cloned.info.clientCity = "";
  cloned.info.clientEmail = "";
  cloned.info.clientZip = "";
  cloned.info.description = "";
  cloned.info.proposalNumber = "";
  cloned.info.constructionBudget = "";
  cloned.info.date = today;
  cloned.info.areas = source.info.areas.map(() => ({ area: "", useType: "", sf: "", selPct: null, selSF: null }));

  cloned.pipeline = {
    status: "New Lead",
    potentialFee: 0,
    invoiced: 0,
    remaining: 0,
    chances: 25,
    date: today,
    fallbackYear: String(new Date().getFullYear()),
    lostReason: "",
    yearSplits: [],
    projectNumber,
  };

  return cloned;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/features/pipeline/duplicateProject.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/pipeline/duplicateProject.ts src/features/pipeline/duplicateProject.test.ts
git commit -m "Add pure duplicate-project logic"
```

---

## Task 6: Rewrite the state store

**Files:**
- Modify (full rewrite): `src/shared/state/store.tsx`
- Modify: `src/shared/lib/constants.ts` (remove now-unused `OppProject`, `OPP_SEED`)

**Interfaces:**
- Consumes: `migrateToUnifiedStore`, `OldStore`, `OldOppState` (Task 4); `duplicateProjectData` (Task 5); `deepMerge` (Task 3); `PipelineData` (Task 2).
- Produces (new `AppContextShape`):
  - `state: { store: Store; view: "pipeline" | "project" | "settings"; projectTab: 1 | 2 | 3 | 7; savedAt: number | null }`
  - `currentProject: ProjectRecord`
  - `upd(fn: (data: ProjectData, store: Store) => void): void` — unchanged signature/behavior
  - `updStore(fn: (store: Store) => void): void` — unchanged signature/behavior
  - `goToPipeline(): void`
  - `goToSettings(): void`
  - `openProject(id: string, tab?: 1 | 2 | 3 | 7): void`
  - `setProjectTab(tab: 1 | 2 | 3 | 7): void`
  - `addProject(): void`
  - `duplicateProject(sourceId: string): void`
  - `removeProject(id: string): void`
  - `updateProjectPipeline(id: string, field: keyof PipelineData, value: unknown): void`
  - `addProjectSplit(id: string): void`
  - `removeProjectSplit(id: string, index: number): void`
  - `updateProjectSplit(id: string, index: number, field: "year" | "invoiced", value: string | number): void`
  - `setPendingTarget(value: number): void`
  - `setPipelineYear(year: string): void`

This is the largest task in the plan — it's one coherent rewrite (a reviewer can't sensibly approve half of it), so it's one task, but every piece of logic is a direct, traceable replacement of something that exists today. Cross-reference: old `updateOppProject`/`openOrCreateOppProject`/`addOppSplit`/etc. in the *current* `store.tsx` (read before this task) for the business rules being preserved (the chances/status coupling, the split defaulting logic).

- [ ] **Step 1: Remove unused constants**

In `src/shared/lib/constants.ts`, delete the `OppProject` interface (current lines 77-92) and the `OPP_SEED` constant (current lines 94-100). Keep everything else (`STATUS_OPTIONS`, `migrateOppStatus`, `GO_Q`, `PHASES`, `USE_TYPES`, `BENCH`, `FRAMEWORKS`) unchanged.

- [ ] **Step 2: Replace the entire contents of `store.tsx`**

```tsx
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
        localStorage.setItem(MIGRATION_FLAG_KEY, MIGRATION_FLAG_VALUE);
      } catch {
        /* storage unavailable */
      }
    } else {
      store = freshStore();
    }
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
  currentProject: ProjectRecord;
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
```

- [ ] **Step 3: Manual verification**

Since this file has no automated test coverage of its own (it's React state wiring, not pure logic — see Global Constraints), verify by hand once the implementer has Node available:
1. `npm run build` compiles with no TypeScript errors (this alone catches most wiring mistakes — every consumer of the old `opp`/`setTab`/`addOppProject`-style API will fail to compile until Task 7-10 are also done, which is expected and fine to see fail here).
2. Do not attempt to run this in the browser yet — App.tsx (Task 8) and Sidebar.tsx (Task 9) still reference the old `state.tab`/`setTab` API and won't compile until those tasks land. Full manual verification happens at the end of Task 10.

- [ ] **Step 4: Commit**

```bash
git add src/shared/state/store.tsx src/shared/lib/constants.ts
git commit -m "Rewrite state store: unified project/pipeline model, view-based navigation"
```

---

## Task 7: Rewrite `usePipeline.ts`

**Files:**
- Modify (full rewrite): `src/features/pipeline/usePipeline.ts`

**Interfaces:**
- Consumes: everything from Task 6's `useAppState()` (`updateProjectPipeline`, `addProjectSplit`, `removeProjectSplit`, `updateProjectSplit`, `addProject`, `duplicateProject`, `removeProject`, `openProject`, `setPendingTarget`, `setPipelineYear`). `computeFeeCalc`, `computeAreaCalc` (unchanged). `oppFmtMoney`, `oppParseMoney`, `oppEffectiveYear`, `oppInvoicedInYear` from `../../shared/lib/oppHelpers` (unchanged — these operate on plain `{date, fallbackYear, yearSplits}`-shaped data, which `PipelineData` still provides).
- Produces: same shape as today's `usePipeline()` return value, with two changes: each `oppRows`/board-card entry gains `onDuplicate: () => void`, and `hasProject` is removed from both (every row is now always a real project — there's no more "opportunity without a linked project" state to gate on). `onOppAddProject` keeps its existing name so `PipelineTab.tsx` (Task 8) doesn't need that call site touched.

Read the *current* `src/features/pipeline/usePipeline.ts` before starting — every field this rewrite produces must match what `PipelineTab.tsx` (Task 8) expects to consume; the field names below are chosen to match what's already read there wherever unchanged.

- [ ] **Step 1: Replace the entire file**

```ts
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
```

Note: `updClientById`/`updProjectNameById` are plain top-level functions, not nested in the hook body — `useAppState()` must only be called once per hook, at the top (already satisfied by the single destructuring above, which includes `updStore`).

- [ ] **Step 2: Manual verification**

`npm run build` — this file plus Task 6 should now compile together without error (Task 8/9 still pending, so App.tsx/Sidebar.tsx errors are expected until those land).

- [ ] **Step 3: Commit**

```bash
git add src/features/pipeline/usePipeline.ts
git commit -m "Rewrite usePipeline to read the unified project list"
```

---

## Task 8: Add Duplicate action to PipelineTab UI

**Files:**
- Modify: `src/features/pipeline/PipelineTab.tsx`

**Interfaces:**
- Consumes: `p.oppRows[i].onDuplicate`, `p.oppBoardColumns[i].cards[j].onDuplicate` (Task 7).

- [ ] **Step 1: Add the list-view Duplicate button**

Find the row actions block in the list view (currently around the OPEN/Remove buttons — search for `onClick={r.onOpenProject}` and `onClick={r.onRemove}`). Add a Duplicate button between them:

```tsx
<button
  onClick={r.onOpenProject}
  title="Open project"
  className="px-2 py-[5px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700"
>
  OPEN
</button>
<button
  onClick={r.onDuplicate}
  title="Start a new project from this one's setup"
  className="px-2 py-[5px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700"
>
  DUPLICATE
</button>
<button
  onClick={r.onRemove}
  title="Remove"
  className="px-2 py-[5px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700"
>
  ×
</button>
```

Remove the `{r.hasProject && (...)}` conditional wrapper that was around the old OPEN button (every row now always has a real project — `hasProject` no longer exists on the row object per Task 7's rewrite), so OPEN and DUPLICATE always render.

- [ ] **Step 2: Add the board-view Duplicate action**

In the board/card view, find where each card renders (search for `card.onOpenProject`). Add a small duplicate control — since cards are draggable and already handle `onClick={card.onOpenProject}` at the card level, put Duplicate as a small button in the card's fee/chances row so it doesn't conflict with the card's own click-to-open and drag handlers:

```tsx
<div className="flex justify-between items-center mt-[6px]">
  <span className="font-bold text-[11px] text-os-ink">{card.fee}</span>
  <span className="text-os-500 font-medium text-[11px]">{card.chances}%</span>
</div>
<button
  onClick={(e) => { e.stopPropagation(); card.onDuplicate(); }}
  title="Start a new project from this one's setup"
  className="mt-[6px] w-full px-2 py-1 border border-os-300 bg-white text-os-600 font-bold text-[9px] tracking-[.05em] rounded-full hover:border-os-orange hover:text-os-orange-700"
>
  DUPLICATE
</button>
```

(This replaces whatever the fee/chances row currently looks like on the card — check the existing card markup before editing so the fee/chances line's exact classes are preserved, only the new button is additive.)

- [ ] **Step 3: Manual verification**

Deferred to Task 10's full walkthrough (this file still depends on Task 9's App.tsx/Sidebar.tsx changes to render inside a working shell).

- [ ] **Step 4: Commit**

```bash
git add src/features/pipeline/PipelineTab.tsx
git commit -m "Add per-row Duplicate action to Pipeline list and board views"
```

---

## Task 9: Rewrite App.tsx and Sidebar.tsx for view-based navigation

**Files:**
- Modify (full rewrite): `src/app/App.tsx`
- Modify (full rewrite): `src/app/Sidebar.tsx`

**Interfaces:**
- Consumes: `state.view`, `state.projectTab`, `goToPipeline`, `goToSettings`, `openProject`, `setProjectTab` (Task 6).

- [ ] **Step 1: Replace `App.tsx`**

```tsx
import { useEffect, useState } from "react";
import { AppStateProvider, useAppState } from "../shared/state/store";
import { Sidebar } from "./Sidebar";
import { ProjectInfoTab } from "../features/project-info/ProjectInfoTab";
import { FeeCalculationTab } from "../features/fee-calculation/FeeCalculationTab";
import { ProjectScheduleTab } from "../features/project-schedule/ProjectScheduleTab";
import { SettingsTab } from "../features/settings/SettingsTab";
import { PipelineTab } from "../features/pipeline/PipelineTab";
import { ProposalBuilderTab } from "../features/proposal-builder/ProposalBuilderTab";

// Pipeline is the app's home screen; opening a project switches to its
// four-tab workspace; Settings is reachable from either. See the Pipeline
// Unification design spec, "Navigation & screens". No URL routing --
// navigation is state-only (unchanged prior decision).

function Splash() {
  return (
    <div className="fixed inset-0 z-[999] bg-os-charcoal flex items-center justify-center pointer-events-none animate-osSplashOut">
      <div className="flex items-center gap-4">
        <div className="h-14 flex-none animate-osSymbolPulse">
          <img src="/assets/logo-symbol-white.png" alt="" className="h-14 w-auto block" />
        </div>
        <div className="flex flex-col items-start gap-[5px]">
          <div className="font-bold text-[34px] leading-none font-display tracking-[.02em] text-white">MAESTRO</div>
          <div className="font-bold text-[10px] font-sans tracking-[.22em] uppercase text-os-orange-300">by Ossa Studio</div>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { state } = useAppState();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1600);
    return () => clearTimeout(t);
  }, []);

  const projectTabVisible = state.view === "project";

  return (
    <>
      {showSplash && <Splash />}
      <div className="flex min-h-screen items-stretch max-md:block">
        <Sidebar />
        <main className="flex-1 min-w-0 px-11 pt-[34px] pb-[90px] max-w-[1280px] max-md:px-4 max-md:pt-5 max-md:pb-[60px]">
          <div style={{ display: state.view === "pipeline" ? "block" : "none" }}>
            <PipelineTab />
          </div>
          <div style={{ display: state.view === "settings" ? "block" : "none" }}>
            <SettingsTab />
          </div>
          <div style={{ display: projectTabVisible && state.projectTab === 1 ? "block" : "none" }}>
            <ProjectInfoTab />
          </div>
          <div style={{ display: projectTabVisible && state.projectTab === 2 ? "block" : "none" }}>
            <FeeCalculationTab />
          </div>
          <div style={{ display: projectTabVisible && state.projectTab === 3 ? "block" : "none" }}>
            <ProjectScheduleTab />
          </div>
          <div style={{ display: projectTabVisible && state.projectTab === 7 ? "block" : "none" }}>
            <ProposalBuilderTab />
          </div>
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
```

- [ ] **Step 2: Replace `Sidebar.tsx`**

```tsx
import React from "react";
import { useAppState } from "../shared/state/store";
import type { ProjectTab } from "../shared/state/store";

// Sidebar content depends on where you are: on Pipeline, no project tabs
// show; inside a project, a "← Pipeline" breadcrumb replaces the old
// always-visible project dropdown + NEW/COPY/DEL row. Settings is always
// reachable regardless of context. See the Pipeline Unification design
// spec, "Navigation & screens" and "Project creation & duplication".

const PROJECT_NAV_ITEMS: { tab: ProjectTab; label: string; icon: React.ReactNode }[] = [
  {
    tab: 1,
    label: "Project Information",
    icon: (
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />
    ),
  },
  {
    tab: 2,
    label: "Fee Calculation",
    icon: (
      <path d="M4 2h16v20H4z M8 6h8 M16 14v4 M12 10h.01 M8 10h.01 M12 14h.01 M8 14h.01 M12 18h.01 M8 18h.01" />
    ),
  },
  {
    tab: 3,
    label: "Project Schedule",
    icon: <path d="M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18" />,
  },
  {
    tab: 7,
    label: "Proposal Builder",
    icon: <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />,
  },
];

function SettingsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PipelineIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      <path d="M23 6 13.5 15.5 8.5 10.5 1 18 M17 6h6v6" />
    </svg>
  );
}

export function Sidebar() {
  const { state, goToPipeline, goToSettings, setProjectTab } = useAppState();
  const { store, view, projectTab } = state;
  const currentProject = store.projects[store.currentId];

  const savedAt = state.savedAt || currentProject?.updated || Date.now();
  const savedLabel =
    "Saved " + new Date(savedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <aside className="w-[236px] flex-none bg-os-charcoal text-white flex flex-col sticky top-4 h-[calc(100vh-32px)] my-4 ml-4 rounded-brand-xl shadow-glass border border-white/[.08] overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        <div className="px-[18px] pt-5 pb-[14px] border-b border-white/[.12] flex items-center gap-[10px]">
          <img src="/assets/logo-symbol-white.png" alt="Maestro" className="w-7 h-auto flex-none" />
          <div>
            <div className="font-bold text-lg leading-none font-display tracking-[.02em] text-white">MAESTRO</div>
            <div className="mt-1 font-bold text-[8.5px] tracking-[.2em] text-os-orange-300 uppercase">by Ossa Studio</div>
          </div>
        </div>

        {view === "project" ? (
          <>
            <button
              onClick={goToPipeline}
              className="flex items-center gap-2 mx-[10px] mt-[14px] mb-2 px-[14px] py-2 text-left rounded-full cursor-pointer font-medium text-[12.5px] text-white/70 hover:bg-white/[.08] hover:text-white"
            >
              <span aria-hidden="true">←</span>
              <span>Pipeline</span>
            </button>
            <div className="px-4 pt-1 pb-2 font-bold text-[11px] text-white truncate" title={currentProject?.data.info.name || "Untitled Project"}>
              {currentProject?.data.info.name || "Untitled Project"}
            </div>
            <div className="px-4 pb-2 font-bold text-[9.5px] tracking-[.18em] uppercase text-white/45">Navigate</div>
            <nav className="flex flex-col pb-4">
              {PROJECT_NAV_ITEMS.map((item) => {
                const active = projectTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => setProjectTab(item.tab)}
                    className={`flex items-center gap-[11px] w-[calc(100%-20px)] mx-[10px] my-[2px] text-left px-[14px] py-[9px] border-0 rounded-full cursor-pointer font-medium text-[13px] ${
                      active ? "bg-grad-accent text-white shadow-[0_2px_10px_rgba(235,91,40,.35)]" : "bg-transparent text-white/70 hover:bg-white/[.08] hover:text-white"
                    }`}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                      {item.icon}
                    </svg>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </>
        ) : (
          <nav className="flex flex-col pt-[14px] pb-4">
            <button
              onClick={goToPipeline}
              className={`flex items-center gap-[11px] w-[calc(100%-20px)] mx-[10px] my-[2px] text-left px-[14px] py-[9px] border-0 rounded-full cursor-pointer font-medium text-[13px] ${
                view === "pipeline" ? "bg-grad-accent text-white shadow-[0_2px_10px_rgba(235,91,40,.35)]" : "bg-transparent text-white/70 hover:bg-white/[.08] hover:text-white"
              }`}
            >
              <PipelineIcon />
              <span>Pipeline</span>
            </button>
          </nav>
        )}
      </div>

      <div className="border-t border-white/[.12]">
        <button
          onClick={goToSettings}
          className={`flex items-center gap-[11px] w-[calc(100%-20px)] mx-[10px] mt-[10px] text-left px-[14px] py-[9px] border-0 rounded-full cursor-pointer font-medium text-[13px] ${
            view === "settings" ? "bg-grad-accent text-white shadow-[0_2px_10px_rgba(235,91,40,.35)]" : "bg-transparent text-white/70 hover:bg-white/[.08] hover:text-white"
          }`}
        >
          <SettingsIcon />
          <span>Settings</span>
        </button>
        <div className="px-4 pt-[10px] pb-[18px]">
          <div className="font-medium text-[10px] text-white/55 leading-[1.6]">
            {savedLabel}
            <br />
            Data is saved automatically in this browser.
          </div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Manual verification**

`npm run build` — the whole app should now compile with no TypeScript errors. This is the first point in the plan where a full clean build is expected.

- [ ] **Step 4: Commit**

```bash
git add src/app/App.tsx src/app/Sidebar.tsx
git commit -m "View-based navigation: Pipeline as home, breadcrumb into project workspace"
```

---

## Task 10: Update the status pill to read `pipeline.status`

**Files:**
- Modify: `src/features/project-info/useProjectInfo.ts`

**Interfaces:**
- Consumes: `currentProject.data.pipeline.status` (was `info.outcome`).

- [ ] **Step 1: Update the status pill source**

In `src/features/project-info/useProjectInfo.ts`, find:

```ts
  const projectStatusLabel = info.outcome || "New Lead";
```

Replace with:

```ts
  const projectStatusLabel = data.pipeline.status || "New Lead";
```

This requires `data` (the full `ProjectData`, not just `info`) to be in scope at that point in the file — check how `info` itself is obtained near the top of the hook (likely `const { currentProject } = useAppState(); const { info, ... } = currentProject.data;`) and either destructure `pipeline` alongside `info` from `currentProject.data`, or reference `currentProject.data.pipeline.status` directly if `data` isn't already a convenient local name. Use whichever matches the existing destructuring style in this file.

- [ ] **Step 2: Full manual verification walkthrough**

With Node available, run `npm install && npm run dev` and click through:

1. App loads directly to the Pipeline screen (no splash-then-project-tab).
2. Pipeline shows the existing project(s) with correct status/fee/win% — data survived the migration (check against what was visible in Pipeline/Project Information before this change, if there was existing localStorage data).
3. Click "+ Add Opportunity" (or whatever the button is currently labeled) → lands in a brand-new project's Project Information tab, sidebar shows "← Pipeline" breadcrumb + the four project tabs.
4. Fill in a project name/client, click "← Pipeline" → back on Pipeline, the new project appears with the name/client just entered.
5. Click DUPLICATE on a project with custom team rates (Settings tab shows non-default rates) → new project opens with those same rates, but blank client/name/areas, status "New Lead".
6. Click Settings from Pipeline → Settings tab renders with no "← Pipeline" breadcrumb complication; click Settings again from inside a project workspace → same result, still reachable.
7. Click × (Remove) on a project → confirm dialog → project disappears from Pipeline; if that project was open when removed, view returns to Pipeline (not a broken empty project workspace).
8. Remove every project until zero remain → Pipeline shows its empty-state messaging, no crash.
9. Drag a card between board-view columns → status updates (check by switching back to list view).
10. Project Information tab's status pill (top-right of the page) matches the status shown for that project on Pipeline.

Note any failures found during this walkthrough as follow-up fixes — do not mark this step done until all ten checks pass.

- [ ] **Step 3: Final cross-check**

Run: `grep -rn "info\.outcome\|state\.opp\|OppProject\|OPP_SEED\|setTab\b" src/`
Expected: no matches. If any remain, they're leftover references to the old model that were missed — fix them before considering this plan complete.

- [ ] **Step 4: Commit**

```bash
git add src/features/project-info/useProjectInfo.ts
git commit -m "Read pipeline.status for the project status pill; remove last info.outcome reference"
```
