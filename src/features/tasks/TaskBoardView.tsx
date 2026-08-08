import { useMemo } from "react";
import type { Task, TaskStatus } from "./types";
import { TaskCard } from "./TaskCard";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "TO DO" },
  { status: "in_progress", label: "IN PROGRESS" },
  { status: "complete", label: "COMPLETE" },
];

// No drag-and-drop yet -- Task 13 adds dnd-kit cross-column dragging on
// top of this rendering. Only top-level tasks appear as cards; subtasks
// aren't shown on the board (List view is where subtasks live).
export function TaskBoardView({ tasks, onOpenDrawer }: { tasks: Task[]; onOpenDrawer: (taskId: string) => void }) {
  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);
  const subtaskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.filter((t) => t.parentTaskId).forEach((t) => counts.set(t.parentTaskId!, (counts.get(t.parentTaskId!) || 0) + 1));
    return counts;
  }, [tasks]);

  return (
    <div className="grid grid-cols-3 gap-[14px] max-md:grid-cols-1">
      {COLUMNS.map((col) => {
        const items = topLevel.filter((t) => t.status === col.status).sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <div key={col.status} className="bg-os-50 rounded-brand-md p-[10px]">
            <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 mb-2">
              {col.label} <span className="font-medium text-os-500">({items.length})</span>
            </div>
            {items.map((t) => (
              <TaskCard key={t.id} task={t} subtaskCount={subtaskCounts.get(t.id) || 0} onOpen={() => onOpenDrawer(t.id)} />
            ))}
            {items.length === 0 && <div className="text-[11px] text-os-400 italic px-1 py-2">No tasks</div>}
          </div>
        );
      })}
    </div>
  );
}
