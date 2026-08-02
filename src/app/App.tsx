import { useEffect, useState } from "react";
import { AppStateProvider, useAppState } from "../shared/state/store";
import { Sidebar } from "./Sidebar";
import { ProjectInfoTab } from "../features/project-info/ProjectInfoTab";
import { FeeCalculationTab } from "../features/fee-calculation/FeeCalculationTab";
import { ProjectScheduleTab } from "../features/project-schedule/ProjectScheduleTab";
import { SettingsTab } from "../features/settings/SettingsTab";
import { PipelineTab } from "../features/pipeline/PipelineTab";
import { ProposalBuilderTab } from "../features/proposal-builder/ProposalBuilderTab";

// Ported from the <div style="display:flex;min-height:100vh"> shell and the
// splash-screen sc-if block (Ossa Fee Proposal App.dc.html lines 135-209).
// Tabs are switched by state only -- no URL routing, matching the original
// (confirmed decision: no router).

function Splash() {
  return (
    <div className="fixed inset-0 z-[999] bg-os-charcoal flex items-center justify-center pointer-events-none animate-osSplashOut">
      <div className="flex items-center gap-4">
        <div className="h-14 flex-none animate-osSymbolPulse">
          <img src="/assets/logo-symbol-white.png" alt="" className="h-14 w-auto block" />
        </div>
        <div className="flex flex-col items-start gap-[5px]">
          <div className="font-bold text-[34px] leading-none font-display tracking-[.02em] text-white">MAESTRO</div>
          <div className="font-bold text-[10px] font-sans tracking-[.22em] uppercase text-os-orange-300">by Ossa Studio</div>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { state } = useAppState();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {showSplash && <Splash />}
      <div className="flex min-h-screen items-stretch max-md:block">
        <Sidebar />
        <main className="flex-1 min-w-0 px-11 pt-[34px] pb-[90px] max-w-[1280px] max-md:px-4 max-md:pt-5 max-md:pb-[60px]">
          <div style={{ display: state.tab === 1 ? "block" : "none" }}>
            <ProjectInfoTab />
          </div>
          <div style={{ display: state.tab === 2 ? "block" : "none" }}>
            <FeeCalculationTab />
          </div>
          <div style={{ display: state.tab === 3 ? "block" : "none" }}>
            <ProjectScheduleTab />
          </div>
          <div style={{ display: state.tab === 7 ? "block" : "none" }}>
            <ProposalBuilderTab />
          </div>
          <div style={{ display: state.tab === 6 ? "block" : "none" }}>
            <PipelineTab />
          </div>
          <div style={{ display: state.tab === 5 ? "block" : "none" }}>
            <SettingsTab />
          </div>
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
