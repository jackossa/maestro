import { useMemo, useState } from "react";
import { computeSortOrder } from "./sortOrder";
import { createTask, deleteTask, updateTask } from "./tasksApi";
import { TaskRow } from "./TaskRow";
import type { Task } from "./types";
import { useAuth } from "../../shared/state/auth";
import { useToast } from "../../shared/state/toast";

// No drag-and-drop yet -- Task 10 adds dnd-kit sortable wiring on top of
// this rendering/inline-edit foundation.
export function TaskListView({
  projectId,
  projectName,
  tasks,
  onOpenDrawer,
}: {
  projectId: string;
  projectName: string;
  tasks: Task[];
  onOpenDrawer: (taskId: string) => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [addingTop, setAddingTop] = useState(false);
  const [draft, setDraft] = useState("");

  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);
  const subtasksByParent = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.filter((t) => t.parentTaskId).forEach((t) => {
      const list = map.get(t.parentTaskId!) || [];
      list.push(t);
      map.set(t.parentTaskId!, list);
    });
    return map;
  }, [tasks]);

  async function handleCreate(parentTaskId: string | null) {
    const title = draft.trim();
    setDraft("");
    setAddingTop(false);
    setAddingSubtaskFor(null);
    if (!title || !user) return;
    const siblings = parentTaskId ? subtasksByParent.get(parentTaskId) || [] : topLevel;
    const sortOrder = computeSortOrder(siblings.length ? siblings[siblings.length - 1].sortOrder : null, null);
    try {
      await createTask({ projectId, parentTaskId, title, sortOrder, createdBy: user.uid, project: { name: projectName } });
    } catch (err) {
      console.warn("[tasks] create task failed", err);
      showToast("Couldn't add the task. Please try again.");
    }
  }

  async function handleToggleComplete(task: Task, completed: boolean) {
    try {
      await updateTask(projectId, task.id, { completed, status: completed ? "complete" : "todo" });
    } catch (err) {
      console.warn("[tasks] toggle complete failed", err);
      showToast("Couldn't update the task. Please try again.");
    }
  }

  async function handleTitleChange(task: Task, title: string) {
    try {
      await updateTask(projectId, task.id, { title });
    } catch (err) {
      console.warn("[tasks] rename task failed", err);
      showToast("Couldn't rename the task. Please try again.");
    }
  }

  async function handleDelete(task: Task) {
    try {
      await deleteTask(projectId, task.id);
    } catch (err) {
      console.warn("[tasks] delete task failed", err);
      showToast("Couldn't delete the task. Please try again.");
    }
  }

  return (
    <div>
      {topLevel.length === 0 && !addingTop && (
        <p className="my-5 font-light text-[13.5px] text-os-500 text-center border border-dashed border-os-300 p-5 rounded-brand-sm">
          No tasks yet — add your first one below.
        </p>
      )}
      {topLevel.map((task) => {
        const subtasks = subtasksByParent.get(task.id) || [];
        const isExpanded = expanded.has(task.id);
        return (
          <div key={task.id}>
            <TaskRow
              task={task}
              hasSubtasks={subtasks.length > 0}
              expanded={isExpanded}
              onToggleExpand={() =>
                setExpanded((s) => { const next = new Set(s); next.has(task.id) ? next.delete(task.id) : next.add(task.id); return next; })
              }
              onToggleComplete={(c) => handleToggleComplete(task, c)}
              onTitleChange={(t) => handleTitleChange(task, t)}
              onOpenDrawer={() => onOpenDrawer(task.id)}
              onDelete={() => handleDelete(task)}
            />
            {isExpanded && (
              <div className="pl-[26px]">
                {subtasks.map((sub) => (
                  <TaskRow
                    key={sub.id}
                    task={sub}
                    compact
                    onToggleComplete={(c) => handleToggleComplete(sub, c)}
                    onTitleChange={(t) => handleTitleChange(sub, t)}
                    onOpenDrawer={() => onOpenDrawer(sub.id)}
                    onDelete={() => handleDelete(sub)}
                  />
                ))}
                {addingSubtaskFor === task.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => handleCreate(task.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate(task.id);
                      if (e.key === "Escape") { setDraft(""); setAddingSubtaskFor(null); }
                    }}
                    placeholder="Subtask title"
                    className="box-border w-[calc(100%-8px)] m-1 px-[8px] py-[5px] border border-os-300 rounded-[6px] bg-[#fdf4e3] font-medium text-[12.5px] text-os-ink"
                  />
                ) : (
                  <button onClick={() => setAddingSubtaskFor(task.id)} className="w-full text-left px-[8px] py-[6px] font-medium text-[11.5px] text-os-500 hover:text-os-orange-700">
                    + Add subtask
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {addingTop ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => handleCreate(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate(null);
            if (e.key === "Escape") { setDraft(""); setAddingTop(false); }
          }}
          placeholder="Task title"
          className="box-border w-full mt-1 px-[10px] py-[8px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink"
        />
      ) : (
        <button onClick={() => setAddingTop(true)} className="mt-2 font-medium text-[12.5px] text-os-orange-700 hover:underline">
          + Add Task
        </button>
      )}
    </div>
  );
}
