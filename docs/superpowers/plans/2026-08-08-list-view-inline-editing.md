# List View Inline Editing + Tasks Tab Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make due date and status editable directly from every task list row (Project Detail's List view, My Tasks, and the Projects screen's accordion preview), and fix the Tasks module's tab order/default screen.

**Architecture:** One new shared module carries the status label/color mapping so it has a single source of truth across the two row components that both need it. Both row components (`TaskRow`, `ProjectPreviewTaskRow`) swap their read-only due-date text and (for `ProjectPreviewTaskRow`) read-only status pill for a native `<input type="date">` and a native `<select>`, wired to new `onDueDateChange`/`onStatusChange` callback props. Every call site that renders these rows gains matching handlers, all following the same `useCallback`-per-action pattern already established for `onToggleComplete`.

**Tech Stack:** React, TypeScript, Firebase Firestore.

## Global Constraints

- Semantics mirror the Task Detail Drawer exactly, so a change from a list row and a change from the drawer never disagree:
  - Due date: `updateTask(projectId, id, { dueDate: value || null })`.
  - Status: `updateTask(projectId, id, { status, completed: status === "complete" })` — picking any status also derives `completed`, same as the drawer's own `<select>`.
- `TaskRow`'s existing inline title editing and interactive `AssigneePicker` are unchanged — this plan only adds due date and status.
- `ProjectPreviewTaskRow` gains due date and status editing only — no inline title editing, no interactive assignee reassignment. That restriction is unchanged from the accordion's original design spec.
- `STATUS_LABEL`/`STATUS_CLASS` live in exactly one module (`taskStatusStyle.ts`) — do not leave or reintroduce a second copy in either row component.
- No Firestore rules change: `updateTask` already exists and already allows writing `dueDate`/`status`/`completed` — these fields are not new.

---

### Task 1: Tasks tab order and default screen

**Files:**
- Modify: `src/features/tasks/TasksTab.tsx`

**Interfaces:** none — internal to this one file.

- [ ] **Step 1: Replace the whole file**

Full content for `src/features/tasks/TasksTab.tsx`:

```tsx
import { useState } from "react";
import { ProjectsScreen } from "./ProjectsScreen";
import { ProjectDetailScreen } from "./ProjectDetailScreen";
import { MyTasksScreen } from "./MyTasksScreen";

// Screen-switcher for the whole Task Management module, following the
// same view-based (no-router) convention as the rest of Maestro. Filled
// in incrementally: My Tasks (Task 16), Projects (Task 8), Project Detail
// (Task 9) all render through here.
export type TasksScreen = "my-tasks" | "projects" | "project-detail";

export function TasksTab() {
  const [screen, setScreen] = useState<TasksScreen>("projects");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [pendingDrawerTaskId, setPendingDrawerTaskId] = useState<string | null>(null);

  function openProject(id: string) {
    setActiveProjectId(id);
    setScreen("project-detail");
  }

  function openTaskFromMyTasks(projectId: string, taskId: string) {
    setPendingDrawerTaskId(taskId);
    openProject(projectId);
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setScreen("projects")}
          className={`px-4 py-[7px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
            screen === "projects" || screen === "project-detail" ? "bg-os-orange text-white border-os-orange" : "bg-white text-os-700 border-os-300"
          }`}
        >
          PROJECTS
        </button>
        <button
          onClick={() => setScreen("my-tasks")}
          className={`px-4 py-[7px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
            screen === "my-tasks" ? "bg-os-orange text-white border-os-orange" : "bg-white text-os-700 border-os-300"
          }`}
        >
          MY TASKS
        </button>
      </div>
      {screen === "my-tasks" && <MyTasksScreen onOpenTask={openTaskFromMyTasks} />}
      {screen === "projects" && <ProjectsScreen onOpenProject={openProject} onOpenTask={openTaskFromMyTasks} />}
      {screen === "project-detail" && activeProjectId && (
        // key: switching projects must give ProjectDetailScreen a genuinely
        // new instance so its local viewMode/drawerTaskId/filters state
        // resets, rather than relying on this branch happening to unmount
        // between projects today.
        <ProjectDetailScreen
          key={activeProjectId}
          projectId={activeProjectId}
          onBack={() => setScreen("projects")}
          initialDrawerTaskId={pendingDrawerTaskId}
          onDrawerTaskConsumed={() => setPendingDrawerTaskId(null)}
        />
      )}
    </div>
  );
}
```

(Only two things changed from the current file: the two button blocks swapped
order, and the initial `useState` value changed from `"my-tasks"` to
`"projects"`. Everything else — including both buttons' `onClick`/className
logic and the three conditional screen renders below — is unchanged.)

- [ ] **Step 2: Run typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, sign in, click into Tasks. Confirm PROJECTS renders
first (left) and is the active/highlighted tab on first load, with the
Projects screen showing. Click MY TASKS, confirm it still works exactly
as before.

- [ ] **Step 4: Commit**

```bash
git add src/features/tasks/TasksTab.tsx
git commit -m "feat: Projects is now the default Tasks screen, ahead of My Tasks in tab order"
```

---

### Task 2: Accordion preview row — inline due date and status

**Files:**
- Create: `src/features/tasks/taskStatusStyle.ts`
- Modify: `src/features/tasks/ProjectPreviewTaskRow.tsx`
- Modify: `src/features/tasks/ProjectAccordionTasks.tsx`

**Interfaces:**
- Produces: `STATUS_LABEL: Record<TaskStatus, string>`, `STATUS_CLASS: Record<TaskStatus, string>` (moved out of `ProjectPreviewTaskRow.tsx`, now the single source both this task and Task 3 read from).
- Produces: `ProjectPreviewTaskRow` gains two new required props: `onDueDateChange: (id: string, dueDate: string | null) => void`, `onStatusChange: (id: string, status: TaskStatus) => void`.

- [ ] **Step 1: Extract the shared status style module**

Create `src/features/tasks/taskStatusStyle.ts`:

```ts
import type { TaskStatus } from "./types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  complete: "Complete",
};

// Deliberately not reusing the SHARED/PRIVATE badge's bg-os-100/text-os-600
// and bg-os-orange-050/text-os-orange-700 pairs -- those exact
// background/text combinations are already claimed by the Projects
// screen's sharing badge, and reusing them would make "todo" read as
// "private" and "complete" read as "shared" at a glance. See the
// 2026-08-08 projects-accordion final review for the original collision
// this was fixed from.
export const STATUS_CLASS: Record<TaskStatus, string> = {
  todo: "bg-os-200 text-os-700",
  in_progress: "bg-os-blue/10 text-os-800",
  complete: "bg-os-orange-100 text-os-orange-700",
};
```

- [ ] **Step 2: Replace `ProjectPreviewTaskRow.tsx` with the editable version**

Full content for `src/features/tasks/ProjectPreviewTaskRow.tsx`:

```tsx
import { memo } from "react";
import { Initial } from "./AssigneePicker";
import { todayIso } from "./dueDateBucket";
import { STATUS_CLASS, STATUS_LABEL } from "./taskStatusStyle";
import type { Task, TaskStatus } from "./types";

// Preview row for the Projects screen's accordion -- NOT a reuse of
// TaskRow, which additionally supports inline title editing and an
// interactive AssigneePicker. This row supports view, drag-reorder, the
// completion checkbox, and (per the 2026-08-08 list-view-inline-editing
// spec) inline due date and status editing -- title and assignee stay
// out. Wrapped in memo for the same reason TaskRow is -- a project with
// 100+ tasks shouldn't re-render every row on every drag.
function ProjectPreviewTaskRowImpl({
  task,
  dragHandle,
  onToggleComplete,
  onDueDateChange,
  onStatusChange,
  onOpen,
}: {
  task: Task;
  dragHandle: React.ReactNode;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDueDateChange: (id: string, dueDate: string | null) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onOpen: (id: string) => void;
}) {
  const today = todayIso();
  const isOverdue = !!task.dueDate && task.dueDate < today && !task.completed;

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
      <button
        onClick={() => onOpen(task.id)}
        className={`flex-1 min-w-0 text-left truncate font-medium text-[12.5px] ${task.completed ? "line-through text-os-500" : "text-os-ink"}`}
      >
        {task.title}
      </button>
      <div className="flex-none w-[110px] flex items-center gap-[6px] max-md:hidden">
        {task.assigneeId ? <Initial name={task.assigneeName || "?"} photoURL={null} /> : <div className="w-5 h-5 rounded-full flex-none border border-dashed border-os-300" />}
        <span className="text-[11px] text-os-600 truncate">{task.assigneeName || "Unassigned"}</span>
      </div>
      <input
        type="date"
        value={task.dueDate || ""}
        onChange={(e) => onDueDateChange(task.id, e.target.value || null)}
        className={`flex-none w-[76px] bg-transparent border-0 text-[11px] max-md:hidden ${isOverdue ? "text-os-orange-700 font-bold" : "text-os-600"}`}
      />
      <select
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
        className={`flex-none appearance-none cursor-pointer border-0 px-2 py-[2px] rounded-full font-bold text-[9.5px] tracking-[.03em] ${STATUS_CLASS[task.status]}`}
      >
        {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>
    </div>
  );
}

export const ProjectPreviewTaskRow = memo(ProjectPreviewTaskRowImpl);
```

- [ ] **Step 3: Replace `ProjectAccordionTasks.tsx` with the version that wires the two new handlers**

Full content for `src/features/tasks/ProjectAccordionTasks.tsx`:

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
import type { TaskStatus } from "./types";

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

  const handleDueDateChange = useCallback(
    async (id: string, dueDate: string | null) => {
      try {
        await updateTask(projectId, id, { dueDate });
      } catch (err) {
        console.warn("[tasks] due date change failed", err);
        showToast("Couldn't update the due date. Please try again.");
      }
    },
    [projectId, showToast],
  );

  const handleStatusChange = useCallback(
    async (id: string, status: TaskStatus) => {
      try {
        await updateTask(projectId, id, { status, completed: status === "complete" });
      } catch (err) {
        console.warn("[tasks] status change failed", err);
        showToast("Couldn't update the status. Please try again.");
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
              <ProjectPreviewTaskRow
                task={task}
                dragHandle={dragHandle}
                onToggleComplete={handleToggleComplete}
                onDueDateChange={handleDueDateChange}
                onStatusChange={handleStatusChange}
                onOpen={handleOpen}
              />
            )}
          </SortablePreviewRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`. On the Projects screen, expand a project. Change a
task's due date via the new date input; confirm it saves (check Project
Detail's List view for the same project shows the same new date). Change
a task's status via the new select; confirm the pill color updates
immediately and, if you pick "Complete", the checkbox fills in too (and
vice versa — completing via the checkbox should show "Complete" in the
select).

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/taskStatusStyle.ts src/features/tasks/ProjectPreviewTaskRow.tsx src/features/tasks/ProjectAccordionTasks.tsx
git commit -m "feat: inline due date and status editing in the Projects accordion"
```

---

### Task 3: Project Detail List view + My Tasks — inline due date and status

**Files:**
- Modify: `src/features/tasks/TaskRow.tsx`
- Modify: `src/features/tasks/TaskListView.tsx`
- Modify: `src/features/tasks/MyTasksScreen.tsx`

**Interfaces:**
- Consumes: `STATUS_LABEL`/`STATUS_CLASS` from `./taskStatusStyle` (Task 2).
- Produces: `TaskRow` gains two new required props: `onDueDateChange: (id: string, dueDate: string | null) => void`, `onStatusChange: (id: string, status: TaskStatus) => void`.

- [ ] **Step 1: Replace `TaskRow.tsx` with the editable version**

Full content for `src/features/tasks/TaskRow.tsx`:

```tsx
import { memo, useState, type ReactNode } from "react";
import { AssigneePicker } from "./AssigneePicker";
import { todayIso } from "./dueDateBucket";
import { STATUS_CLASS, STATUS_LABEL } from "./taskStatusStyle";
import type { Task, TaskStatus } from "./types";

// Shared between List view (Task 9/10) and My Tasks (Task 16). Height:
// 44-52px top-level, 36-44px for a subtask (passed via `compact`). See the
// design spec's row layout example. Wrapped in React.memo so dragging or
// editing one row (100+ tasks per project, per the spec's performance
// requirement) doesn't re-render every other row.
//
// memo only pays off if the props it shallow-compares actually hold their
// identity between parent renders, so every callback below takes the
// task's id as its first argument instead of being a pre-bound per-row
// closure. Call sites (TaskListView, MyTasksScreen) define these handlers
// once with useCallback and pass the same function to every row -- passing
// `onDelete={() => handleDelete(task)}` inline would allocate a fresh
// function per row per render and defeat the comparison entirely.
function TaskRowImpl({
  task,
  projectId,
  isShared,
  compact = false,
  showProject = false,
  hasSubtasks = false,
  expanded = false,
  onToggleExpand,
  onToggleComplete,
  onTitleChange,
  onDueDateChange,
  onStatusChange,
  onOpenDrawer,
  onDelete,
  dragHandle,
}: {
  task: Task;
  projectId: string;
  isShared: boolean;
  compact?: boolean;
  showProject?: boolean;
  hasSubtasks?: boolean;
  expanded?: boolean;
  onToggleExpand?: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onTitleChange: (id: string, title: string) => void;
  onDueDateChange: (id: string, dueDate: string | null) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onOpenDrawer: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandle?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);

  function commitTitle() {
    const trimmed = draftTitle.trim();
    setEditing(false);
    if (trimmed && trimmed !== task.title) onTitleChange(task.id, trimmed);
    else setDraftTitle(task.title);
  }

  const today = todayIso();
  const isOverdue = !!task.dueDate && task.dueDate < today && !task.completed;

  return (
    <div
      className={`group flex items-center gap-[8px] px-[8px] border-b border-os-200 hover:bg-os-50 ${
        compact ? "min-h-[38px]" : "min-h-[46px]"
      }`}
    >
      {dragHandle}
      {hasSubtasks && onToggleExpand ? (
        <button onClick={() => onToggleExpand(task.id)} aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"} className="flex-none w-4 text-os-500">
          {expanded ? "▾" : "▸"}
        </button>
      ) : (
        <span className="flex-none w-4" />
      )}
      <button
        onClick={() => onToggleComplete(task.id, !task.completed)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={`flex-none w-[18px] h-[18px] rounded-full border-2 ${
          task.completed ? "bg-os-orange border-os-orange" : "border-os-300 hover:border-os-orange"
        }`}
      />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setDraftTitle(task.title); setEditing(false); }
            }}
            className="box-border w-full px-[6px] py-[3px] border border-os-300 rounded-[6px] bg-[#fdf4e3] font-medium text-[13px] text-os-ink"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`text-left w-full truncate font-medium text-[13px] ${
              task.completed ? "line-through text-os-500" : "text-os-ink"
            }`}
          >
            {task.title}
          </button>
        )}
        {showProject && (
          <div className="text-[10.5px] text-os-500 truncate">{task.projectName}</div>
        )}
      </div>
      <div className="flex-none w-[100px] max-md:hidden">
        <AssigneePicker projectId={projectId} task={task} isShared={isShared} />
      </div>
      <input
        type="date"
        value={task.dueDate || ""}
        onChange={(e) => onDueDateChange(task.id, e.target.value || null)}
        className={`flex-none w-[76px] bg-transparent border-0 text-[11.5px] ${isOverdue ? "text-os-orange-700 font-bold" : "text-os-600"}`}
      />
      <select
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
        className={`flex-none appearance-none cursor-pointer border-0 px-2 py-[2px] rounded-full font-bold text-[9.5px] tracking-[.03em] ${STATUS_CLASS[task.status]}`}
      >
        {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>
      <div className="flex-none opacity-0 group-hover:opacity-100 flex items-center gap-1">
        <button onClick={() => onOpenDrawer(task.id)} title="Open task" className="px-[7px] py-[3px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700">
          OPEN
        </button>
        <button onClick={() => onDelete(task.id)} title="Delete task" className="px-[7px] py-[3px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700">
          ×
        </button>
      </div>
    </div>
  );
}

export const TaskRow = memo(TaskRowImpl);
```

- [ ] **Step 2: Add two handlers and wire two new props in `TaskListView.tsx`**

In `src/features/tasks/TaskListView.tsx`, change the type-only import:

```ts
import type { Task } from "./types";
```

to:

```ts
import type { Task, TaskStatus } from "./types";
```

Immediately after the existing `handleTitleChange` function (a `useCallback` that calls `updateTask(projectId, id, { title })` — it is followed by the `handleDelete` function), insert these two new handlers:

```ts
  const handleDueDateChange = useCallback(
    async (id: string, dueDate: string | null) => {
      try {
        await updateTask(projectId, id, { dueDate });
      } catch (err) {
        console.warn("[tasks] due date change failed", err);
        showToast("Couldn't update the due date. Please try again.");
      }
    },
    [projectId, showToast],
  );

  const handleStatusChange = useCallback(
    async (id: string, status: TaskStatus) => {
      try {
        await updateTask(projectId, id, { status, completed: status === "complete" });
      } catch (err) {
        console.warn("[tasks] status change failed", err);
        showToast("Couldn't update the status. Please try again.");
      }
    },
    [projectId, showToast],
  );
```

There are two `<TaskRow ... />` call sites in this file. The first (inside
the top-level `topLevel.map` loop) has `hasSubtasks`/`expanded`/
`onToggleExpand` props; find this exact block:

```tsx
                    <TaskRow
                      task={task}
                      projectId={projectId}
                      isShared={isShared}
                      hasSubtasks={subtasks.length > 0}
                      expanded={isExpanded}
                      dragHandle={dragHandle}
                      onToggleExpand={handleToggleExpand}
                      onToggleComplete={handleToggleComplete}
                      onTitleChange={handleTitleChange}
                      onOpenDrawer={onOpenDrawer}
                      onDelete={handleDelete}
                    />
```

and replace it with:

```tsx
                    <TaskRow
                      task={task}
                      projectId={projectId}
                      isShared={isShared}
                      hasSubtasks={subtasks.length > 0}
                      expanded={isExpanded}
                      dragHandle={dragHandle}
                      onToggleExpand={handleToggleExpand}
                      onToggleComplete={handleToggleComplete}
                      onTitleChange={handleTitleChange}
                      onDueDateChange={handleDueDateChange}
                      onStatusChange={handleStatusChange}
                      onOpenDrawer={onOpenDrawer}
                      onDelete={handleDelete}
                    />
```

The second call site (inside the nested `subtasks.map` loop) has `compact`
and `subHandle` instead; find this exact block:

```tsx
                                  <TaskRow
                                    task={sub}
                                    projectId={projectId}
                                    isShared={isShared}
                                    compact
                                    dragHandle={subHandle}
                                    onToggleComplete={handleToggleComplete}
                                    onTitleChange={handleTitleChange}
                                    onOpenDrawer={onOpenDrawer}
                                    onDelete={handleDelete}
                                  />
```

and replace it with:

```tsx
                                  <TaskRow
                                    task={sub}
                                    projectId={projectId}
                                    isShared={isShared}
                                    compact
                                    dragHandle={subHandle}
                                    onToggleComplete={handleToggleComplete}
                                    onTitleChange={handleTitleChange}
                                    onDueDateChange={handleDueDateChange}
                                    onStatusChange={handleStatusChange}
                                    onOpenDrawer={onOpenDrawer}
                                    onDelete={handleDelete}
                                  />
```

- [ ] **Step 3: Replace `MyTasksScreen.tsx` with the version that adds the same two handlers**

Full content for `src/features/tasks/MyTasksScreen.tsx`:

```tsx
import { useCallback, useMemo } from "react";
import { useMyTasks } from "./useMyTasks";
import { useTaskProjectsList } from "./useTaskProjectsList";
import { getDueDateBucket, todayIso, type DueDateBucket } from "./dueDateBucket";
import { TaskRow } from "./TaskRow";
import { updateTask, deleteTask } from "./tasksApi";
import { useToast } from "../../shared/state/toast";
import type { Task, TaskStatus } from "./types";

const GROUPS: { bucket: DueDateBucket; label: string }[] = [
  { bucket: "overdue", label: "OVERDUE" },
  { bucket: "today", label: "TODAY" },
  { bucket: "upcoming", label: "UPCOMING" },
  { bucket: "no-date", label: "NO DUE DATE" },
];

export function MyTasksScreen({ onOpenTask }: { onOpenTask: (projectId: string, taskId: string) => void }) {
  const { showToast } = useToast();
  const { tasks, loading } = useMyTasks();
  const { projects } = useTaskProjectsList();
  const projectSharedById = useMemo(() => {
    const map = new Map<string, boolean>();
    projects.forEach((p) => map.set(p.id, p.isShared));
    return map;
  }, [projects]);
  const today = todayIso();

  const grouped = useMemo(() => {
    const map = new Map<DueDateBucket, Task[]>();
    GROUPS.forEach((g) => map.set(g.bucket, []));
    tasks
      .filter((t) => !t.completed)
      .forEach((t) => map.get(getDueDateBucket(t.dueDate, today))!.push(t));
    return map;
  }, [tasks, today]);

  // One handler per action, shared by every row, so memo(TaskRow) can skip
  // rows whose data didn't change. My Tasks spans projects, so each looks
  // its task's projectId up by id rather than receiving a bound Task.
  // Depending on `tasks` costs nothing: a new snapshot replaces every task
  // object anyway, so those renders were never skippable.
  const handleToggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      try {
        await updateTask(task.projectId, id, { completed, status: completed ? "complete" : "todo" });
      } catch (err) {
        console.warn("[tasks] my-tasks toggle complete failed", err);
        showToast("Couldn't update the task. Please try again.");
      }
    },
    [tasks, showToast],
  );

  const handleTitleChange = useCallback(
    async (id: string, title: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      try {
        await updateTask(task.projectId, id, { title });
      } catch (err) {
        console.warn("[tasks] my-tasks rename failed", err);
        showToast("Couldn't rename the task. Please try again.");
      }
    },
    [tasks, showToast],
  );

  const handleDueDateChange = useCallback(
    async (id: string, dueDate: string | null) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      try {
        await updateTask(task.projectId, id, { dueDate });
      } catch (err) {
        console.warn("[tasks] my-tasks due date change failed", err);
        showToast("Couldn't update the due date. Please try again.");
      }
    },
    [tasks, showToast],
  );

  const handleStatusChange = useCallback(
    async (id: string, status: TaskStatus) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      try {
        await updateTask(task.projectId, id, { status, completed: status === "complete" });
      } catch (err) {
        console.warn("[tasks] my-tasks status change failed", err);
        showToast("Couldn't update the status. Please try again.");
      }
    },
    [tasks, showToast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      try {
        await deleteTask(task.projectId, id);
      } catch (err) {
        console.warn("[tasks] my-tasks delete failed", err);
        showToast("Couldn't delete the task. Please try again.");
      }
    },
    [tasks, showToast],
  );

  const handleOpenDrawer = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (task) onOpenTask(task.projectId, task.id);
    },
    [tasks, onOpenTask],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        {[0, 1, 2].map((i) => <div key={i} className="h-[46px] rounded-brand-sm bg-os-100 animate-pulse" />)}
      </div>
    );
  }

  const hasAny = tasks.some((t) => !t.completed);
  if (!hasAny) {
    return (
      <p className="my-5 font-light text-[13.5px] text-os-500 text-center border border-dashed border-os-300 p-5 rounded-brand-sm">
        No tasks assigned to you right now.
      </p>
    );
  }

  return (
    <div>
      {GROUPS.map(({ bucket, label }) => {
        const items = grouped.get(bucket) || [];
        if (!items.length) return null;
        return (
          <div key={bucket} className="mb-5">
            <div className="font-bold text-[11px] tracking-[.14em] uppercase text-os-ink border-b-2 border-os-ink pb-[6px] mb-1">{label}</div>
            {items.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projectId={task.projectId}
                isShared={projectSharedById.get(task.projectId) ?? false}
                showProject
                onToggleComplete={handleToggleComplete}
                onTitleChange={handleTitleChange}
                onDueDateChange={handleDueDateChange}
                onStatusChange={handleStatusChange}
                onOpenDrawer={handleOpenDrawer}
                onDelete={handleDelete}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`. In Project Detail's List view, change a task's due
date and status via the new inline controls; confirm both persist after
a refresh, and that setting status to Complete via the select also fills
in the checkbox (and vice versa). Open My Tasks with at least one
assigned task; confirm the same two controls work there too, and that a
due-date change moves the task into the correct OVERDUE/TODAY/UPCOMING/NO
DUE DATE group after the change takes effect.

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/TaskRow.tsx src/features/tasks/TaskListView.tsx src/features/tasks/MyTasksScreen.tsx
git commit -m "feat: inline due date and status editing in List view and My Tasks"
```

---

### Task 4: Final cross-check

**Files:** none expected — this task verifies Tasks 1-3 and fixes anything it finds.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests PASS. No test file changed in this plan, so this is a
regression check, not new coverage — confirm nothing in Tasks 1-3 broke
an existing test (in particular anything touching `TaskRow`, `TaskListView`,
`MyTasksScreen`, or the accordion files).

- [ ] **Step 2: Run the full build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 3: Verify there is exactly one `STATUS_LABEL`/`STATUS_CLASS` definition**

Run: `grep -rn "STATUS_LABEL\s*:\s*Record<TaskStatus" src/features/tasks/` (or equivalent search)
Expected: exactly one match, in `taskStatusStyle.ts`. If `ProjectPreviewTaskRow.tsx` or `TaskRow.tsx` still defines its own copy, that's a defect — remove it and import from `taskStatusStyle.ts` instead.

- [ ] **Step 4: Verify status-change semantics match the drawer everywhere**

Read `TaskDrawer.tsx`'s status `<select>` onChange handler, then read the
onStatusChange handlers added in Tasks 2 and 3 (in `ProjectAccordionTasks.tsx`,
`TaskListView.tsx`, `MyTasksScreen.tsx`). Confirm every one of them calls
`updateTask(..., { status, completed: status === "complete" })` — the same
pair of fields, not just `status` alone. A handler that omits `completed`
would let status and the completion checkbox disagree.

- [ ] **Step 5: Manual pass across all three surfaces**

Run `npm run dev`. Change a single task's status from Project Detail's
List view, then check it shows the same new status in My Tasks (if
assigned to you) and in the Projects screen's accordion (expand its
project) without a page refresh — all three should be reading the same
live Firestore listener data.

- [ ] **Step 6: Commit any fixes found**

If Steps 1-5 surface an issue, fix it and commit separately with a
message describing the specific defect. If everything already passes, no
commit is needed for this task.
