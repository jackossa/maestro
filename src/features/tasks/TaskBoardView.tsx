import { memo, useMemo, useState } from "react";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
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

// Board view orders by its own boardSortOrder, independent of List view's
// sortOrder. The fallback covers task docs written before boardSortOrder
// existed -- without it they'd sort (and compute new orders) as NaN.
function boardOrder(task: Task): number {
  return task.boardSortOrder ?? task.sortOrder;
}

// The card in the DragOverlay is a non-interactive preview.
const noop = () => {};

// Memoized alongside TaskCard: an un-memoized wrapper would re-render its
// memoized child's element anyway, so the whole chain from Column down has
// to hold prop identity for the memo to buy anything.
function SortableCardImpl({ task, subtaskCount, onOpen }: { task: Task; subtaskCount: number; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { status: task.status } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} subtaskCount={subtaskCount} onOpen={onOpen} />
    </div>
  );
}
const SortableCard = memo(SortableCardImpl);

function Column({ status, label, items, subtaskCounts, onOpenDrawer }: { status: TaskStatus; label: string; items: Task[]; subtaskCounts: Map<string, number>; onOpenDrawer: (id: string) => void }) {
  const { setNodeRef } = useDroppable({ id: `column:${status}` });
  return (
    <div ref={setNodeRef} className="bg-os-50 rounded-brand-md p-[10px] min-h-[80px]">
      <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 mb-2">
        {label} <span className="font-medium text-os-500">({items.length})</span>
      </div>
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {items.map((t) => (
          <SortableCard key={t.id} task={t} subtaskCount={subtaskCounts.get(t.id) || 0} onOpen={onOpenDrawer} />
        ))}
      </SortableContext>
      {items.length === 0 && <div className="text-[11px] text-os-400 italic px-1 py-2">No tasks</div>}
    </div>
  );
}

export function TaskBoardView({ projectId, tasks, onOpenDrawer }: { projectId: string; tasks: Task[]; onOpenDrawer: (taskId: string) => void }) {
  const { showToast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

  // PointerSensor's activation distance keeps a plain click on a card from
  // being swallowed as a drag. Passing an explicit `sensors` prop REPLACES
  // dnd-kit's defaults, so KeyboardSensor has to be listed here too or the
  // Board loses keyboard reordering entirely (the design spec requires it).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);
  const subtaskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.filter((t) => t.parentTaskId).forEach((t) => counts.set(t.parentTaskId!, (counts.get(t.parentTaskId!) || 0) + 1));
    return counts;
  }, [tasks]);

  const byColumn = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    COLUMNS.forEach((c) => map.set(c.status, topLevel.filter((t) => t.status === c.status).sort((a, b) => boardOrder(a) - boardOrder(b))));
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

    const sameColumn = targetStatus === activeTask.status;
    let before: number | null;
    let after: number | null;

    if (sameColumn) {
      // Splice out, then splice back in -- the same shape as
      // TaskListView's handleReorderTop, and the reason it has to be done
      // this way: removing the dragged card without reinserting it shifts
      // every later card up one index, so a downward move would read
      // neighbours one position too early and land back where it started.
      const column = byColumn.get(targetStatus) || [];
      const activeIndex = column.findIndex((t) => t.id === activeTask.id);
      if (activeIndex === -1) return;
      const overIndex = column.findIndex((t) => t.id === over.id);
      const reordered = [...column];
      const [moved] = reordered.splice(activeIndex, 1);
      // over.id is the column droppable rather than a card when the drop
      // lands on empty space below the last card: that means "move to end".
      const insertAt = overIndex === -1 ? reordered.length : overIndex;
      reordered.splice(insertAt, 0, moved);
      before = reordered[insertAt - 1] ? boardOrder(reordered[insertAt - 1]) : null;
      after = reordered[insertAt + 1] ? boardOrder(reordered[insertAt + 1]) : null;
    } else {
      // Cross-column: the card was never in the target column's array, so
      // there is nothing to splice out -- just find the insert point.
      const targetItems = (byColumn.get(targetStatus) || []).filter((t) => t.id !== activeTask.id);
      const overIndex = targetItems.findIndex((t) => t.id === over.id);
      const insertAt = overIndex === -1 ? targetItems.length : overIndex;
      before = targetItems[insertAt - 1] ? boardOrder(targetItems[insertAt - 1]) : null;
      after = targetItems[insertAt] ? boardOrder(targetItems[insertAt]) : null;
    }

    const boardSortOrder = computeSortOrder(before, after);
    if (sameColumn && boardSortOrder === boardOrder(activeTask)) return;

    try {
      await moveTaskToStatus(projectId, activeTask.id, targetStatus, boardSortOrder);
    } catch (err) {
      console.warn("[tasks] board move failed", err);
      showToast("Couldn't move the task. Please try again.");
    }
  }

  const activeTask = activeId ? topLevel.find((t) => t.id === activeId) : null;

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
        {activeTask ? <TaskCard task={activeTask} subtaskCount={subtaskCounts.get(activeTask.id) || 0} onOpen={noop} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
