import React from "react";

// Ported from the "editable (cream)" input convention documented in the
// original README's Design Tokens section:
// background:#fdf4e3; border:1px solid var(--os-300); border-radius:10px;
const creamBase =
  "box-border w-full px-[10px] py-2 border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13.5px] text-os-ink";

export function CreamInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${creamBase} ${className}`} />;
}

export function CreamTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${creamBase} min-h-[60px] leading-[1.5] resize-y ${className}`} />;
}

export function CreamSelect(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { className = "", children, ...rest } = props;
  return (
    <select {...rest} className={`${creamBase} ${className}`}>
      {children}
    </select>
  );
}

export function FieldLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`font-medium text-[12.5px] text-os-700 ${className}`}>{children}</label>;
}

export function CheckboxRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-[9px] cursor-pointer font-medium text-[13px] text-os-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-os-orange cursor-pointer"
      />
      {children}
    </label>
  );
}
