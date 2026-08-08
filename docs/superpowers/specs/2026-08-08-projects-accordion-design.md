# Projects Screen Accordion & Reordering — Design Spec

## Motivation

The Projects screen currently lists Task Projects as a flat row (name,
owner, sharing badge, delete) with no way to preview a project's tasks
without navigating into Project Detail, and no way to manually reorder
either projects or tasks from that screen. This adds an Asana-style
inline accordion — expand a project to see its top-level tasks, with due
date and status visible at a glance — plus drag-and-drop reordering for
both projects and tasks, without displacing Project Detail as the full
editing surface.

## Scope decisions

Resolved during brainstorming:

- **Project Detail stays.** The accordion is a quick preview layered on
  top of the existing Projects screen; clicking a project name still
  navigates into the full Project Detail screen exactly as it does today.
- **Top-level tasks only.** The accordion does not nest subtasks. Subtask
  management remains exclusive to Project Detail's List view, which
  already supports it.
- **Interaction level:** view, drag-reorder, and the completion checkbox.
  No inline title editing, no inline assignee reassignment, no inline
  add/delete. Clicking a task row (outside the checkbox/drag handle)
  opens Project Detail with that task's drawer already open — the same
  `pendingDrawerTaskId` mechanism `MyTasksScreen` already uses.
- **Status is a read-only pill**, not an interactive dropdown — consistent
  with due date already being plain text in this preview.
- **Project order is shared/global**, stored as `sortOrder` directly on
  the `TaskProject` document — the same pattern `Task.sortOrder` already
  uses. For a shared project, any member's reorder is visible to
  everyone who can see it, matching how task reordering already behaves.
- **Not persisted:** expand/collapse state resets to collapsed whenever
  the Projects screen remounts (navigating away and back). No
  localStorage, no Firestore field for it.
- **Out of scope:** dragging a task from one project's accordion into a
  different project (cross-project reassignment). "Up and down" reorder
  only, within a single list, matching what was asked for.

## Data model changes

`TaskProject` gains one new field:

```ts
sortOrder: number;
```

Same manual-ordering pattern as `Task.sortOrder`: assigned via the
existing `computeSortOrder(before, after)` helper, gap of 1000, on
creation and on every drag-reorder.

**Migration-free rollout:** existing projects have no `sortOrder`. The
Projects screen sorts by `sortOrder` ascending when present, falling back
to today's `updatedAt` descending for any project missing it, with
sortOrder-having projects always sorting before sortOrder-less ones. The
first drag on a legacy project assigns it a real value. No backfill
script, no batch migration.

No Firestore rules change is needed: the existing `taskProjects/{id}`
`update` rule already permits any team member who can see the project to
write fields other than `createdBy`/`isShared`, which already covers
`sortOrder` writes for both owners and shared-project teammates.

## UI & interaction plan

### Projects screen row (collapsed)

```
[⠿ drag handle] [▸/▾ triangle] [project name] [owner] [SHARED/PRIVATE] [× delete]
```

The triangle only appears interactive (clickable) — it toggles that
project's expanded state; clicking the project name still navigates into
Project Detail as today.

### Expanded state

Below the row, top-level tasks for that project render as compact
preview rows:

```
[⠿ drag handle] [checkbox] [title, plain text] [assignee avatar+name, read-only] [due date] [status pill]
```

- Clicking the row body (not the checkbox or drag handle) calls
  `onOpenTask(projectId, taskId)`, which `TasksTab` already threads
  through to open Project Detail with the drawer pre-opened — the exact
  function `MyTasksScreen`'s `onOpenTask` already uses, extended to a
  second caller.
- The checkbox toggles `completed`/`status` exactly as it does in
  Project Detail's `TaskRow`.
- Status pill: three read-only states (Todo / In Progress / Complete),
  styled with the existing `os-*` design tokens.
- **New component, not a reuse of `TaskRow`.** `TaskRow` is built for
  full editing (inline title edit on click, interactive
  `AssigneePicker`, hover-reveal open/delete buttons) — none of which
  this preview wants. A new lightweight row component keeps the same
  row height and typography for visual consistency without dragging in
  interactions this view intentionally excludes.

### Loading & empty states while expanded

- A brief skeleton (reusing the existing pulse-bar pattern, sized to a
  task row) while `useProjectTasks` resolves for that project.
- A single compact "No tasks yet" line if the project has zero tasks —
  lighter than the full dashed-border empty state used elsewhere, since
  this nests inside an already-bordered project row.

### Task fetching

Each expandable project row becomes its own small subcomponent, calling
the existing `useProjectTasks(expanded ? projectId : null)` unchanged.
Firestore listeners are only live for projects currently expanded; the
hook already clears tasks and holds no listener when passed `null`.

### Drag-and-drop (two independent scopes)

Both use dnd-kit, both reuse the sensor setup already proven necessary in
this module (`PointerSensor` with an 8px `activationConstraint` so a
plain click doesn't get eaten as a drag, plus `KeyboardSensor` for
accessibility) and the same self-drop guard (`active.id === over.id`)
that a previous review round in this project had to add after the plan's
own sample code first shipped without it.

1. **Projects**, reordering the whole Projects-screen list top to
   bottom, writing the new `TaskProject.sortOrder`.
2. **Tasks within one expanded project**, writing the *same*
   `Task.sortOrder` field Project Detail's List view already writes —
   not a second, parallel ordering field. A reorder from either surface
   is immediately visible in the other via the existing `onSnapshot`
   listener, since both read the same field.

If two or more projects are expanded at once, each gets its own
`DndContext`/`SortableContext` pair scoped to just that project's task
list — mirroring how `TaskListView` already nests a separate `DndContext`
per parent task's subtask list. A single shared context spanning
multiple expanded projects' tasks would let a drag started in one
project's list resolve against another project's `SortableContext`
items, which is exactly the cross-project reassignment this spec rules
out — so the scoping isn't optional polish, it's what keeps that out of
reach structurally rather than by convention.

## Out of scope for this change

- Subtask preview/reorder inside the accordion (Project Detail only).
- Cross-project drag (moving a task to a different project).
- Interactive status change from the preview row (open the task instead).
- Persisting expand/collapse state across navigation.
- Per-user project ordering.
