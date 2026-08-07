import { useEffect, useRef, useState } from "react";
import { useAuth } from "../shared/state/auth";
import { useAppState } from "../shared/state/store";

// Compact profile chip + popover for the sidebar's bottom section. The
// popover has exactly two rows: the profile info block (itself the link
// to the Account view) and Sign out -- "Settings" is deliberately not
// duplicated here, it's already a persistent sidebar item. See the Google
// Sign-In design spec, "Authenticated UI".
export function ProfileMenu() {
  const { user, signOut } = useAuth();
  const { state, goToAccount } = useAppState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = state.view === "account";

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative px-[10px] pt-[10px]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
        className={`w-full flex items-center gap-[10px] px-[10px] py-[8px] rounded-full text-left focus:outline-none focus:ring-2 focus:ring-os-orange-300 ${
          isActive ? "bg-white/[.12]" : "hover:bg-white/[.08]"
        }`}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full flex-none" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded-full flex-none bg-grad-accent text-white flex items-center justify-center font-bold text-[12px]">
            {initial}
          </div>
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-[12.5px] text-white/85">{user.displayName}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-[10px] right-[10px] mb-2 rounded-brand-sm bg-os-900 border border-white/[.12] shadow-glass overflow-hidden">
          <button
            onClick={() => {
              setOpen(false);
              goToAccount();
            }}
            className="w-full text-left px-[14px] py-[12px] border-b border-white/[.12] hover:bg-white/[.08]"
          >
            <div className="font-bold text-[13px] text-white truncate">{user.displayName}</div>
            <div className="mt-[2px] text-[11.5px] text-white/60 truncate">{user.email}</div>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="w-full min-h-[44px] flex items-center text-left px-[14px] text-[13px] font-medium text-white/85 hover:bg-white/[.08]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
