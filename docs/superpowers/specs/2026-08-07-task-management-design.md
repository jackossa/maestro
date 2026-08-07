# Task Management Module — Design Spec

## Motivation

Maestro currently has no task-tracking surface. This adds a dense,
Asana-inspired Task Management module: Projects (task containers, private or
shared with the team), Tasks with one level of subtasks, List and Board
views with drag-and-drop, a right-side task detail drawer, and a My Tasks
cross-project view. The brief driving this spec is reproduced in full in
`docs/superpowers/plans/2026-08-07-task-management.md` once written; this
document captures the architecture and scope decisions made before planning.

## Scope decisions

Two architectural questions were resolved before design, both confirmed
with the user:

1. **Backend.** Maestro has zero backend today — the existing app (Fee
   Proposal projects, settings, pipeline) is 100% `localStorage`, single
   browser, single user. The new module's own spec requires shared projects
   visible to teammates and cross-user task assignment, which cannot work
   on `localStorage` alone. Decision: add **Firestore**, scoped
   *only* to this module. Firebase is already integrated for
   authentication, so this is an extension, not a new integration. The
   existing Fee Proposal data model and its `localStorage` persistence are
   completely untouched.
2. **Project model.** Maestro already has a "Project" concept (architecture
   fee-proposal engagements — client, fee calc, schedule, pipeline). The
   Task module's "Project" (id/name/createdBy/isShared/members) is a
   different concept with a different purpose. Decision: **standalone
   Task Project entity**, unrelated to Fee Proposal projects. No shared
   fields, no cross-references.

Everything else in this document follows from those two decisions.

## Architecture

### New Firestore collections

Existing Fee Proposal data is unaffected — nothing about the current app's
persistence changes. Three new collections:

- **`users/{uid}`** — `{ displayName, email, photoURL, lastSeenAt }`.
  Auto-upserted every time someone signs in, by extending the existing
  `AuthProvider` (`src/shared/state/auth.tsx`) with a Firestore write in the
  `onAuthStateChanged` success path. This collection *is* the team roster —
  there is no manual invite step; it fills in as people use the app. Only
  `@ossastudio.com` accounts can ever sign in (existing Workspace-domain
  restriction), so this roster is inherently scoped to the firm.
- **`taskProjects/{projectId}`** — `{ name, createdBy, createdByName,
  isShared, members, createdAt, updatedAt }`. `members` is a `string[]` of
  uids, auto-derived (creator + everyone ever assigned a task in that
  project) — never manually managed.
- **`taskProjects/{projectId}/tasks/{taskId}`** (subcollection) — `{
  parentTaskId, title, description, assigneeId, assigneeName, dueDate,
  status, completed, sortOrder, createdAt, updatedAt, createdBy,
  projectIsShared, projectMembers, projectName }`. The last three fields are
  denormalized copies of the parent project's `isShared`/`members`/`name` —
  this lets the My Tasks screen run a single Firestore **collection-group
  query** (`collectionGroup("tasks").where("assigneeId", "==", uid)`)
  across every project without a second read per task, and lets security
  rules evaluate visibility without an extra `get()`.

### Sort order

Spaced integers, gap of 1000 between siblings (both top-level tasks within
a project and subtasks within a parent). Reordering computes the midpoint
between the two new neighbors' `sortOrder` values. This matches the spec's
explicit instruction not to overengineer ordering — no fractional-indexing
library, no operational-transform.

### Real-time sync

The active project (List or Board) and the My Tasks screen use Firestore
`onSnapshot` listeners, not one-time fetches. This is what makes shared
projects update live across teammates and makes "refresh the page and
retain manual order" (acceptance criterion 13) trivially correct — order
lives in Firestore, not local state.

## Navigation & screens

Maestro has no router — navigation is pure component state via
`store.tsx`'s `view` field (`src/app/App.tsx`, `src/shared/state/store.tsx`).
The Task module follows the same convention rather than introducing
routing:

- A new top-level `View` value, `"tasks"`.
- Local state within the feature: `tasksScreen: "my-tasks" | "projects" |
  "project-detail"` and `activeTaskProjectId`.
- A new "Tasks" sidebar entry, alongside Pipeline/Settings/Account.
- List-vs-Board preference persists in `localStorage` per project (a UI
  preference, separate from the Firestore-backed task data itself), per the
  spec's "may be stored locally" note.

Screens: **Projects** (compact list), **Project Detail** (toolbar + List or
Board), **My Tasks** (grouped by Overdue / Today / Upcoming / No Due Date).
The **Task Detail Drawer** overlays Project Detail or My Tasks without
navigating away.

## Permissions & sharing

- `isShared` is a single boolean, not a per-person invite list — the
  spec explicitly asks to keep permissions simple. Shared = visible to any
  signed-in `@ossastudio.com` teammate. Private = visible only to
  `createdBy`.
- Firestore security rules: a `taskProjects` doc is readable/writable if
  `request.auth.token.email` ends in the Workspace domain **and**
  (`isShared == true` **or** `createdBy == request.auth.uid`). Tasks under
  a project inherit the same check via their denormalized
  `projectIsShared`/`projectMembers` fields, so collection-group queries
  and per-document rule checks don't need an extra read to the parent.
- Assignee picker: in a Private project, defaults to "me" only (nobody else
  can see the project, so assigning to someone else would be silently
  useless); in a Shared project, the full roster from `users/`.
- No roles, no per-person invite UI, exactly as spec'd.

## UI / component plan

All new components reuse the existing Tailwind design tokens exactly —
`os-ink`, `os-orange` (+ shades), `rounded-brand-sm`/`brand-md`/`brand-lg`,
`shadow-glass`/`shadow-sm`, `duration-fast` (150ms) motion, and the "cream"
input convention from `src/shared/components/inputs.tsx`
(`bg-[#fdf4e3] border-os-300 rounded-brand-sm`). No new design system.

No dropdown/modal/drawer/toast primitive exists anywhere in the codebase
today. New, minimal versions get built, following the one existing pattern
in the app (`ProfileMenu.tsx`'s outside-click + Escape-key popover) rather
than inventing a new convention:

- **`Popover`** (`src/shared/components/Popover.tsx`) — generic
  positioned panel + outside-click/Escape dismissal, used for the
  assignee picker, status picker, and filter dropdowns.
- **`Drawer`** (`src/shared/components/Drawer.tsx`) — slide-in panel from
  the right, 380–480px desktop / full-screen on small viewports, Escape
  closes, used for Task Detail.
- **`Toast`** (`src/shared/components/Toast.tsx`) — minimal
  bottom-corner message with auto-dismiss, used for optimistic-update
  rollback errors (failed create/reorder/assign/complete/delete).

Date fields reuse the native `<input type="date">` already used throughout
the app (Pipeline's date column) — no custom date-picker widget, matching
existing convention. Avatars reuse `ProfileMenu`'s exact initial-letter
pattern (28px circle, `bg-grad-accent` fallback, first-letter of
`displayName`/`email`). List rows and Board columns visually mirror
Pipeline's existing patterns — flex rows with `flex-none` fixed/percentage
cell widths (the overlap bug just fixed in Pipeline's own table is the
reason every new flex cell here gets `flex-none` from the start, not
retrofitted later).

**Drag-and-drop**: adds `@dnd-kit/core` + `@dnd-kit/sortable` — no DnD
library exists today (Pipeline's board uses raw HTML5 drag events, which
don't give a thin insertion indicator or keyboard reordering). This
matches the spec's explicit fallback instruction. Used for: List view
vertical reordering (tasks and, within a parent, subtasks), and Board view
reordering + cross-column dragging.

Empty and loading states reuse Pipeline's existing plain-text empty-state
style (`No opportunities match this filter.` pattern) and skeleton rows
sized to the real row height — no spinners, no illustrations.

## Screens in detail

### Projects screen

Compact rows (not cards): project name, owner, private/shared indicator
(small pill/icon), open-task count, nearest upcoming due date. Row actions:
open, toggle private/shared (owner only), delete (owner only, confirms
first via a native `confirm()` since it's an unrecoverable action — no
custom modal needed for a single yes/no gate). Deleting a project cascades:
all of its tasks (and their subtasks) are deleted with it, via a Firestore
batch delete on the subcollection. A `+ New Project` control opens inline
creation (name field, Enter to create) — no modal.

### Project Detail screen

Toolbar (48–56px): project name (owner can rename inline) + Share with
Team toggle on the left/right split; List/Board segmented toggle,
Owner/Due Date/Status filter dropdowns, and `+ Add Task` on the second
row/right side. All filters are compact dropdowns from the toolbar — no
permanent sidebar.

**List view** (default): flex rows, 44–52px per top-level task, 36–44px
per subtask. Each row: circular completion checkbox, drag handle, title
(inline-editable — click to edit, Enter saves, Escape cancels), assignee
avatar (click opens the assignee `Popover`), due date (click opens native
date input), expand/collapse chevron if the task has subtasks, overflow
menu (⋮) revealed on hover. Subtask rows indent and use the same pattern
at the smaller row height. `+ Add Task` inserts a new editable row at the
bottom of the list with the title field autofocused; `+ Add subtask`
inside an expanded parent does the same, indented.

**Board view**: three columns (To Do / In Progress / Complete), gap
12–16px, compact cards (10–12px padding) showing title, assignee avatar +
name, due date, and a subtask-count badge if the task has subtasks. Cards
are draggable within and across columns. Dropping into a column sets
`status`/`completed` per the spec's exact mapping (To Do →
`status: "todo", completed: false`; In Progress → `status: "in_progress",
completed: false`; Complete → `status: "complete", completed: true`).
Column-scoped `sortOrder` persists independently of the List view's
project-wide order — a task's position in Board reflects its status
column, not its List position.

### Task Detail Drawer

380–480px on desktop, full-screen under the responsive breakpoint. Content
top to bottom: title (inline-editable), completion checkbox, assignee
picker, due date, status picker, description textarea, subtasks list (each
with its own checkbox, inline-editable title, `+ Add subtask` row), Delete
Task (confirms first). Clicking a different task row while the drawer is
open swaps its contents without closing/reopening — "fast switching
between tasks" per the spec.

### My Tasks screen

Every task across every project where `assigneeId == currentUser.uid`,
via the collection-group query described above. Grouped by Overdue /
Today / Upcoming / No Due Date, each task row shows title, project name,
due date. Same compact row height as Project Detail's List view.

## Filters

Owner (= assignee — the spec's toolbar filter maps to the `assigneeId`
field, there is no separate task-owner concept), Due Date (Any / Overdue /
Today / This week / This month / Custom range), Status. All three are
compact `Popover`-based dropdowns in the toolbar, applied client-side to
the already-loaded (via `onSnapshot`) task list — no extra Firestore
queries per filter change. Created-date filtering is **not** added: nothing
in the existing Maestro product filters by created date today, and the
spec says to add it only if that convention already exists.

## Overdue treatment

A task is overdue if `dueDate < today` and not completed. Rendered with a
subtle warning treatment on the date text only (e.g. `text-os-orange-700`
or a small warning-color dot) — never a fully red row, per the spec.

## Error handling

Every mutation (create, reorder, assign, complete, delete) applies
optimistically to local component/listener state first, then writes to
Firestore. If the write rejects, the optimistic change is rolled back and
the new `Toast` component shows a short error message. This mirrors the
spec's explicit requirement and is standard practice for `onSnapshot`-backed
UIs — the listener itself will also correct any drift once the rejected
write is confirmed not to have landed.

## Performance & accessibility

- Task rows are extracted as memoized components (`React.memo`) keyed by
  task id, so dragging or editing one row doesn't re-render the other 100+.
- `@dnd-kit` provides keyboard-based reordering out of the box (arrow keys
  + space to pick up/drop) — wired through, not disabled.
- All interactive elements are real `<button>`/`<input>`/`<select>`
  elements with visible focus states (matching the existing app's
  `focus:ring-2 focus:ring-os-orange-300` convention), accessible labels
  on checkboxes and dropdowns, Escape closes the drawer and any open
  popover, Enter saves inline edits.

## Responsive behavior

Desktop is the priority, per the spec. Under the small-viewport breakpoint
already used elsewhere in the app (`max-md:`): List view hides the
project/assignee columns where space is tight, keeping checkbox, title,
and due date visible; the Task Detail Drawer becomes full-screen instead
of a 380–480px side panel.

## Out of scope (V1)

Exactly the spec's exclusion list: comments, attachments, dependencies,
recurring tasks, custom fields, priorities, tags, timeline/Gantt, workload,
dashboards, automations, advanced permissions/roles, activity logs, email
notifications, complex task templates, notification infrastructure of any
kind.

## Firestore project setup

Firestore must be enabled on the existing `maestro-c6d96` Firebase project
(Firebase Authentication is already live there). This is an operational
step (enabling the Firestore API, writing and deploying security rules,
no new Google Cloud OAuth configuration needed since auth already works) —
handled the same way the original Firebase Authentication setup was: a
live, human-supervised setup task once the implementation is code-complete
and ready to connect to a real Firestore instance, following the same
no-Node.js-environment constraint as the rest of this project (code and
security rules written and reviewed carefully, verified live in the
browser and via the Firebase Console rather than a local emulator).

## Verification

Consistent with this whole project's established approach (no Node.js in
this environment): all code and Firestore security rules are written and
reviewed carefully by hand, with explicit "written but not run" reporting
at every implementation and review stage. Real verification happens via
Vercel's Preview build (must succeed cleanly) and live manual browser
testing against the real Firestore instance once it's provisioned,
covering the 20 acceptance criteria from the original brief.
