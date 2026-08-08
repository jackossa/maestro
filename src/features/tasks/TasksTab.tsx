import { useState } from "react";
import { ProjectsScreen } from "./ProjectsScreen";

// Screen-switcher for the whole Task Management module, following the
// same view-based (no-router) convention as the rest of Maestro. Filled
// in incrementally: My Tasks (Task 16), Projects (Task 8), Project Detail
// (Task 9) all render through here.
export type TasksScreen = "my-tasks" | "projects" | "project-detail";

export function TasksTab() {
  const [screen, setScreen] = useState<TasksScreen>("my-tasks");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  function openProject(id: string) {
    setActiveProjectId(id);
    setScreen("project-detail");
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setScreen("my-tasks")}
          className={`px-4 py-[7px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
            screen === "my-tasks" ? "bg-os-orange text-white border-os-orange" : "bg-white text-os-700 border-os-300"
          }`}
        >
          MY TASKS
        </button>
        <button
          onClick={() => setScreen("projects")}
          className={`px-4 py-[7px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
            screen === "projects" || screen === "project-detail" ? "bg-os-orange text-white border-os-orange" : "bg-white text-os-700 border-os-300"
          }`}
        >
          PROJECTS
        </button>
      </div>
      {screen === "my-tasks" && <p className="font-light text-[13.5px] text-os-500">My Tasks — coming online in a later task.</p>}
      {screen === "projects" && <ProjectsScreen onOpenProject={openProject} />}
      {screen === "project-detail" && activeProjectId && (
        <p className="font-light text-[13.5px] text-os-500">
          Project Detail for {activeProjectId} — coming online in a later task.{" "}
          <button className="underline" onClick={() => setScreen("projects")}>Back</button>
        </p>
      )}
    </div>
  );
}
