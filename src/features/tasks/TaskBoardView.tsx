import { useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { computeSortOrder } from "./sortOrder";
import { moveTaskToStatus } from "./tasksApi";
import { useToast } from "../../shared/state/toast";
import { TaskCard } from "./TaskCard";
import type { Task, TaskStatus } from "./types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "TO DO" },
  { status: "in_progress", label: "IN PROGRESS" },
  { status: "complete", label: "COMPLETE" },
];

function SortableCard({ task, subtaskCount, onOpen }: { task: Task; subtaskCount: number; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { status: task.status } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} subtaskCount={subtaskCount} onOpen={onOpen} />
    </div>
  );
}

function Column({ status, label, items, subtaskCounts, onOpenDrawer }: { status: TaskStatus; label: string; items: Task[]; subtaskCounts: Map<string, number>; onOpenDrawer: (id: string) => void }) {
  const { setNodeRef } = useDroppable({ id: `column:${status}` });
  return (
    <div ref={setNodeRef} className="bg-os-50 rounded-brand-md p-[10px] min-h-[80px]">
      <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 mb-2">
        {label} <span className="font-medium text-os-500">({items.length})</span>
      </div>
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {items.map((t) => (
          <SortableCard key={t.id} task={t} subtaskCount={subtaskCounts.get(t.id) || 0} onOpen={() => onOpenDrawer(t.id)} />
        ))}
      </SortableContext>
      {items.length === 0 && <div className="text-[11px] text-os-400 italic px-1 py-2">No tasks</div>}
    </div>
  );
}

export function TaskBoardView({ projectId, tasks, onOpenDrawer }: { projectId: string; tasks: Task[]; onOpenDrawer: (taskId: string) => void }) {
  const { showToast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);
  const subtaskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.filter((t) => t.parentTaskId).forEach((t) => counts.set(t.parentTaskId!, (counts.get(t.parentTaskId!) || 0) + 1));
    return counts;
  }, [tasks]);

  const byColumn = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    COLUMNS.forEach((c) => map.set(c.status, topLevel.filter((t) => t.status === c.status).sort((a, b) => a.sortOrder - b.sortOrder)));
    return map;
  }, [topLevel]);

  function columnOf(id: string): TaskStatus | null {
    if (id.startsWith("column:")) return id.slice(7) as TaskStatus;
    const task = topLevel.find((t) => t.id === id);
    return task ? task.status : null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeTask = topLevel.find((t) => t.id === active.id);
    if (!activeTask) return;
    const targetStatus = columnOf(String(over.id));
    if (!targetStatus) return;

    const targetItems = (byColumn.get(targetStatus) || []).filter((t) => t.id !== activeTask.id);
    const overIndex = targetItems.findIndex((t) => t.id === over.id);
    const insertAt = overIndex === -1 ? targetItems.length : overIndex;
    const before = targetItems[insertAt - 1]?.sortOrder ?? null;
    const after = targetItems[insertAt]?.sortOrder ?? null;
    const sortOrder = computeSortOrder(before, after);

    if (targetStatus === activeTask.status && sortOrder === activeTask.sortOrder) return;

    try {
      await moveTaskToStatus(projectId, activeTask.id, targetStatus, sortOrder);
    } catch (err) {
      console.warn("[tasks] board move failed", err);
      showToast("Couldn't move the task. Please try again.");
    }
  }

  const activeTask = activeId ? topLevel.find((t) => t.id === activeId) : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-3 gap-[14px] max-md:grid-cols-1">
        {COLUMNS.map((col) => (
          <Column key={col.status} status={col.status} label={col.label} items={byColumn.get(col.status) || []} subtaskCounts={subtaskCounts} onOpenDrawer={onOpenDrawer} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} subtaskCount={subtaskCounts.get(activeTask.id) || 0} onOpen={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
