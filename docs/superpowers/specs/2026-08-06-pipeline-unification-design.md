# Pipeline Unification & Navigation Redesign

**Date:** 2026-08-06
**Status:** Approved, ready for implementation plan

## Motivation

Two problems drove this:

1. Creating a project doesn't create a Pipeline entry, and vice versa only
   partially (a Pipeline opportunity only gets a linked project once its
   status is set to "Write Proposal"). The two are meant to represent the
   same thing but drift apart.
2. The app has no real landing screen — it opens directly into whatever
   project was last active, with no overview of the firm's actual pipeline
   of work.

## Data model

Collapse `store.projects` (project records) and `opp.projects`
(`OppProject`, currently a separate list persisted under the
`ossaOpportunities.v1` localStorage key) into one record. Every project
carries its own CRM fields directly.

**Add a new `pipeline` object to `ProjectData`** (alongside the existing
`info`/`calc`/`schedule`/`packages`/`proposal`/`settings`):

```ts
interface PipelineData {
  status: string;           // was OppProject.status; replaces ProjectInfo.outcome
  potentialFee: number;
  invoiced: number;
  remaining: number;
  chances: number;          // win %
  date: string;              // opportunity date (distinct from info.date)
  fallbackYear: string;      // used when date is empty, for year attribution
  lostReason: string;
  yearSplits: { year: string; invoiced: number }[];
  projectNumber: string;
}
```

**Removed fields:**
- `ProjectInfo.outcome` — replaced by `pipeline.status`. Every place that
  reads `info.outcome` today (the status pill on Project Information,
  `oppStatusColor` lookups) reads `pipeline.status` instead.
- `OppProject._id` — the project's own key in `store.projects`/`store.order`
  is already a unique identifier; no second ID needed.
- `OppProject.projectId` — was the link between an opportunity and its
  project. With one record, there's nothing to link.

**Removed entirely:**
- The `opp` state slice in `AppStateShape` (`src/shared/state/store.tsx`).
- The `ossaOpportunities.v1` localStorage key and its load/persist functions
  (`loadOpp`, `persistOpp`).
- `src/shared/lib/constants.ts`'s `OppProject` interface, `OPP_SEED`, and
  `migrateOppStatus` — folded into the unified model (see Migration below;
  `migrateOppStatus`'s old→new status renames still need to run once during
  migration, just not as a standing function).

**Kept as-is:** `STATUS_OPTIONS`, `oppStatusColor` (now keyed off
`pipeline.status`), all the Pipeline aggregate/KPI computation logic in
`usePipeline.ts` — just reading from `store.projects` directly instead of a
separate `opp.projects` array.

## Migration

Runs once, on first load after this ships, guarded the same way the
existing opportunity-seed import is guarded (a localStorage flag key so it
never re-runs and clobbers user edits):

1. For each project in the current `store.projects`: if an opportunity in
   the old `ossaOpportunities.v1` data has a matching `projectId`, merge
   that opportunity's CRM fields onto the project's new `pipeline` object.
   Otherwise, synthesize `pipeline` from what the project already has
   (`status: info.outcome`, `projectNumber` freshly assigned, everything
   else defaulted like a new project).
2. For each opportunity in the old data that has NO `projectId` (a raw lead
   never promoted to a real project): create a new minimal project record
   for it, with `pipeline` populated from the opportunity and `info.name`/
   `info.client` set from `opportunity.project`/`opportunity.client`.
3. Apply the old `migrateOppStatus` renames (`Pending`→`Pending Approval`,
   etc.) during this same pass.
4. Set the migration-done flag; delete/ignore the old `ossaOpportunities.v1`
   key going forward (no need to actively remove it from localStorage, just
   stop reading/writing it).

## Navigation & screens

**Pipeline becomes the home route.** No "current project" concept applies
here — same UI as today's Pipeline tab (KPI cards, business advice,
list/board of every project), just reading directly from the unified
project list instead of a synced-but-separate opportunity list. The app
boots to Pipeline with nothing auto-selected, replacing today's "resume
last active project" behavior.

**Opening a project** (click a row/card, or via New/Duplicate — see below)
enters that project's workspace: Project Information, Fee Calculation,
Project Schedule, Proposal Builder. Same four tabs, same content as today,
unchanged.

**Sidebar changes shape based on context:**
- On Pipeline: no project-scoped tabs shown.
- Inside a project: a "← Pipeline" breadcrumb at the top, then the four
  project tabs below it. Replaces today's always-visible project dropdown
  + NEW/COPY/DEL button row.
- **Settings** is always reachable regardless of context (e.g. a persistent
  gear icon in the sidebar's lower section) — it edits firm-wide defaults,
  not anything about a specific project, so it shouldn't appear/disappear
  based on whether a project is open.

## Project creation & duplication

**New project** — a "+ Add Opportunity" action on Pipeline (existing
button, same place) creates a blank project at "New Lead" status using
today's `defaultData()`, then opens directly into its Project Information
tab.

**Duplicate** — new per-row action on Pipeline (list view: icon button
alongside OPEN/Remove; board view: same, on the card), replacing the old
sidebar COPY button. Deep-clones `calc`, `settings`, and `proposal` from
the source project (team, rates, markups, service description overrides,
clarifications/not-included text — the reusable setup work). Clears
`info.name`, `info.client`, `info.clientCompany`, and all contact/address
fields, plus `info.areas` (a new project needs its own square footage).
Resets `pipeline.status` to "New Lead" and `pipeline.date` to today. Opens
directly into the new project's Project Information tab.

**Removed:** sidebar NEW/COPY/DEL buttons. DEL becomes the per-row "Remove"
action already present on Pipeline, now applying uniformly to every
project (not just opportunities).

## Edge cases

- **Zero projects is a valid state.** Today's guard preventing deletion of
  the last project (`store.order.length <= 1`) is removed — Pipeline can
  show its existing empty-state messaging with zero projects, since
  nothing else depends on there always being a "current" one.
- **Stale `currentId`** (pointing at a deleted/missing project) stops being
  a failure mode: `currentId` only matters while inside a project's
  workspace. Deleting a project or hitting "← Pipeline" clears it, and
  Pipeline itself never reads it.

## Out of scope

- No changes to the Project Information, Fee Calculation, Project
  Schedule, Proposal Builder, or Settings tabs' own content/logic — this is
  purely a navigation and data-model change.
- No changes to the Pipeline tab's internal computations (KPIs, business
  advice, status bar) beyond reading from the unified list.
- Copy/wording for the "+ Add Opportunity" button and the new "Duplicate"
  action's icon/label are implementation details, not fixed by this spec.

## Verification

No Node.js is available in the environment this was built in, so this
cannot be verified with a running dev server. Verification will be by
careful manual code review (structural/JSX-balance checks, cross-file
reference checks) matching the approach used for every other change in
this project. This should be flagged, not silently assumed, when
implementation completes.
