import { useCallback, useMemo } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "../../shared/state/toast";
import { computeSortOrder } from "./sortOrder";
import { updateTask } from "./tasksApi";
import { useProjectTasks } from "./useProjectTasks";
import { ProjectPreviewTaskRow } from "./ProjectPreviewTaskRow";
import type { TaskStatus } from "./types";

// Memoized drag handle, same reasoning as TaskListView's SortableTaskRow
// and ProjectsScreen's SortableProjectRow.
function SortablePreviewRow({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
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

// One expanded project's task preview: its own useProjectTasks listener
// (live only while this project is expanded -- collapsing unmounts this
// component, tearing the listener down), its own DndContext scoped to
// just this project's top-level tasks. See the design spec's "If two or
// more projects are expanded at once" note -- this scoping is what keeps
// a drag from ever resolving against a DIFFERENT project's task list, not
// just a convention nobody violates by accident.
export function ProjectAccordionTasks({ projectId, onOpenTask }: { projectId: string; onOpenTask: (projectId: string, taskId: string) => void }) {
  const { tasks, loading } = useProjectTasks(projectId);
  const { showToast } = useToast();

  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const handleDueDateChange = useCallback(
    async (id: string, dueDate: string | null) => {
      try {
        await updateTask(projectId, id, { dueDate });
      } catch (err) {
        console.warn("[tasks] due date change failed", err);
        showToast("Couldn't update the due date. Please try again.");
      }
    },
    [projectId, showToast],
  );

  const handleStatusChange = useCallback(
    async (id: string, status: TaskStatus) => {
      try {
        await updateTask(projectId, id, { status, completed: status === "complete" });
      } catch (err) {
        console.warn("[tasks] status change failed", err);
        showToast("Couldn't update the status. Please try again.");
      }
    },
    [projectId, showToast],
  );

  const handleOpen = useCallback((id: string) => onOpenTask(projectId, id), [projectId, onOpenTask]);

  const handleReorder = useCallback(
    async (event: DragEndEvent) => {
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
    },
    [projectId, topLevel, showToast],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-1 pl-[26px] pr-[10px] py-1">
        {[0, 1].map((i) => (
          <div key={i} className="h-[32px] rounded-brand-sm bg-os-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (topLevel.length === 0) {
    return <p className="pl-[26px] pr-[10px] py-[10px] font-light text-[12px] text-os-500">No tasks yet.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
      <SortableContext items={topLevel.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {topLevel.map((task) => (
          <SortablePreviewRow key={task.id} id={task.id}>
            {(dragHandle) => (
              <ProjectPreviewTaskRow
                task={task}
                dragHandle={dragHandle}
                onToggleComplete={handleToggleComplete}
                onDueDateChange={handleDueDateChange}
                onStatusChange={handleStatusChange}
                onOpen={handleOpen}
              />
            )}
          </SortablePreviewRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}
