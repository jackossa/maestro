import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../shared/state/auth";
import { AppStateProvider, useAppState } from "../shared/state/store";
import { ToastProvider } from "../shared/state/toast";
import { LoginScreen } from "../features/auth/LoginScreen";
import { Sidebar } from "./Sidebar";
import { ProjectInfoTab } from "../features/project-info/ProjectInfoTab";
import { FeeCalculationTab } from "../features/fee-calculation/FeeCalculationTab";
import { ProjectScheduleTab } from "../features/project-schedule/ProjectScheduleTab";
import { SettingsTab } from "../features/settings/SettingsTab";
import { PipelineTab } from "../features/pipeline/PipelineTab";
import { ProposalBuilderTab } from "../features/proposal-builder/ProposalBuilderTab";
import { AccountTab } from "../features/account/AccountTab";

// Pipeline is the app's home screen; opening a project switches to its
// four-tab workspace; Settings is reachable from either. See the Pipeline
// Unification design spec, "Navigation & screens". No URL routing --
// navigation is state-only (unchanged prior decision).
//
// The whole app additionally sits behind Google sign-in (AuthProvider +
// AuthGate below) -- see the Google Sign-In design spec. Signed-out users
// never mount AppStateProvider, so project data can never flash on screen
// before auth is confirmed.

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

  const hasProject = !!state.store.projects[state.store.currentId];
  const projectTabVisible = state.view === "project" && hasProject;
  const settingsVisible = state.view === "settings" && hasProject;

  return (
    <>
      {showSplash && <Splash />}
      <div className="flex min-h-screen items-stretch max-md:block">
        <Sidebar />
        <main className="flex-1 min-w-0 px-11 pt-[34px] pb-[90px] max-w-[1280px] max-md:px-4 max-md:pt-5 max-md:pb-[60px]">
          <div style={{ display: state.view === "pipeline" ? "block" : "none" }}>
            <PipelineTab />
          </div>
          {settingsVisible && <SettingsTab />}
          {state.view === "account" && <AccountTab />}
          {projectTabVisible && state.projectTab === 1 && <ProjectInfoTab />}
          {projectTabVisible && state.projectTab === 2 && <FeeCalculationTab />}
          {projectTabVisible && state.projectTab === 3 && <ProjectScheduleTab />}
          {projectTabVisible && state.projectTab === 7 && <ProposalBuilderTab />}
        </main>
      </div>
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status !== "signed-in") return <LoginScreen />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthGate>
          <AppStateProvider>
            <Shell />
          </AppStateProvider>
        </AuthGate>
      </AuthProvider>
    </ToastProvider>
  );
}
