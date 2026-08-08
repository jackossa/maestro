import { useState } from "react";
import { Popover } from "../../shared/components/Popover";
import { useAuth } from "../../shared/state/auth";
import { useToast } from "../../shared/state/toast";
import { useTeamRoster } from "./useTeamRoster";
import { assignTask } from "./tasksApi";
import type { Task } from "./types";

export function Initial({ name, photoURL }: { name: string; photoURL: string | null }) {
  const letter = (name || "?").charAt(0).toUpperCase();
  return photoURL ? (
    <img src={photoURL} alt="" className="w-5 h-5 rounded-full flex-none" referrerPolicy="no-referrer" />
  ) : (
    <div className="w-5 h-5 rounded-full flex-none bg-grad-accent text-white flex items-center justify-center font-bold text-[9px]">{letter}</div>
  );
}

export function AssigneePicker({ projectId, task, isShared }: { projectId: string; task: Task; isShared: boolean }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const roster = useTeamRoster();
  const [open, setOpen] = useState(false);

  // Private projects: only the signed-in user can be assigned (nobody
  // else can see the project anyway). Shared: the full team roster.
  const options = isShared ? roster : roster.filter((m) => m.uid === user?.uid);

  // The task doc only denormalizes assigneeName, so the trigger's avatar
  // has to look the photo up on the roster (same source the option list
  // below uses). Falls back to the initial when the roster hasn't loaded
  // or the assignee is no longer in it.
  const assignee = task.assigneeId ? roster.find((m) => m.uid === task.assigneeId) : undefined;

  async function pick(uid: string | null, name: string | null) {
    setOpen(false);
    try {
      await assignTask(projectId, task.id, uid, name);
    } catch (err) {
      console.warn("[tasks] assign failed", err);
      showToast("Couldn't change the assignee. Please try again.");
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-[6px] px-[6px] py-[2px] rounded-full hover:bg-os-100">
          {task.assigneeId ? <Initial name={task.assigneeName || assignee?.displayName || "?"} photoURL={assignee?.photoURL ?? null} /> : <div className="w-5 h-5 rounded-full flex-none border border-dashed border-os-300" />}
          <span className="text-[11.5px] text-os-600 truncate max-w-[70px]">{task.assigneeName || "Unassigned"}</span>
        </button>
      }
      panelClassName="w-[200px] py-1"
    >
      <button onClick={() => pick(null, null)} className="w-full text-left px-3 py-[7px] font-medium text-[12.5px] text-os-700 hover:bg-os-50">
        Unassigned
      </button>
      {options.map((m) => (
        <button key={m.uid} onClick={() => pick(m.uid, m.displayName)} className="w-full flex items-center gap-2 text-left px-3 py-[7px] font-medium text-[12.5px] text-os-700 hover:bg-os-50">
          <Initial name={m.displayName} photoURL={m.photoURL} />
          {m.displayName}
        </button>
      ))}
    </Popover>
  );
}
