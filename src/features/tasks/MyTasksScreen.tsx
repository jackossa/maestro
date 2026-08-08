import { useCallback, useMemo } from "react";
import { useMyTasks } from "./useMyTasks";
import { useTaskProjectsList } from "./useTaskProjectsList";
import { getDueDateBucket, todayIso, type DueDateBucket } from "./dueDateBucket";
import { TaskRow } from "./TaskRow";
import { updateTask, deleteTask } from "./tasksApi";
import { useToast } from "../../shared/state/toast";
import type { Task } from "./types";

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
