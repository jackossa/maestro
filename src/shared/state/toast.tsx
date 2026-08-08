import React, { createContext, useCallback, useContext, useState } from "react";

// Minimal toast for the optimistic-update-rollback error messages the
// Task Management design spec calls for. Deliberately not a general
// notification system -- no queue persistence, no action buttons.
export type ToastKind = "error" | "info";
interface ToastMessage {
  id: number;
  text: string;
  kind: ToastKind;
}

interface ToastContextShape {
  showToast: (text: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextShape | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, kind: ToastKind = "error") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((m) => m.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[900] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-[10px] rounded-brand-sm shadow-glass font-medium text-[13px] text-white ${
              t.kind === "error" ? "bg-os-ink" : "bg-os-charcoal"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextShape {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
