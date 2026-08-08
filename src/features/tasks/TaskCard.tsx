import { memo } from "react";
import { todayIso } from "./dueDateBucket";
import type { Task } from "./types";

// 10-12px padding, compact -- see the design spec's Board card example.
// Memoized for the same reason as TaskRow (see that component's comment)
// -- Board columns can hold many cards and shouldn't all re-render when
// one card's drag position or data changes. `onOpen` takes the task id so
// the Board can pass one stable handler to every card rather than a fresh
// closure per card per render, which is what makes the memo effective.
function TaskCardImpl({ task, subtaskCount, onOpen }: { task: Task; subtaskCount: number; onOpen: (id: string) => void }) {
  const today = todayIso();
  const isOverdue = !!task.dueDate && task.dueDate < today && !task.completed;

  return (
    <button onClick={() => onOpen(task.id)} className="w-full text-left bg-white border border-os-200 rounded-brand-sm px-[11px] py-[10px] mb-2 hover:border-os-orange/50">
      <div className="font-bold text-[12.5px] text-os-ink truncate">{task.title}</div>
      <div className="flex items-center justify-between mt-[6px]">
        <span className="text-[11px] text-os-600 truncate">{task.assigneeName || "Unassigned"}</span>
        <span className={`text-[11px] flex-none ml-2 ${isOverdue ? "text-os-orange-700 font-bold" : "text-os-500"}`}>{task.dueDate || ""}</span>
      </div>
      {subtaskCount > 0 && <div className="mt-1 text-[10px] text-os-500">{subtaskCount} subtask{subtaskCount === 1 ? "" : "s"}</div>}
    </button>
  );
}

export const TaskCard = memo(TaskCardImpl);
