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
