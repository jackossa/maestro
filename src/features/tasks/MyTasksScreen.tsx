import { useMemo } from "react";
import { useMyTasks } from "./useMyTasks";
import { useTaskProjectsList } from "./useTaskProjectsList";
import { getDueDateBucket, type DueDateBucket } from "./dueDateBucket";
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
  const today = new Date().toISOString().slice(0, 10);

  const grouped = useMemo(() => {
    const map = new Map<DueDateBucket, Task[]>();
    GROUPS.forEach((g) => map.set(g.bucket, []));
    tasks
      .filter((t) => !t.completed)
      .forEach((t) => map.get(getDueDateBucket(t.dueDate, today))!.push(t));
    return map;
  }, [tasks, today]);

  async function handleToggleComplete(task: Task, completed: boolean) {
    try {
      await updateTask(task.projectId, task.id, { completed, status: completed ? "complete" : "todo" });
    } catch (err) {
      console.warn("[tasks] my-tasks toggle complete failed", err);
      showToast("Couldn't update the task. Please try again.");
    }
  }

  async function handleTitleChange(task: Task, title: string) {
    try {
      await updateTask(task.projectId, task.id, { title });
    } catch (err) {
      console.warn("[tasks] my-tasks rename failed", err);
      showToast("Couldn't rename the task. Please try again.");
    }
  }

  async function handleDelete(task: Task) {
    try {
      await deleteTask(task.projectId, task.id);
    } catch (err) {
      console.warn("[tasks] my-tasks delete failed", err);
      showToast("Couldn't delete the task. Please try again.");
    }
  }

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
                onToggleComplete={(c) => handleToggleComplete(task, c)}
                onTitleChange={(t) => handleTitleChange(task, t)}
                onOpenDrawer={() => onOpenTask(task.projectId, task.id)}
                onDelete={() => handleDelete(task)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
