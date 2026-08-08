import { useState } from "react";
import { useAuth } from "../../shared/state/auth";
import { useToast } from "../../shared/state/toast";
import { renameTaskProject, toggleTaskProjectShared } from "./taskProjectsApi";
import { useTaskProjectsList } from "./useTaskProjectsList";
import { useProjectTasks } from "./useProjectTasks";
import { TaskListView } from "./TaskListView";
import { TaskBoardView } from "./TaskBoardView";

export function ProjectDetailScreen({ projectId, onBack, onOpenDrawer }: { projectId: string; onBack: () => void; onOpenDrawer: (taskId: string) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { projects } = useTaskProjectsList();
  const project = projects.find((p) => p.id === projectId);
  const { tasks, loading } = useProjectTasks(projectId);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "board">(() => (localStorage.getItem(`tasksView.${projectId}`) as "list" | "board") || "list");

  function setViewModePersist(mode: "list" | "board") {
    setViewMode(mode);
    localStorage.setItem(`tasksView.${projectId}`, mode);
  }

  if (!project) {
    return (
      <div>
        <button onClick={onBack} className="mb-4 font-medium text-[12.5px] text-os-600 hover:text-os-orange-700">← Projects</button>
        <p className="font-light text-[13.5px] text-os-500">Loading…</p>
      </div>
    );
  }

  async function commitRename() {
    const name = draftName.trim();
    setEditingName(false);
    if (!name || name === project!.name) return;
    try {
      await renameTaskProject(projectId, name);
    } catch (err) {
      console.warn("[tasks] rename project failed", err);
      showToast("Couldn't rename the project. Please try again.");
    }
  }

  async function handleToggleShared() {
    try {
      await toggleTaskProjectShared(projectId, !project!.isShared);
    } catch (err) {
      console.warn("[tasks] toggle shared failed", err);
      showToast("Couldn't update sharing. Please try again.");
    }
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 font-medium text-[12.5px] text-os-600 hover:text-os-orange-700">← Projects</button>
      <div className="flex items-center justify-between gap-4 min-h-[52px] mb-4">
        {editingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingName(false); }}
            className="box-border px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-bold text-[20px] text-os-ink"
          />
        ) : (
          <button
            onClick={() => { setDraftName(project!.name); setEditingName(true); }}
            disabled={project!.createdBy !== user?.uid}
            className="font-bold text-[24px] font-display text-os-ink text-left disabled:cursor-default"
          >
            {project!.name}
          </button>
        )}
        {project!.createdBy === user?.uid && (
          <button
            onClick={handleToggleShared}
            className={`flex-none px-4 py-[8px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
              project!.isShared ? "bg-os-orange-050 text-os-orange-700 border-os-orange-300" : "bg-white text-os-700 border-os-300"
            }`}
          >
            {project!.isShared ? "SHARED WITH TEAM" : "SHARE WITH TEAM"}
          </button>
        )}
      </div>

      <div className="flex mb-4">
        <button
          onClick={() => setViewModePersist("list")}
          className="font-bold text-[11.5px] px-4 py-[7px] border rounded-l-full cursor-pointer"
          style={{ borderColor: viewMode === "list" ? "#EB5B28" : "#d2d1d3", background: viewMode === "list" ? "#EB5B28" : "#fff", color: viewMode === "list" ? "#fff" : "#57575a" }}
        >
          LIST
        </button>
        <button
          onClick={() => setViewModePersist("board")}
          className="font-bold text-[11.5px] px-4 py-[7px] border border-l-0 rounded-r-full cursor-pointer"
          style={{ borderColor: viewMode === "board" ? "#EB5B28" : "#d2d1d3", background: viewMode === "board" ? "#EB5B28" : "#fff", color: viewMode === "board" ? "#fff" : "#57575a" }}
        >
          BOARD
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[46px] rounded-brand-sm bg-os-100 animate-pulse" />
          ))}
        </div>
      ) : viewMode === "list" ? (
        <TaskListView projectId={projectId} projectName={project!.name} isShared={project!.isShared} tasks={tasks} onOpenDrawer={onOpenDrawer} />
      ) : (
        <TaskBoardView projectId={projectId} tasks={tasks} onOpenDrawer={onOpenDrawer} />
      )}
    </div>
  );
}
