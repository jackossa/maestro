# Projects Screen Accordion & Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Asana-style accordion to the Task Management module's Projects screen — expand a project to preview its top-level tasks (with due date and status) without leaving the screen — plus drag-and-drop reordering for both projects and tasks.

**Architecture:** One new field (`TaskProject.sortOrder`, migration-free) and one new pure sort helper carry project ordering; a new lightweight read-mostly row component plus a small container component carry the per-project task preview, reusing the existing `useProjectTasks` hook (live only while a project is expanded) and the existing `Task.sortOrder` field so accordion reorders and Project Detail's List view stay in sync automatically.

**Tech Stack:** React, TypeScript, Firebase Firestore, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (already a dependency).

## Global Constraints

- Project Detail is unchanged and still reachable by clicking a project name — the accordion is an additional preview, not a replacement. See the design spec's "Scope decisions".
- The accordion shows top-level tasks only — no subtask nesting. Subtask management stays exclusive to Project Detail.
- Accordion task rows support: view, drag-reorder, the completion checkbox, and click-to-open (which opens Project Detail with that task's drawer pre-opened). No inline title editing, no inline reassignment, no inline add/delete.
- Status is a read-only pill in the accordion, not an interactive dropdown.
- Project order is shared/global (`TaskProject.sortOrder`), the same pattern `Task.sortOrder` already uses — not per-user.
- Expand/collapse state is not persisted; it resets whenever the Projects screen remounts.
- No Firestore rules change: the existing `taskProjects/{id}` `update` rule already permits any team member who can see the project to write fields other than `createdBy`/`isShared`, which already covers `sortOrder`.
- Every new `DndContext` uses `PointerSensor` with an 8px `activationConstraint` (so a plain click isn't eaten as a drag) plus `KeyboardSensor` with `sortableKeyboardCoordinates` (accessibility — an explicit `sensors` array replaces dnd-kit's defaults, so omitting `KeyboardSensor` silently disables keyboard drag). Every reorder handler starts with the self-drop guard `if (!over || active.id === over.id) return;`.
- When two or more projects are expanded at once, each gets its own `DndContext`/`SortableContext` pair scoped to just that project's task list (mirroring how `TaskListView` already nests one `DndContext` per parent task's subtask list) — this is what makes cross-project drag structurally impossible, not just unsupported by convention.

---

### Task 1: Data model, API, and pure sort helper

**Files:**
- Modify: `src/features/tasks/types.ts`
- Modify: `src/features/tasks/taskProjectsApi.ts`
- Modify: `src/features/tasks/ProjectsScreen.tsx:1-42` (only `sorted` and `handleCreate`, to keep the build green — full accordion UI comes in Task 3)
- Create: `src/features/tasks/sortProjects.ts`
- Test: `src/features/tasks/sortProjects.test.ts`

**Interfaces:**
- Produces: `TaskProject.sortOrder?: number`; `sortProjectsForDisplay(projects: TaskProject[]): TaskProject[]`; `createTaskProject(name, uid, displayName, sortOrder: number): Promise<string>` (signature change — new required 4th param); `updateTaskProjectSortOrder(projectId: string, sortOrder: number): Promise<void>`.
- Consumes: `computeSortOrder` from `./sortOrder` (existing, unchanged).

- [ ] **Step 1: Write the failing tests for the pure sort helper**

Create `src/features/tasks/sortProjects.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sortProjectsForDisplay } from "./sortProjects";
import type { TaskProject } from "./types";

function project(overrides: Partial<TaskProject>): TaskProject {
  return {
    id: "id",
    name: "name",
    createdBy: "u1",
    createdByName: "User",
    isShared: false,
    members: ["u1"],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("sortProjectsForDisplay", () => {
  it("returns an empty array unchanged", () => {
    expect(sortProjectsForDisplay([])).toEqual([]);
  });

  it("sorts projects that all have sortOrder ascending", () => {
    const a = project({ id: "a", sortOrder: 2000 });
    const b = project({ id: "b", sortOrder: 1000 });
    const c = project({ id: "c", sortOrder: 3000 });
    expect(sortProjectsForDisplay([a, b, c]).map((p) => p.id)).toEqual(["b", "a", "c"]);
  });

  it("falls back to updatedAt descending when none have sortOrder", () => {
    const a = project({ id: "a", updatedAt: 100 });
    const b = project({ id: "b", updatedAt: 300 });
    const c = project({ id: "c", updatedAt: 200 });
    expect(sortProjectsForDisplay([a, b, c]).map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("puts every sortOrder-having project before every sortOrder-less one", () => {
    const ordered = project({ id: "ordered", sortOrder: 5000, updatedAt: 1 });
    const legacyNew = project({ id: "legacyNew", updatedAt: 999 });
    const legacyOld = project({ id: "legacyOld", updatedAt: 500 });
    expect(sortProjectsForDisplay([legacyNew, ordered, legacyOld]).map((p) => p.id)).toEqual([
      "ordered",
      "legacyNew",
      "legacyOld",
    ]);
  });

  it("does not mutate the input array", () => {
    const a = project({ id: "a", sortOrder: 2000 });
    const b = project({ id: "b", sortOrder: 1000 });
    const input = [a, b];
    sortProjectsForDisplay(input);
    expect(input).toEqual([a, b]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- sortProjects`
Expected: FAIL — `Cannot find module './sortProjects'` (the module doesn't exist yet).

- [ ] **Step 3: Add `sortOrder` to the `TaskProject` type**

In `src/features/tasks/types.ts`, add to the `TaskProject` interface (after `members: string[];`):

```ts
  // Manual display order for the Projects screen, same spaced-integer
  // pattern as Task.sortOrder. Optional because existing projects have
  // none yet -- this is a migration-free rollout, not a backfill. See
  // the design spec's "Data model changes" section.
  sortOrder?: number;
```

- [ ] **Step 4: Write the pure sort helper**

Create `src/features/tasks/sortProjects.ts`:

```ts
import type { TaskProject } from "./types";

// No-migration rollout: existing projects have no `sortOrder` yet. Those
// sort by `updatedAt` descending (today's behavior) and always land after
// every project that DOES have one; the first drag on a legacy project
// gives it a real value going forward. See the design spec's "Data model
// changes" section.
export function sortProjectsForDisplay(projects: TaskProject[]): TaskProject[] {
  const withOrder = projects.filter((p) => typeof p.sortOrder === "number");
  const withoutOrder = projects.filter((p) => typeof p.sortOrder !== "number");
  withOrder.sort((a, b) => a.sortOrder! - b.sortOrder!);
  withoutOrder.sort((a, b) => b.updatedAt - a.updatedAt);
  return [...withOrder, ...withoutOrder];
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- sortProjects`
Expected: PASS (5 tests).

- [ ] **Step 6: Add the API functions**

In `src/features/tasks/taskProjectsApi.ts`, change `createTaskProject`'s signature and body:

```ts
export async function createTaskProject(
  name: string,
  uid: string,
  displayName: string,
  sortOrder: number,
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, "taskProjects"), {
    name,
    createdBy: uid,
    createdByName: displayName,
    isShared: false,
    members: [uid],
    sortOrder,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}
```

Add, after `toggleTaskProjectShared`:

```ts
export async function updateTaskProjectSortOrder(projectId: string, sortOrder: number): Promise<void> {
  await updateDoc(doc(db, "taskProjects", projectId), { sortOrder, updatedAt: Date.now() });
}
```

- [ ] **Step 7: Update `ProjectsScreen`'s only two call sites so the build stays green**

In `src/features/tasks/ProjectsScreen.tsx`:

Replace the import line for `taskProjectsApi` and add the new imports:

```ts
import { computeSortOrder } from "./sortOrder";
import { sortProjectsForDisplay } from "./sortProjects";
import { createTaskProject, deleteTaskProjectCascade, toggleTaskProjectShared } from "./taskProjectsApi";
```

Replace the `sorted` memo:

```ts
  const sorted = useMemo(() => sortProjectsForDisplay(projects), [projects]);
```

Replace `handleCreate`'s body:

```ts
  async function handleCreate() {
    const name = newName.trim();
    if (!name || !user) {
      setCreating(false);
      setNewName("");
      return;
    }
    setCreating(false);
    setNewName("");
    const lastOrdered = [...sorted].reverse().find((p) => typeof p.sortOrder === "number");
    const sortOrder = computeSortOrder(lastOrdered?.sortOrder ?? null, null);
    try {
      const id = await createTaskProject(name, user.uid, user.displayName, sortOrder);
      onOpenProject(id);
    } catch (err) {
      console.warn("[tasks] create project failed", err);
      showToast("Couldn't create the project. Please try again.");
    }
  }
```

- [ ] **Step 8: Run the full test suite and typecheck**

Run: `npm test`
Expected: all tests PASS, including the 5 new ones.

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/features/tasks/types.ts src/features/tasks/taskProjectsApi.ts src/features/tasks/ProjectsScreen.tsx src/features/tasks/sortProjects.ts src/features/tasks/sortProjects.test.ts
git commit -m "feat: add TaskProject.sortOrder and pure display-sort helper"
```

---

### Task 2: Project-level drag-and-drop reordering

**Files:**
- Modify: `src/features/tasks/ProjectsScreen.tsx`

**Interfaces:**
- Consumes: `sortProjectsForDisplay` and `computeSortOrder` (Task 1); `updateTaskProjectSortOrder` (Task 1).
- Produces: no new exports — this task makes the existing Projects list draggable in place.

- [ ] **Step 1: Replace `ProjectsScreen.tsx` with the drag-and-drop version**

Full file content for `src/features/tasks/ProjectsScreen.tsx`:

```tsx
import { useCallback, useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "../../shared/state/auth";
import { useToast } from "../../shared/state/toast";
import { computeSortOrder } from "./sortOrder";
import { sortProjectsForDisplay } from "./sortProjects";
import { createTaskProject, deleteTaskProjectCascade, toggleTaskProjectShared, updateTaskProjectSortOrder } from "./taskProjectsApi";
import { useTaskProjectsList } from "./useTaskProjectsList";
import type { TaskProject } from "./types";

// Memoized drag handle element, same pattern as TaskListView's
// SortableTaskRow -- handing a freshly-allocated element to a memoized
// child on every render would defeat memo's shallow comparison regardless
// of how stable the row's other props are.
function SortableProjectRow({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const handle = useMemo(
    () => (
      <button {...attributes} {...listeners} aria-label="Drag to reorder" className="flex-none w-4 text-os-400 cursor-grab active:cursor-grabbing">
        ⠿
      </button>
    ),
    [attributes, listeners],
  );
  return <div ref={setNodeRef} style={style}>{children(handle)}</div>;
}

// Compact rows, not cards -- mirrors Pipeline's existing list-row density.
// Open-task count and nearest due date require reading each project's own
// tasks; V1 keeps this screen fast by omitting those two figures from the
// row (they'd need one extra Firestore read per project on every render)
// and shows them instead inside Project Detail's own toolbar, where the
// task list is already loaded. See the design spec's acceptance criteria
// -- "nearest upcoming due date if available" is satisfied at the project
// level, just one screen deeper, rather than paying for it on every row
// of a screen whose whole point is being fast to scan.
export function ProjectsScreen({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { projects, loading } = useTaskProjectsList();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const sorted = useMemo(() => sortProjectsForDisplay(projects), [projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !user) {
      setCreating(false);
      setNewName("");
      return;
    }
    setCreating(false);
    setNewName("");
    const lastOrdered = [...sorted].reverse().find((p) => typeof p.sortOrder === "number");
    const sortOrder = computeSortOrder(lastOrdered?.sortOrder ?? null, null);
    try {
      const id = await createTaskProject(name, user.uid, user.displayName, sortOrder);
      onOpenProject(id);
    } catch (err) {
      console.warn("[tasks] create project failed", err);
      showToast("Couldn't create the project. Please try again.");
    }
  }

  async function handleToggleShared(p: TaskProject) {
    try {
      await toggleTaskProjectShared(p.id, !p.isShared);
    } catch (err) {
      console.warn("[tasks] toggle shared failed", err);
      showToast("Couldn't update sharing. Please try again.");
    }
  }

  async function handleDelete(p: TaskProject) {
    if (!window.confirm(`Delete "${p.name}"? This removes all of its tasks and cannot be undone.`)) return;
    try {
      await deleteTaskProjectCascade(p.id);
    } catch (err) {
      console.warn("[tasks] delete project failed", err);
      showToast("Couldn't delete the project. Please try again.");
    }
  }

  const handleReorder = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeIndex = sorted.findIndex((p) => p.id === active.id);
      const overIndex = sorted.findIndex((p) => p.id === over.id);
      if (activeIndex === -1 || overIndex === -1) return;
      const reordered = [...sorted];
      const [moved] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, moved);
      const before = reordered[overIndex - 1]?.sortOrder ?? null;
      const after = reordered[overIndex + 1]?.sortOrder ?? null;
      try {
        await updateTaskProjectSortOrder(moved.id, computeSortOrder(before, after));
      } catch (err) {
        console.warn("[tasks] reorder project failed", err);
        showToast("Couldn't reorder. Please try again.");
      }
    },
    [sorted, showToast],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-xs tracking-[.14em] uppercase text-os-ink">Projects</div>
        {creating ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            onBlur={handleCreate}
            placeholder="Project name"
            className="box-border px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink w-[220px]"
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="px-[14px] py-[7px] border border-os-orange bg-os-orange text-white font-bold text-[11px] tracking-[.06em] rounded-full hover:bg-accent-hover"
          >
            + NEW PROJECT
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[46px] rounded-brand-sm bg-os-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <p className="my-5 font-light text-[13.5px] text-os-500 text-center border border-dashed border-os-300 p-5 rounded-brand-sm">
          No projects yet — click + New Project to get started.
        </p>
      )}

      {!loading && sorted.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
          <SortableContext items={sorted.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {sorted.map((p) => (
              <SortableProjectRow key={p.id} id={p.id}>
                {(dragHandle) => (
                  <div className="flex items-center gap-3 min-h-[46px] px-[10px] border-b border-os-200 hover:bg-os-50">
                    {dragHandle}
                    <button onClick={() => onOpenProject(p.id)} className="flex-1 min-w-0 text-left font-bold text-[13.5px] text-os-ink truncate">
                      {p.name}
                    </button>
                    <div className="flex-none text-[11.5px] text-os-600 w-[120px] truncate">{p.createdByName}</div>
                    <button
                      onClick={() => handleToggleShared(p)}
                      disabled={p.createdBy !== user?.uid}
                      title={p.createdBy === user?.uid ? "Toggle sharing" : "Only the owner can change sharing"}
                      className={`flex-none px-[10px] py-[4px] rounded-full font-bold text-[10px] tracking-[.04em] border ${
                        p.isShared ? "bg-os-orange-050 text-os-orange-700 border-os-orange-300" : "bg-os-100 text-os-600 border-os-200"
                      } disabled:cursor-not-allowed`}
                    >
                      {p.isShared ? "SHARED" : "PRIVATE"}
                    </button>
                    {p.createdBy === user?.uid && (
                      <button
                        onClick={() => handleDelete(p)}
                        title="Delete project"
                        className="flex-none px-2 py-[5px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </SortableProjectRow>
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, sign in, go to Tasks → Projects with at least two projects. Drag a project row by its handle to a new position; confirm it stays there after a page refresh (writes `sortOrder`, read back via `sortProjectsForDisplay`). Confirm dragging a project onto itself (no movement) does nothing (self-drop guard). Confirm keyboard reorder works: Tab to a drag handle, Space to pick up, Arrow keys to move, Space to drop.

- [ ] **Step 4: Commit**

```bash
git add src/features/tasks/ProjectsScreen.tsx
git commit -m "feat: drag-and-drop reordering for the Projects list"
```

---

### Task 3: Accordion — task preview row, per-project task list, wiring

**Files:**
- Create: `src/features/tasks/ProjectPreviewTaskRow.tsx`
- Create: `src/features/tasks/ProjectAccordionTasks.tsx`
- Modify: `src/features/tasks/AssigneePicker.tsx` (export the existing `Initial` helper — no behavior change)
- Modify: `src/features/tasks/ProjectsScreen.tsx` (add the expand/collapse triangle and render the accordion)
- Modify: `src/features/tasks/TasksTab.tsx` (thread `onOpenTask` to `ProjectsScreen`)

**Interfaces:**
- Consumes: `useProjectTasks` (existing, unchanged); `updateTask` (existing, unchanged); `computeSortOrder` (Task 1's file, unchanged); `Initial` from `AssigneePicker.tsx` (newly exported).
- Produces: `ProjectPreviewTaskRow` component; `ProjectAccordionTasks` component; `ProjectsScreen` gains a required `onOpenTask: (projectId: string, taskId: string) => void` prop.

- [ ] **Step 1: Export `Initial` from `AssigneePicker.tsx`**

In `src/features/tasks/AssigneePicker.tsx`, change:

```ts
function Initial({ name, photoURL }: { name: string; photoURL: string | null }) {
```

to:

```ts
export function Initial({ name, photoURL }: { name: string; photoURL: string | null }) {
```

- [ ] **Step 2: Write the preview row component**

Create `src/features/tasks/ProjectPreviewTaskRow.tsx`:

```tsx
import { memo } from "react";
import { Initial } from "./AssigneePicker";
import type { Task, TaskStatus } from "./types";

// Read-only-ish preview row for the Projects screen's accordion -- NOT a
// reuse of TaskRow, which is built for full editing (inline title edit on
// click, an interactive AssigneePicker, hover-reveal open/delete buttons).
// This view intentionally excludes all of that: view, drag-reorder, and
// the completion checkbox only. See the design spec's "Interaction level"
// scope decision. Wrapped in memo for the same reason TaskRow is -- a
// project with 100+ tasks shouldn't re-render every row on every drag.
const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  complete: "Complete",
};

const STATUS_CLASS: Record<TaskStatus, string> = {
  todo: "bg-os-100 text-os-600",
  in_progress: "bg-os-orange-050 text-os-orange-700",
  complete: "bg-os-orange text-white",
};

function ProjectPreviewTaskRowImpl({
  task,
  dragHandle,
  onToggleComplete,
  onOpen,
}: {
  task: Task;
  dragHandle: React.ReactNode;
  onToggleComplete: (id: string, completed: boolean) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-[8px] pl-[26px] pr-[10px] min-h-[38px] border-b border-os-200 hover:bg-os-50">
      {dragHandle}
      <button
        onClick={() => onToggleComplete(task.id, !task.completed)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={`flex-none w-[16px] h-[16px] rounded-full border-2 ${
          task.completed ? "bg-os-orange border-os-orange" : "border-os-300 hover:border-os-orange"
        }`}
      />
      <button onClick={() => onOpen(task.id)} className="flex-1 min-w-0 text-left">
        <span className={`truncate font-medium text-[12.5px] ${task.completed ? "line-through text-os-500" : "text-os-ink"}`}>
          {task.title}
        </span>
      </button>
      <div className="flex-none w-[110px] flex items-center gap-[6px] max-md:hidden">
        {task.assigneeId ? <Initial name={task.assigneeName || "?"} photoURL={null} /> : <div className="w-5 h-5 rounded-full flex-none border border-dashed border-os-300" />}
        <span className="text-[11px] text-os-600 truncate">{task.assigneeName || "Unassigned"}</span>
      </div>
      <div className="flex-none w-[76px] text-[11px] text-os-600 max-md:hidden">{task.dueDate || "—"}</div>
      <div className={`flex-none px-2 py-[2px] rounded-full font-bold text-[9.5px] tracking-[.03em] ${STATUS_CLASS[task.status]}`}>
        {STATUS_LABEL[task.status]}
      </div>
    </div>
  );
}

export const ProjectPreviewTaskRow = memo(ProjectPreviewTaskRowImpl);
```

- [ ] **Step 3: Write the per-project accordion container**

Create `src/features/tasks/ProjectAccordionTasks.tsx`:

```tsx
import { useCallback, useMemo } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "../../shared/state/toast";
import { computeSortOrder } from "./sortOrder";
import { updateTask } from "./tasksApi";
import { useProjectTasks } from "./useProjectTasks";
import { ProjectPreviewTaskRow } from "./ProjectPreviewTaskRow";

// Memoized drag handle, same reasoning as TaskListView's SortableTaskRow
// and ProjectsScreen's SortableProjectRow.
function SortablePreviewRow({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const handle = useMemo(
    () => (
      <button {...attributes} {...listeners} aria-label="Drag to reorder" className="flex-none w-4 text-os-400 cursor-grab active:cursor-grabbing">
        ⠿
      </button>
    ),
    [attributes, listeners],
  );
  return <div ref={setNodeRef} style={style}>{children(handle)}</div>;
}

// One expanded project's task preview: its own useProjectTasks listener
// (live only while this project is expanded -- collapsing unmounts this
// component, tearing the listener down), its own DndContext scoped to
// just this project's top-level tasks. See the design spec's "If two or
// more projects are expanded at once" note -- this scoping is what keeps
// a drag from ever resolving against a DIFFERENT project's task list, not
// just a convention nobody violates by accident.
export function ProjectAccordionTasks({ projectId, onOpenTask }: { projectId: string; onOpenTask: (projectId: string, taskId: string) => void }) {
  const { tasks, loading } = useProjectTasks(projectId);
  const { showToast } = useToast();

  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleToggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      try {
        await updateTask(projectId, id, { completed, status: completed ? "complete" : "todo" });
      } catch (err) {
        console.warn("[tasks] toggle complete failed", err);
        showToast("Couldn't update the task. Please try again.");
      }
    },
    [projectId, showToast],
  );

  const handleOpen = useCallback((id: string) => onOpenTask(projectId, id), [projectId, onOpenTask]);

  const handleReorder = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeIndex = topLevel.findIndex((t) => t.id === active.id);
      const overIndex = topLevel.findIndex((t) => t.id === over.id);
      if (activeIndex === -1 || overIndex === -1) return;
      const reordered = [...topLevel];
      const [moved] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, moved);
      const before = reordered[overIndex - 1]?.sortOrder ?? null;
      const after = reordered[overIndex + 1]?.sortOrder ?? null;
      try {
        await updateTask(projectId, moved.id, { sortOrder: computeSortOrder(before, after) });
      } catch (err) {
        console.warn("[tasks] reorder failed", err);
        showToast("Couldn't reorder. Please try again.");
      }
    },
    [projectId, topLevel, showToast],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-1 pl-[26px] pr-[10px] py-1">
        {[0, 1].map((i) => (
          <div key={i} className="h-[32px] rounded-brand-sm bg-os-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (topLevel.length === 0) {
    return <p className="pl-[26px] pr-[10px] py-[10px] font-light text-[12px] text-os-500">No tasks yet.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
      <SortableContext items={topLevel.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {topLevel.map((task) => (
          <SortablePreviewRow key={task.id} id={task.id}>
            {(dragHandle) => (
              <ProjectPreviewTaskRow task={task} dragHandle={dragHandle} onToggleComplete={handleToggleComplete} onOpen={handleOpen} />
            )}
          </SortablePreviewRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 4: Wire the triangle and the accordion into `ProjectsScreen.tsx`**

In `src/features/tasks/ProjectsScreen.tsx`:

Add to the imports:

```ts
import { ProjectAccordionTasks } from "./ProjectAccordionTasks";
```

Change the component signature:

```ts
export function ProjectsScreen({ onOpenProject, onOpenTask }: { onOpenProject: (id: string) => void; onOpenTask: (projectId: string, taskId: string) => void }) {
```

Add state and a handler, alongside the existing `creating`/`newName` state:

```ts
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback((id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
```

(`useCallback` is already imported from Task 2's rewrite.)

Replace the `SortableProjectRow` row rendering with (note: the row content is now wrapped in an outer `<div>` so the conditional accordion can sit below the header row, inside the same sortable node — the same nesting `TaskListView` already uses for subtasks):

```tsx
              <SortableProjectRow key={p.id} id={p.id}>
                {(dragHandle) => (
                  <div>
                    <div className="flex items-center gap-3 min-h-[46px] px-[10px] border-b border-os-200 hover:bg-os-50">
                      {dragHandle}
                      <button
                        onClick={() => handleToggleExpand(p.id)}
                        aria-label={expanded.has(p.id) ? "Collapse tasks" : "Expand tasks"}
                        className="flex-none w-4 text-os-500"
                      >
                        {expanded.has(p.id) ? "▾" : "▸"}
                      </button>
                      <button onClick={() => onOpenProject(p.id)} className="flex-1 min-w-0 text-left font-bold text-[13.5px] text-os-ink truncate">
                        {p.name}
                      </button>
                      <div className="flex-none text-[11.5px] text-os-600 w-[120px] truncate">{p.createdByName}</div>
                      <button
                        onClick={() => handleToggleShared(p)}
                        disabled={p.createdBy !== user?.uid}
                        title={p.createdBy === user?.uid ? "Toggle sharing" : "Only the owner can change sharing"}
                        className={`flex-none px-[10px] py-[4px] rounded-full font-bold text-[10px] tracking-[.04em] border ${
                          p.isShared ? "bg-os-orange-050 text-os-orange-700 border-os-orange-300" : "bg-os-100 text-os-600 border-os-200"
                        } disabled:cursor-not-allowed`}
                      >
                        {p.isShared ? "SHARED" : "PRIVATE"}
                      </button>
                      {p.createdBy === user?.uid && (
                        <button
                          onClick={() => handleDelete(p)}
                          title="Delete project"
                          className="flex-none px-2 py-[5px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {expanded.has(p.id) && <ProjectAccordionTasks projectId={p.id} onOpenTask={onOpenTask} />}
                  </div>
                )}
              </SortableProjectRow>
```

- [ ] **Step 5: Thread `onOpenTask` through `TasksTab.tsx`**

In `src/features/tasks/TasksTab.tsx`, change the `projects` screen line:

```tsx
      {screen === "projects" && <ProjectsScreen onOpenProject={openProject} onOpenTask={openTaskFromMyTasks} />}
```

(`openTaskFromMyTasks` already exists and does exactly what's needed — set the pending drawer task id, then navigate into Project Detail. It's no longer My-Tasks-exclusive, but renaming it is cosmetic only and out of scope here.)

- [ ] **Step 6: Run typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run `npm run dev`. On the Projects screen, click a triangle to expand a project with tasks: confirm top-level tasks show with assignee, due date, and a status pill, and subtasks do NOT appear. Drag a task within the expanded list; confirm the same order shows when you open that project's Project Detail List view (same `sortOrder` field). Click a task row's title area; confirm it navigates into Project Detail with that task's drawer open. Click the checkbox; confirm it toggles complete/incomplete in place. Expand a project with zero tasks; confirm "No tasks yet." shows. Expand two projects at once and drag a task in one; confirm it has no effect on the other's list or order.

- [ ] **Step 8: Commit**

```bash
git add src/features/tasks/ProjectPreviewTaskRow.tsx src/features/tasks/ProjectAccordionTasks.tsx src/features/tasks/AssigneePicker.tsx src/features/tasks/ProjectsScreen.tsx src/features/tasks/TasksTab.tsx
git commit -m "feat: accordion task preview on the Projects screen"
```

---

### Task 4: Final cross-check

**Files:** none expected — this task verifies Tasks 1-3 and fixes anything it finds.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests PASS, including Task 1's 5 new `sortProjectsForDisplay` tests and every pre-existing test in the module.

- [ ] **Step 2: Run the full build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 3: Verify sensor setup is present in both new `DndContext` usages**

Confirm `ProjectsScreen.tsx`'s and `ProjectAccordionTasks.tsx`'s `DndContext` both pass a `sensors` prop built from `useSensors(useSensor(PointerSensor, ...), useSensor(KeyboardSensor, ...))` — not just the default. Confirm both reorder handlers open with `if (!over || active.id === over.id) return;`. This is a known landmine in this exact codebase (Board view shipped without it and needed a fix round) — this step exists to make sure it doesn't recur silently here.

- [ ] **Step 4: Verify no Firestore rules diff was needed**

Run: `git diff firestore.rules`
Expected: no output. The design spec's reasoning (the existing `taskProjects/{id}` update rule already covers arbitrary non-`isShared`/`createdBy` field writes) should hold with zero rule changes; if this step shows a diff, stop and reconcile against the spec before proceeding.

- [ ] **Step 5: Manual keyboard-accessibility pass**

For both the Projects list and one expanded project's task list: Tab to a drag handle, press Space to pick up the item, use Arrow Up/Down to move it, press Space to drop, confirm it persisted (re-check after a refresh).

- [ ] **Step 6: Manual visual pass**

Confirm the accordion's row indentation, row height, and typography read as clearly nested under their parent project without looking like a separate, disconnected list. Confirm the status pill's three states are visually distinct from each other and from the SHARED/PRIVATE badge already on the project row above them.

- [ ] **Step 7: Commit any fixes found**

If Steps 3-6 surface an issue, fix it and commit separately with a message describing the specific defect (not a generic "fixes" message). If everything already passes, no commit is needed for this task.
