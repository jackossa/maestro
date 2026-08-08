import { memo } from "react";
import { Initial } from "./AssigneePicker";
import { todayIso } from "./dueDateBucket";
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

// Deliberately not reusing the SHARED/PRIVATE badge's bg-os-100/text-os-600
// and bg-os-orange-050/text-os-orange-700 pairs here -- those exact
// background/text combinations are already claimed by the project row's
// sharing badge one level up, and reusing them would make "todo" read as
// "private" and "in progress" read as "shared" at a glance.
const STATUS_CLASS: Record<TaskStatus, string> = {
  todo: "bg-os-200 text-os-700",
  in_progress: "bg-os-blue/10 text-os-800",
  complete: "bg-os-orange-100 text-os-orange-700",
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
      <div className={`flex-none w-[76px] text-[11px] max-md:hidden ${isOverdue ? "text-os-orange-700 font-bold" : "text-os-600"}`}>
        {task.dueDate || "—"}
      </div>
      <div className={`flex-none px-2 py-[2px] rounded-full font-bold text-[9.5px] tracking-[.03em] ${STATUS_CLASS[task.status]}`}>
        {STATUS_LABEL[task.status]}
      </div>
    </div>
  );
}

export const ProjectPreviewTaskRow = memo(ProjectPreviewTaskRowImpl);
