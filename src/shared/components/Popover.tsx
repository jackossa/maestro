import { useEffect, useRef, type ReactNode } from "react";

// Generalizes the outside-click + Escape-key popover pattern already used
// ad hoc in src/app/ProfileMenu.tsx into a reusable primitive. The trigger
// is caller-rendered (so callers keep full control of the trigger's own
// styling/content); this component only owns the panel's open/close
// lifecycle and positioning.
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  panelClassName = "",
  align = "left",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  panelClassName?: string;
  align?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative inline-block">
      {trigger}
      {open && (
        <div
          className={`absolute z-20 mt-1 rounded-brand-sm bg-white border border-os-200 shadow-glass overflow-hidden ${
            align === "right" ? "right-0" : "left-0"
          } ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
