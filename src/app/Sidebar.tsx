import React from "react";
import { useAppState } from "../shared/state/store";
import type { ProjectTab } from "../shared/state/store";

// Sidebar content depends on where you are: on Pipeline, no project tabs
// show; inside a project, a "← Pipeline" breadcrumb replaces the old
// always-visible project dropdown + NEW/COPY/DEL row. Settings is always
// reachable regardless of context. See the Pipeline Unification design
// spec, "Navigation & screens" and "Project creation & duplication".

const PROJECT_NAV_ITEMS: { tab: ProjectTab; label: string; icon: React.ReactNode }[] = [
  {
    tab: 1,
    label: "Project Information",
    icon: (
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />
    ),
  },
  {
    tab: 2,
    label: "Fee Calculation",
    icon: (
      <path d="M4 2h16v20H4z M8 6h8 M16 14v4 M12 10h.01 M8 10h.01 M12 14h.01 M8 14h.01 M12 18h.01 M8 18h.01" />
    ),
  },
  {
    tab: 3,
    label: "Project Schedule",
    icon: <path d="M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18" />,
  },
  {
    tab: 7,
    label: "Proposal Builder",
    icon: <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />,
  },
];

function SettingsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PipelineIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      <path d="M23 6 13.5 15.5 8.5 10.5 1 18 M17 6h6v6" />
    </svg>
  );
}

export function Sidebar() {
  const { state, goToPipeline, goToSettings, setProjectTab } = useAppState();
  const { store, view, projectTab } = state;
  const currentProject = store.projects[store.currentId];

  const savedAt = state.savedAt || currentProject?.updated || Date.now();
  const savedLabel =
    "Saved " + new Date(savedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <aside className="w-[236px] flex-none bg-os-charcoal text-white flex flex-col sticky top-4 h-[calc(100vh-32px)] my-4 ml-4 rounded-brand-xl shadow-glass border border-white/[.08] overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        <div className="px-[18px] pt-5 pb-[14px] border-b border-white/[.12] flex items-center gap-[10px]">
          <img src="/assets/logo-symbol-white.png" alt="Maestro" className="w-7 h-auto flex-none" />
          <div>
            <div className="font-bold text-lg leading-none font-display tracking-[.02em] text-white">MAESTRO</div>
            <div className="mt-1 font-bold text-[8.5px] tracking-[.2em] text-os-orange-300 uppercase">by Ossa Studio</div>
          </div>
        </div>

        {view === "project" ? (
          <>
            <button
              onClick={goToPipeline}
              className="flex items-center gap-2 mx-[10px] mt-[14px] mb-2 px-[14px] py-2 text-left rounded-full cursor-pointer font-medium text-[12.5px] text-white/70 hover:bg-white/[.08] hover:text-white"
            >
              <span aria-hidden="true">←</span>
              <span>Pipeline</span>
            </button>
            <div className="px-4 pt-1 pb-2 font-bold text-[11px] text-white truncate" title={currentProject?.data.info.name || "Untitled Project"}>
              {currentProject?.data.info.name || "Untitled Project"}
            </div>
            <div className="px-4 pb-2 font-bold text-[9.5px] tracking-[.18em] uppercase text-white/45">Navigate</div>
            <nav className="flex flex-col pb-4">
              {PROJECT_NAV_ITEMS.map((item) => {
                const active = projectTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => setProjectTab(item.tab)}
                    className={`flex items-center gap-[11px] w-[calc(100%-20px)] mx-[10px] my-[2px] text-left px-[14px] py-[9px] border-0 rounded-full cursor-pointer font-medium text-[13px] ${
                      active ? "bg-grad-accent text-white shadow-[0_2px_10px_rgba(235,91,40,.35)]" : "bg-transparent text-white/70 hover:bg-white/[.08] hover:text-white"
                    }`}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                      {item.icon}
                    </svg>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </>
        ) : (
          <nav className="flex flex-col pt-[14px] pb-4">
            <button
              onClick={goToPipeline}
              className={`flex items-center gap-[11px] w-[calc(100%-20px)] mx-[10px] my-[2px] text-left px-[14px] py-[9px] border-0 rounded-full cursor-pointer font-medium text-[13px] ${
                view === "pipeline" ? "bg-grad-accent text-white shadow-[0_2px_10px_rgba(235,91,40,.35)]" : "bg-transparent text-white/70 hover:bg-white/[.08] hover:text-white"
              }`}
            >
              <PipelineIcon />
              <span>Pipeline</span>
            </button>
          </nav>
        )}
      </div>

      <div className="border-t border-white/[.12]">
        <button
          onClick={goToSettings}
          className={`flex items-center gap-[11px] w-[calc(100%-20px)] mx-[10px] mt-[10px] text-left px-[14px] py-[9px] border-0 rounded-full cursor-pointer font-medium text-[13px] ${
            view === "settings" ? "bg-grad-accent text-white shadow-[0_2px_10px_rgba(235,91,40,.35)]" : "bg-transparent text-white/70 hover:bg-white/[.08] hover:text-white"
          }`}
        >
          <SettingsIcon />
          <span>Settings</span>
        </button>
        <div className="px-4 pt-[10px] pb-[18px]">
          <div className="font-medium text-[10px] text-white/55 leading-[1.6]">
            {savedLabel}
            <br />
            Data is saved automatically in this browser.
          </div>
        </div>
      </div>
    </aside>
  );
}
