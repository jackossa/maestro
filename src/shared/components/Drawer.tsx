import { useEffect, type ReactNode } from "react";

// Slide-in panel from the right for Task Detail. 380-480px on desktop,
// full-screen under the app's existing max-md breakpoint. See the Task
// Management design spec, "Responsive behavior".
export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500]">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-[440px] max-md:max-w-full bg-white shadow-glass border-l border-os-200 overflow-y-auto animate-osFadeUp">
        {children}
      </div>
    </div>
  );
}
