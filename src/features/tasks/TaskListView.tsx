import { useCallback, useMemo, useState } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { computeSortOrder } from "./sortOrder";
import { createTask, deleteTask, updateTask } from "./tasksApi";
import { TaskRow } from "./TaskRow";
import type { Task } from "./types";
import { useAuth } from "../../shared/state/auth";
import { useToast } from "../../shared/state/toast";

function SortableTaskRow({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  // Memoized because this element is handed to the memoized TaskRow as a
  // prop: rebuilding it on every parent render would fail memo's shallow
  // comparison (a fresh React element is a fresh object) and re-render
  // every row regardless of how stable the callbacks are. `attributes` and
  // `listeners` are themselves memoized by useSortable.
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

export function TaskListView({
  projectId,
  projectName,
  isShared,
  tasks,
  visibleTaskIds,
  onOpenDrawer,
}: {
  projectId: string;
  projectName: string;
  isShared: boolean;
  tasks: Task[];
  visibleTaskIds?: Set<string>;
  onOpenDrawer: (taskId: string) => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [addingTop, setAddingTop] = useState(false);
  const [draft, setDraft] = useState("");

  const topLevel = useMemo(
    () => tasks.filter((t) => !t.parentTaskId && (!visibleTaskIds || visibleTaskIds.has(t.id))),
    [tasks, visibleTaskIds],
  );
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

  // Defined once and passed by reference to every TaskRow (top-level and
  // subtask alike) so memo(TaskRow)'s shallow prop comparison can actually
  // succeed. Each takes the task id rather than closing over a Task, which
  // is what lets one function serve every row. `updateTask`/`deleteTask`
  // are module-level imports and `showToast` is a useCallback from the
  // toast provider, so these identities only change when projectId does.
  const handleToggleExpand = useCallback((id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

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

  const handleTitleChange = useCallback(
    async (id: string, title: string) => {
      try {
        await updateTask(projectId, id, { title });
      } catch (err) {
        console.warn("[tasks] rename task failed", err);
        showToast("Couldn't rename the task. Please try again.");
      }
    },
    [projectId, showToast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTask(projectId, id);
      } catch (err) {
        console.warn("[tasks] delete task failed", err);
        showToast("Couldn't delete the task. Please try again.");
      }
    },
    [projectId, showToast],
  );

  async function handleReorderTop(event: DragEndEvent) {
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
  }

  async function handleReorderSubtasks(parentId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const siblings = subtasksByParent.get(parentId) || [];
    const activeIndex = siblings.findIndex((t) => t.id === active.id);
    const overIndex = siblings.findIndex((t) => t.id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;
    const reordered = [...siblings];
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
  }

  return (
    <div>
      {topLevel.length === 0 && !addingTop && (
        <p className="my-5 font-light text-[13.5px] text-os-500 text-center border border-dashed border-os-300 p-5 rounded-brand-sm">
          No tasks yet — add your first one below.
        </p>
      )}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleReorderTop}>
        <SortableContext items={topLevel.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {topLevel.map((task) => {
            const subtasks = subtasksByParent.get(task.id) || [];
            const isExpanded = expanded.has(task.id);
            return (
              <SortableTaskRow key={task.id} id={task.id}>
                {(dragHandle) => (
                  <div>
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
                    {isExpanded && (
                      <div className="pl-[26px]">
                        <DndContext collisionDetection={closestCenter} onDragEnd={(e) => handleReorderSubtasks(task.id, e)}>
                          <SortableContext items={subtasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                            {subtasks.map((sub) => (
                              <SortableTaskRow key={sub.id} id={sub.id}>
                                {(subHandle) => (
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
                                )}
                              </SortableTaskRow>
                            ))}
                          </SortableContext>
                        </DndContext>
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
                )}
              </SortableTaskRow>
            );
          })}
        </SortableContext>
      </DndContext>
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
