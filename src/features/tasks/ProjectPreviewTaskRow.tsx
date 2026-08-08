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
