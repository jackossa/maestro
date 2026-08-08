import { useState } from "react";
import { Popover } from "../../shared/components/Popover";
import { useTeamRoster } from "./useTeamRoster";
import type { TaskFilters } from "./useTasksFilters";
import type { DueDateFilter } from "./dueDateBucket";
import type { TaskStatus } from "./types";

const DUE_DATE_OPTIONS: { value: DueDateFilter; label: string }[] = [
  { value: "any", label: "Any date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
];

const STATUS_OPTIONS: { value: TaskStatus | "any"; label: string }[] = [
  { value: "any", label: "Any status" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

function FilterDropdown<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button onClick={() => setOpen((v) => !v)} className="px-[10px] py-[6px] border border-os-300 bg-white rounded-full font-medium text-[11.5px] text-os-700 hover:border-os-orange">
          {label}: {current?.label} ▾
        </button>
      }
      panelClassName="w-[160px] py-1"
    >
      {options.map((o) => (
        <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} className="w-full text-left px-3 py-[6px] font-medium text-[12px] text-os-700 hover:bg-os-50">
          {o.label}
        </button>
      ))}
    </Popover>
  );
}

export function FilterBar({ value, onChange }: { value: TaskFilters; onChange: (f: TaskFilters) => void }) {
  const roster = useTeamRoster();
  const ownerOptions = [{ value: "any" as const, label: "Anyone" }, ...roster.map((m) => ({ value: m.uid, label: m.displayName }))];

  return (
    <div className="flex items-center gap-2">
      <FilterDropdown label="Owner" value={value.assigneeId} options={ownerOptions} onChange={(v) => onChange({ ...value, assigneeId: v })} />
      <FilterDropdown label="Due" value={value.dueDate} options={DUE_DATE_OPTIONS} onChange={(v) => onChange({ ...value, dueDate: v })} />
      <FilterDropdown label="Status" value={value.status} options={STATUS_OPTIONS} onChange={(v) => onChange({ ...value, status: v })} />
    </div>
  );
}
