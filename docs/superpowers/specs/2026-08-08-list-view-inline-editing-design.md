# List View Inline Editing + Tasks Tab Order — Design Spec

## Motivation

Editing a task's due date or status currently requires opening the Task
Detail Drawer — there's no way to do either from a list row, in either
Project Detail's main List view or the Projects screen's accordion
preview (which the immediately-preceding spec deliberately scoped to
view-only). This adds inline editing for both fields to both list
surfaces, and separately fixes two small navigation defaults: the
Projects/My Tasks tab order, and which one loads first.

## Scope decisions

- **Both list surfaces get inline editing**, not just Project Detail's
  main List view: `TaskRow` (Project Detail List view + My Tasks) and
  `ProjectPreviewTaskRow` (the Projects-screen accordion). This is a
  deliberate reversal of the accordion spec's "view-only" interaction
  level for these two fields specifically — see that spec's updated
  "Interaction level" bullet, which now points here.
- **Title editing and assignee reassignment are unaffected.** `TaskRow`
  keeps its existing inline title edit and interactive `AssigneePicker`.
  `ProjectPreviewTaskRow` still has neither — this request was scoped to
  due date and status only.
- **Semantics mirror the Task Detail Drawer exactly**, so a change from a
  list row and a change from the drawer never disagree:
  - Due date: `updateTask(projectId, id, { dueDate: value || null })`.
  - Status: `updateTask(projectId, id, { status, completed: status === "complete" })`
    — picking any status also derives `completed`, the same as the
    drawer's own `<select>` already does. There is no separate "just
    change status, leave completed alone" path; the drawer doesn't have
    one either.
- **Status styling has one source of truth.** `STATUS_LABEL`/
  `STATUS_CLASS` move out of `ProjectPreviewTaskRow.tsx` into a new
  shared module, since `TaskRow` now needs the identical mapping and two
  copies would be the same duplication risk the accordion's final review
  already flagged once for a different pair of components.
- **Tab order and default screen** (independent of the above): Projects
  renders before My Tasks in the tab bar, and Projects is now the default
  screen on entering the Tasks module, replacing My Tasks in both spots.

## UI & interaction plan

**Due date**, in both row components: the plain-text due-date display is
replaced with a native `<input type="date">`, compact enough to fit the
existing column width — the same input type the drawer already uses,
just inline in the row instead of in the drawer's own labeled field.

**Status**, in both row components: replaced with a native `<select>`,
still styled via `STATUS_CLASS` so it keeps the pill look the accordion
already established (`TaskRow` gains this look for the first time — it
shows no status indicator today). Options: Todo / In Progress / Complete,
labeled via the shared `STATUS_LABEL`.

**Call sites needing new handlers** (all follow the exact
`useCallback`-per-action pattern already used for `onToggleComplete` in
each of these files, so `memo(TaskRow)`/`memo(ProjectPreviewTaskRow)`
keeps working):

- `TaskListView.tsx` — `handleDueDateChange`/`handleStatusChange`, same
  shape as its existing `handleToggleComplete`.
- `MyTasksScreen.tsx` — same two handlers; since My Tasks spans multiple
  projects, they look the task up by id (`tasks.find(...)`) to get its
  `projectId`, exactly like its existing handlers already do.
- `ProjectAccordionTasks.tsx` — same two handlers, calling `updateTask`
  directly with the `projectId` it already has in scope.

## Out of scope

- Inline title editing or assignee reassignment in the accordion (not
  asked for; the accordion's other interaction restrictions are
  unchanged).
- Any change to the Task Detail Drawer itself — it already has both
  controls; this spec only adds them elsewhere.
- Bulk edit (selecting multiple rows and changing status/due date at
  once).
