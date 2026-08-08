import { useState } from "react";
import { Drawer } from "../../shared/components/Drawer";
import { AssigneePicker } from "./AssigneePicker";
import { deleteTask, updateTask } from "./tasksApi";
import { useToast } from "../../shared/state/toast";
import type { Task, TaskStatus } from "./types";

const STATUS_LABELS: Record<TaskStatus, string> = { todo: "Todo", in_progress: "In Progress", complete: "Complete" };

export function TaskDrawer({
  projectId,
  taskId,
  tasks,
  isShared,
  onClose,
  onSelectTask,
}: {
  projectId: string;
  taskId: string | null;
  tasks: Task[];
  isShared: boolean;
  onClose: () => void;
  onSelectTask: (id: string) => void;
}) {
  const { showToast } = useToast();
  const task = tasks.find((t) => t.id === taskId) || null;
  const subtasks = task ? tasks.filter((t) => t.parentTaskId === task.id) : [];
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [draft, setDraft] = useState("");

  if (!task) return <Drawer open={!!taskId} onClose={onClose}><div /></Drawer>;

  async function save(fields: Partial<Pick<Task, "title" | "description" | "dueDate" | "status" | "completed">>) {
    try {
      await updateTask(projectId, task!.id, fields);
    } catch (err) {
      console.warn("[tasks] drawer save failed", err);
      showToast("Couldn't save. Please try again.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this task?")) return;
    try {
      await deleteTask(projectId, task!.id);
      onClose();
    } catch (err) {
      console.warn("[tasks] drawer delete failed", err);
      showToast("Couldn't delete the task. Please try again.");
    }
  }

  async function addSubtask() {
    const title = draft.trim();
    setDraft("");
    setAddingSubtask(false);
    if (!title) return;
    const { createTask } = await import("./tasksApi");
    const { computeSortOrder } = await import("./sortOrder");
    const siblingOrders = subtasks.map((s) => s.sortOrder);
    try {
      await createTask({
        projectId,
        parentTaskId: task!.id,
        title,
        sortOrder: computeSortOrder(siblingOrders.length ? Math.max(...siblingOrders) : null, null),
        createdBy: task!.createdBy,
        project: { name: task!.projectName },
      });
    } catch (err) {
      console.warn("[tasks] add subtask failed", err);
      showToast("Couldn't add the subtask. Please try again.");
    }
  }

  return (
    <Drawer open={!!taskId} onClose={onClose}>
      <div className="p-5">
        <input
          defaultValue={task.title}
          key={task.id}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== task.title) save({ title: v }); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-full mb-4 font-bold text-[20px] text-os-ink border-0 border-b-2 border-transparent focus:border-os-orange-300 focus:outline-none pb-1"
        />

        <button
          onClick={() => save({ completed: !task.completed, status: task.completed ? "todo" : "complete" })}
          className="flex items-center gap-2 mb-5 font-medium text-[13px] text-os-700"
        >
          <span className={`w-[18px] h-[18px] rounded-full border-2 ${task.completed ? "bg-os-orange border-os-orange" : "border-os-300"}`} />
          Complete
        </button>

        <div className="mb-4">
          <div className="font-bold text-[10px] tracking-[.1em] uppercase text-os-500 mb-1">Assignee</div>
          <AssigneePicker projectId={projectId} task={task} isShared={isShared} />
        </div>

        <div className="mb-4">
          <div className="font-bold text-[10px] tracking-[.1em] uppercase text-os-500 mb-1">Due date</div>
          <input
            type="date"
            defaultValue={task.dueDate || ""}
            key={task.id + "-date"}
            onChange={(e) => save({ dueDate: e.target.value || null })}
            className="box-border px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink"
          />
        </div>

        <div className="mb-4">
          <div className="font-bold text-[10px] tracking-[.1em] uppercase text-os-500 mb-1">Status</div>
          <select
            value={task.status}
            onChange={(e) => { const status = e.target.value as TaskStatus; save({ status, completed: status === "complete" }); }}
            className="box-border px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink"
          >
            {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <div className="font-bold text-[10px] tracking-[.1em] uppercase text-os-500 mb-1">Description</div>
          <textarea
            defaultValue={task.description || ""}
            key={task.id + "-desc"}
            onBlur={(e) => save({ description: e.target.value || null })}
            className="box-border w-full min-h-[70px] px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink resize-y"
          />
        </div>

        <div className="mb-6">
          <div className="font-bold text-[10px] tracking-[.1em] uppercase text-os-500 mb-1">Subtasks</div>
          {subtasks.map((s) => (
            <button key={s.id} onClick={() => onSelectTask(s.id)} className="flex items-center gap-2 w-full text-left py-[6px] font-medium text-[12.5px] text-os-700 hover:text-os-orange-700">
              <span className={`w-[14px] h-[14px] rounded-full border-2 flex-none ${s.completed ? "bg-os-orange border-os-orange" : "border-os-300"}`} />
              <span className={s.completed ? "line-through text-os-500" : ""}>{s.title}</span>
            </button>
          ))}
          {addingSubtask ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={addSubtask}
              onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setDraft(""); setAddingSubtask(false); } }}
              placeholder="Subtask title"
              className="box-border w-full mt-1 px-[8px] py-[5px] border border-os-300 rounded-[6px] bg-[#fdf4e3] font-medium text-[12.5px] text-os-ink"
            />
          ) : (
            <button onClick={() => setAddingSubtask(true)} className="mt-1 font-medium text-[12px] text-os-orange-700 hover:underline">
              + Add subtask
            </button>
          )}
        </div>

        <button onClick={handleDelete} className="font-bold text-[12px] text-os-500 hover:text-red-600">
          Delete Task
        </button>
      </div>
    </Drawer>
  );
}
