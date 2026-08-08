import { useCallback, useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "../../shared/state/auth";
import { useToast } from "../../shared/state/toast";
import { computeSortOrder } from "./sortOrder";
import { sortProjectsForDisplay } from "./sortProjects";
import { createTaskProject, deleteTaskProjectCascade, toggleTaskProjectShared, updateTaskProjectSortOrder } from "./taskProjectsApi";
import { useTaskProjectsList } from "./useTaskProjectsList";
import { ProjectAccordionTasks } from "./ProjectAccordionTasks";
import type { TaskProject } from "./types";

// Memoized drag handle element, same pattern as TaskListView's
// SortableTaskRow -- handing a freshly-allocated element to a memoized
// child on every render would defeat memo's shallow comparison regardless
// of how stable the row's other props are.
function SortableProjectRow({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
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

// Compact rows, not cards -- mirrors Pipeline's existing list-row density.
// Open-task count and nearest due date require reading each project's own
// tasks; V1 keeps this screen fast by omitting those two figures from the
// row (they'd need one extra Firestore read per project on every render)
// and shows them instead inside Project Detail's own toolbar, where the
// task list is already loaded. See the design spec's acceptance criteria
// -- "nearest upcoming due date if available" is satisfied at the project
// level, just one screen deeper, rather than paying for it on every row
// of a screen whose whole point is being fast to scan.
export function ProjectsScreen({ onOpenProject, onOpenTask }: { onOpenProject: (id: string) => void; onOpenTask: (projectId: string, taskId: string) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { projects, loading } = useTaskProjectsList();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback((id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const sorted = useMemo(() => sortProjectsForDisplay(projects), [projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !user) {
      setCreating(false);
      setNewName("");
      return;
    }
    setCreating(false);
    setNewName("");
    const lastOrdered = [...sorted].reverse().find((p) => typeof p.sortOrder === "number");
    const sortOrder = computeSortOrder(lastOrdered?.sortOrder ?? null, null);
    try {
      const id = await createTaskProject(name, user.uid, user.displayName, sortOrder);
      onOpenProject(id);
    } catch (err) {
      console.warn("[tasks] create project failed", err);
      showToast("Couldn't create the project. Please try again.");
    }
  }

  async function handleToggleShared(p: TaskProject) {
    try {
      await toggleTaskProjectShared(p.id, !p.isShared);
    } catch (err) {
      console.warn("[tasks] toggle shared failed", err);
      showToast("Couldn't update sharing. Please try again.");
    }
  }

  async function handleDelete(p: TaskProject) {
    if (!window.confirm(`Delete "${p.name}"? This removes all of its tasks and cannot be undone.`)) return;
    try {
      await deleteTaskProjectCascade(p.id);
    } catch (err) {
      console.warn("[tasks] delete project failed", err);
      showToast("Couldn't delete the project. Please try again.");
    }
  }

  const handleReorder = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeIndex = sorted.findIndex((p) => p.id === active.id);
      const overIndex = sorted.findIndex((p) => p.id === over.id);
      if (activeIndex === -1 || overIndex === -1) return;
      const reordered = [...sorted];
      const [moved] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, moved);
      const before = reordered[overIndex - 1]?.sortOrder ?? null;
      const after = reordered[overIndex + 1]?.sortOrder ?? null;
      try {
        await updateTaskProjectSortOrder(moved.id, computeSortOrder(before, after));
      } catch (err) {
        console.warn("[tasks] reorder project failed", err);
        showToast("Couldn't reorder. Please try again.");
      }
    },
    [sorted, showToast],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-xs tracking-[.14em] uppercase text-os-ink">Projects</div>
        {creating ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            onBlur={handleCreate}
            placeholder="Project name"
            className="box-border px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink w-[220px]"
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="px-[14px] py-[7px] border border-os-orange bg-os-orange text-white font-bold text-[11px] tracking-[.06em] rounded-full hover:bg-accent-hover"
          >
            + NEW PROJECT
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[46px] rounded-brand-sm bg-os-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <p className="my-5 font-light text-[13.5px] text-os-500 text-center border border-dashed border-os-300 p-5 rounded-brand-sm">
          No projects yet — click + New Project to get started.
        </p>
      )}

      {!loading && sorted.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
          <SortableContext items={sorted.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {sorted.map((p) => (
              <SortableProjectRow key={p.id} id={p.id}>
                {(dragHandle) => (
                  <div>
                    <div className="flex items-center gap-3 min-h-[46px] px-[10px] border-b border-os-200 hover:bg-os-50">
                      {dragHandle}
                      <button
                        onClick={() => handleToggleExpand(p.id)}
                        aria-label={expanded.has(p.id) ? "Collapse tasks" : "Expand tasks"}
                        className="flex-none w-4 text-os-500"
                      >
                        {expanded.has(p.id) ? "▾" : "▸"}
                      </button>
                      <button onClick={() => onOpenProject(p.id)} className="flex-1 min-w-0 text-left font-bold text-[13.5px] text-os-ink truncate">
                        {p.name}
                      </button>
                      <div className="flex-none text-[11.5px] text-os-600 w-[120px] truncate">{p.createdByName}</div>
                      <button
                        onClick={() => handleToggleShared(p)}
                        disabled={p.createdBy !== user?.uid}
                        title={p.createdBy === user?.uid ? "Toggle sharing" : "Only the owner can change sharing"}
                        className={`flex-none px-[10px] py-[4px] rounded-full font-bold text-[10px] tracking-[.04em] border ${
                          p.isShared ? "bg-os-orange-050 text-os-orange-700 border-os-orange-300" : "bg-os-100 text-os-600 border-os-200"
                        } disabled:cursor-not-allowed`}
                      >
                        {p.isShared ? "SHARED" : "PRIVATE"}
                      </button>
                      {p.createdBy === user?.uid && (
                        <button
                          onClick={() => handleDelete(p)}
                          title="Delete project"
                          className="flex-none px-2 py-[5px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {expanded.has(p.id) && <ProjectAccordionTasks projectId={p.id} onOpenTask={onOpenTask} />}
                  </div>
                )}
              </SortableProjectRow>
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
