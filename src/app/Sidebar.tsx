import React from "react";
import { useAppState } from "../shared/state/store";
import { defaultData } from "../shared/state/defaultData";

// Ported from the <aside> block, Ossa Fee Proposal App.dc.html lines 151-207,
// and the nav button styling closures (navBtnStyle/navClick) at lines
// 2706-2710. Tab numbers match the original's tab-state numbering exactly
// (there is no tab 4 -- "One-Page Proposal" was defined but never wired to
// a nav button or a tabNStyle in the source, so it's dead in the original too).

const NAV_ITEMS: { tab: number; label: string; icon: React.ReactNode }[] = [
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
  {
    tab: 6,
    label: "Pipeline",
    icon: <path d="M23 6 13.5 15.5 8.5 10.5 1 18 M17 6h6v6" />,
  },
  {
    tab: 5,
    label: "Settings",
    icon: (
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    ),
  },
];

export function Sidebar() {
  const { state, updStore, setTab } = useAppState();
  const { store, tab } = { store: state.store, tab: state.tab };

  const projectOptions = store.order.map((id) => ({ id, label: store.projects[id].data.info.name || "Untitled Project" }));
  const savedAt = state.savedAt || store.projects[store.currentId].updated;
  const savedLabel =
    "Saved " + new Date(savedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const onNewProject = () =>
    updStore((s) => {
      const id = "p" + Date.now().toString(36);
      s.projects[id] = { created: Date.now(), updated: Date.now(), data: defaultData() };
      s.order.push(id);
      s.currentId = id;
    });

  const onDupProject = () =>
    updStore((s) => {
      const id = "p" + Date.now().toString(36);
      const src = s.projects[s.currentId].data;
      s.projects[id] = { created: Date.now(), updated: Date.now(), data: JSON.parse(JSON.stringify(src)) };
      const idx = s.order.indexOf(s.currentId);
      s.order.splice(idx + 1, 0, id);
      s.currentId = id;
    });

  const onDelProject = () => {
    if (store.order.length <= 1) return;
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    updStore((s) => {
      const idx = s.order.indexOf(s.currentId);
      delete s.projects[s.currentId];
      s.order.splice(idx, 1);
      s.currentId = s.order[Math.max(0, idx - 1)];
    });
  };

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

        <div className="px-4 pt-[14px] pb-2 font-bold text-[9.5px] tracking-[.18em] uppercase text-white/45">Project</div>
        <div className="px-4 pb-1">
          <select
            value={store.currentId}
            onChange={(e) => updStore((s) => { s.currentId = e.target.value; })}
            className="box-border w-full px-[10px] py-2 border border-white/35 rounded-brand-sm bg-white/[.07] text-white font-medium text-[12.5px]"
          >
            {projectOptions.map((o) => (
              <option key={o.id} value={o.id} className="text-black">
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-[6px] px-4 pt-[10px] pb-[14px] border-b border-white/[.12]">
          <button
            onClick={onNewProject}
            className="flex-1 py-[6px] border border-os-orange bg-os-orange text-white font-bold text-[10px] tracking-[.05em] cursor-pointer rounded-full hover:bg-accent-hover"
          >
            NEW
          </button>
          <button
            onClick={onDupProject}
            className="flex-1 py-[6px] border border-white/30 bg-transparent text-white/85 font-medium text-[10px] tracking-[.05em] cursor-pointer rounded-full hover:border-white hover:text-white"
          >
            COPY
          </button>
          <button
            onClick={onDelProject}
            className="flex-1 py-[6px] border border-white/30 bg-transparent text-white/85 font-medium text-[10px] tracking-[.05em] cursor-pointer rounded-full hover:border-os-orange-300 hover:text-os-orange-300"
          >
            DEL
          </button>
        </div>

        <div className="px-4 pt-[14px] pb-2 font-bold text-[9.5px] tracking-[.18em] uppercase text-white/45">Navigate</div>
        <nav className="flex flex-col pb-4">
          {NAV_ITEMS.map((item) => {
            const active = tab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setTab(item.tab)}
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
      </div>

      <div className="px-4 pt-[14px] pb-[18px] border-t border-white/[.12]">
        <div className="font-medium text-[10px] text-white/55 leading-[1.6]">
          {savedLabel}
          <br />
          Data is saved automatically in this browser.
        </div>
      </div>
    </aside>
  );
}
