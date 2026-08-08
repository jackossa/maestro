# Task Management Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dense, Asana-inspired Task Management module to Maestro — Projects (private or team-shared), Tasks with one level of subtasks, List and Board views with drag-and-drop, a right-side task detail drawer, filters, and a cross-project My Tasks screen.

**Architecture:** New Firestore backend (`users`, `taskProjects`, `taskProjects/{id}/tasks`), scoped only to this module — the existing Fee Proposal data model and its `localStorage` persistence are untouched. Navigation follows the app's existing view-based (no-router) convention. New shared UI primitives (Popover, Drawer, Toast) follow the one existing popover pattern in the codebase. Drag-and-drop uses `@dnd-kit`.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind (all existing). `firebase` (already a dependency, Firestore is part of the same package — no new install). New dependency: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

## Global Constraints

- Full design spec: `docs/superpowers/specs/2026-08-07-task-management-design.md`. Every task below implements a piece of it — read the spec's relevant section if a task's brief is unclear on intent.
- **No Node.js in this environment.** Every implementer writes code and tests carefully by hand and reports "written but not run" — do not claim a test suite was executed unless it actually was. Real verification happens via Vercel's Preview build (must succeed) and live manual browser testing once Firestore is provisioned (Task 18).
- **Reuse existing design tokens exactly**: colors `os-ink`, `os-orange`/`os-orange-700`/`os-orange-300`, `os-charcoal`, neutral scale `os-900`→`os-50`; radius `rounded-brand-sm`(10px)/`brand-md`(14px)/`brand-lg`(18px); shadows `shadow-sm`/`shadow-glass`; motion `duration-fast`(150ms). Do not invent new tokens.
- **Reuse existing primitives**: `CreamInput`/`CreamTextarea`/`CreamSelect`/`FieldLabel`/`CheckboxRow` from `src/shared/components/inputs.tsx`, `SectionHeader` from `src/shared/components/SectionHeader.tsx`, the avatar-initial pattern from `src/app/ProfileMenu.tsx` (28px circle, `bg-grad-accent` fallback, first-letter of name/email). Native `<input type="date">` for all date fields — no custom date-picker.
- **No router.** Navigation is component state via `store.tsx`'s `View` union, exactly like `pipeline`/`project`/`settings`/`account` today.
- **Firestore is the only backend touched by this plan.** Never modify `src/shared/state/store.tsx`'s `Store`/`ProjectData` types, `localStorage` key, or migration logic except for the single `View` union addition in Task 7 — that is the one deliberate, minimal touchpoint between this module and the existing Fee Proposal state.
- **Sharing is a single boolean, not per-person invites.** `isShared == true` means visible to every signed-in `@ossastudio.com` user; there are no roles, no granular membership gating. `members[]` on a project is a display-only, auto-derived list (creator + everyone ever assigned a task there) — never manually edited, never used in security rules.
- **Sort order**: spaced integers, gap of 1000, via one shared `computeSortOrder(before, after)` pure function (Task 2). No fractional-indexing library.
- Every Firestore-writing function follows the optimistic-update-then-rollback-on-failure pattern described in the design spec's "Error handling" section, surfaced via the shared `Toast` component (Task 5).
- Every new interactive element is a real `<button>`/`<input>`/`<select>` with a visible focus ring (`focus:outline-none focus:ring-2 focus:ring-os-orange-300`, the existing convention) and an accessible label. Escape closes drawers/popovers. Enter saves inline edits.

---

### Task 1: Firestore init, AuthUser.uid, and the team-roster upsert

**Files:**
- Modify: `src/shared/lib/firebase.ts`
- Modify: `src/shared/state/auth.tsx`
- Create: `src/features/tasks/userRoster.ts`

**Interfaces:**
- Consumes: existing `firebaseApp`, `auth`, `WORKSPACE_DOMAIN` in `firebase.ts`; existing `AuthProvider`/`toAuthUser` in `auth.tsx`.
- Produces: `export const db` (Firestore instance) from `firebase.ts`, for every later task. `AuthUser.uid: string`, so every later task can identify "me". `upsertCurrentUser(uid, profile)` from `userRoster.ts`, called once per sign-in.

This is the foundation every other task builds on: a Firestore handle, and the current user's `uid` actually being available app-wide (today it isn't — `AuthUser` only exposes `displayName`/`email`/`photoURL`).

- [ ] **Step 1: Add Firestore to `firebase.ts`**

Add this import and export (after the existing `googleProvider` block, at the end of the file):

```ts
import { getFirestore } from "firebase/firestore";
```

Add to the top imports (alongside the existing `firebase/app`/`firebase/auth` imports), then add at the bottom of the file:

```ts
export const db = getFirestore(firebaseApp);
```

The full modified import block at the top of `firebase.ts` becomes:

```ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
```

- [ ] **Step 2: Create `src/features/tasks/userRoster.ts`**

```ts
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";

// The team roster is not a manually managed list -- it's built up
// automatically as people sign in. Any @ossastudio.com account that has
// ever signed in appears here, which is what the assignee/share pickers
// read from. See the Task Management design spec, "Architecture".
export interface RosterProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
}

export async function upsertCurrentUser(uid: string, profile: RosterProfile): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    { ...profile, lastSeenAt: serverTimestamp() },
    { merge: true },
  );
}
```

- [ ] **Step 3: Add `uid` to `AuthUser` and wire the roster upsert**

In `src/shared/state/auth.tsx`, add the import:

```ts
import { upsertCurrentUser } from "../../features/tasks/userRoster";
```

Change the `AuthUser` interface (currently `displayName`/`email`/`photoURL` only) to:

```ts
export interface AuthUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}
```

Change `toAuthUser` to:

```ts
function toAuthUser(u: User): AuthUser {
  return {
    uid: u.uid,
    displayName: u.displayName || u.email || "Signed in",
    email: u.email || "",
    photoURL: u.photoURL,
  };
}
```

In the `onAuthStateChanged` callback's signed-in branch (the block that currently reads):

```ts
      if (firebaseUser && isAuthorizedDomain(firebaseUser.email, WORKSPACE_DOMAIN)) {
        wasSignedIn.current = true;
        deliberateSignOut.current = false;
        setError(null);
        setUser(toAuthUser(firebaseUser));
        setStatus("signed-in");
        return;
      }
```

change it to also upsert the roster (fire-and-forget — a roster-write failure must never block or affect sign-in):

```ts
      if (firebaseUser && isAuthorizedDomain(firebaseUser.email, WORKSPACE_DOMAIN)) {
        wasSignedIn.current = true;
        deliberateSignOut.current = false;
        setError(null);
        const authUser = toAuthUser(firebaseUser);
        setUser(authUser);
        setStatus("signed-in");
        upsertCurrentUser(authUser.uid, {
          displayName: authUser.displayName,
          email: authUser.email,
          photoURL: authUser.photoURL,
        }).catch((err) => console.warn("[auth] roster upsert failed", err));
        return;
      }
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/lib/firebase.ts src/shared/state/auth.tsx src/features/tasks/userRoster.ts
git commit -m "Add Firestore init, AuthUser.uid, and team-roster upsert on sign-in"
```

---

### Task 2: Pure utilities — sortOrder and dueDateBucket (tested)

**Files:**
- Create: `src/features/tasks/sortOrder.ts`
- Test: `src/features/tasks/sortOrder.test.ts`
- Create: `src/features/tasks/dueDateBucket.ts`
- Test: `src/features/tasks/dueDateBucket.test.ts`

**Interfaces:**
- Produces: `computeSortOrder(before, after)`, `getDueDateBucket(dueDate, todayIso)`, `isWithinDueDateFilter(dueDate, filter, todayIso, customStart?, customEnd?)`, `type DueDateFilter`, `type DueDateBucket` — used by nearly every later task (Firestore write helpers, filters, My Tasks grouping).

These are the two genuinely pure, easily-testable pieces of logic in this whole module — no Firestore, no React. Consistent with this project's established precedent (pure logic gets real unit tests; React/SDK wiring does not).

- [ ] **Step 1: Write `sortOrder.ts`**

```ts
// Spaced-integer manual ordering, gap of 1000. Reordering computes the
// midpoint between the item's new neighbors; appending to the end passes
// `after: null`. Deliberately not a fractional-indexing library -- see the
// Task Management design spec's explicit "don't overengineer" instruction.
const GAP = 1000;

export function computeSortOrder(before: number | null, after: number | null): number {
  if (before === null && after === null) return GAP;
  if (before === null) return after! - GAP;
  if (after === null) return before + GAP;
  return (before + after) / 2;
}
```

- [ ] **Step 2: Write `sortOrder.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { computeSortOrder } from "./sortOrder";

describe("computeSortOrder", () => {
  it("returns the base gap for the first item in an empty list", () => {
    expect(computeSortOrder(null, null)).toBe(1000);
  });

  it("appends after the last item", () => {
    expect(computeSortOrder(1000, null)).toBe(2000);
    expect(computeSortOrder(5000, null)).toBe(6000);
  });

  it("prepends before the first item", () => {
    expect(computeSortOrder(null, 1000)).toBe(0);
    expect(computeSortOrder(null, 5000)).toBe(4000);
  });

  it("computes the midpoint between two neighbors", () => {
    expect(computeSortOrder(1000, 2000)).toBe(1500);
    expect(computeSortOrder(1000, 1002)).toBe(1001);
  });
});
```

- [ ] **Step 3: Write `dueDateBucket.ts`**

```ts
// Pure date-bucketing logic shared by My Tasks grouping and the Due Date
// filter. Dates are ISO yyyy-mm-dd strings (what native <input type="date">
// produces, already the convention used elsewhere in this app), which
// compare correctly with plain string comparison.
export type DueDateBucket = "overdue" | "today" | "upcoming" | "no-date";

export function getDueDateBucket(dueDate: string | null, todayIso: string): DueDateBucket {
  if (!dueDate) return "no-date";
  if (dueDate < todayIso) return "overdue";
  if (dueDate === todayIso) return "today";
  return "upcoming";
}

export type DueDateFilter = "any" | "overdue" | "today" | "this-week" | "this-month" | "custom";

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isWithinDueDateFilter(
  dueDate: string | null,
  filter: DueDateFilter,
  todayIso: string,
  customStart: string | null = null,
  customEnd: string | null = null,
): boolean {
  if (filter === "any") return true;
  if (!dueDate) return false;
  const bucket = getDueDateBucket(dueDate, todayIso);
  if (filter === "overdue") return bucket === "overdue";
  if (filter === "today") return bucket === "today";
  if (filter === "this-week") return dueDate >= todayIso && dueDate <= addDaysIso(todayIso, 7);
  if (filter === "this-month") return dueDate >= todayIso && dueDate <= addDaysIso(todayIso, 30);
  if (filter === "custom") {
    if (customStart && dueDate < customStart) return false;
    if (customEnd && dueDate > customEnd) return false;
    return true;
  }
  return true;
}
```

- [ ] **Step 4: Write `dueDateBucket.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { getDueDateBucket, isWithinDueDateFilter } from "./dueDateBucket";

const TODAY = "2026-08-07";

describe("getDueDateBucket", () => {
  it("buckets a null date as no-date", () => {
    expect(getDueDateBucket(null, TODAY)).toBe("no-date");
  });
  it("buckets a past date as overdue", () => {
    expect(getDueDateBucket("2026-08-01", TODAY)).toBe("overdue");
  });
  it("buckets today's date as today", () => {
    expect(getDueDateBucket(TODAY, TODAY)).toBe("today");
  });
  it("buckets a future date as upcoming", () => {
    expect(getDueDateBucket("2026-08-20", TODAY)).toBe("upcoming");
  });
});

describe("isWithinDueDateFilter", () => {
  it("'any' matches everything, including no due date", () => {
    expect(isWithinDueDateFilter(null, "any", TODAY)).toBe(true);
    expect(isWithinDueDateFilter("2026-01-01", "any", TODAY)).toBe(true);
  });
  it("non-'any' filters never match a null due date", () => {
    expect(isWithinDueDateFilter(null, "overdue", TODAY)).toBe(false);
    expect(isWithinDueDateFilter(null, "this-week", TODAY)).toBe(false);
  });
  it("'overdue' and 'today' match their buckets only", () => {
    expect(isWithinDueDateFilter("2026-08-01", "overdue", TODAY)).toBe(true);
    expect(isWithinDueDateFilter(TODAY, "overdue", TODAY)).toBe(false);
    expect(isWithinDueDateFilter(TODAY, "today", TODAY)).toBe(true);
  });
  it("'this-week' matches today through +7 days inclusive, not before today", () => {
    expect(isWithinDueDateFilter(TODAY, "this-week", TODAY)).toBe(true);
    expect(isWithinDueDateFilter("2026-08-14", "this-week", TODAY)).toBe(true);
    expect(isWithinDueDateFilter("2026-08-15", "this-week", TODAY)).toBe(false);
    expect(isWithinDueDateFilter("2026-08-01", "this-week", TODAY)).toBe(false);
  });
  it("'custom' respects an inclusive start/end range", () => {
    expect(isWithinDueDateFilter("2026-08-10", "custom", TODAY, "2026-08-05", "2026-08-15")).toBe(true);
    expect(isWithinDueDateFilter("2026-08-01", "custom", TODAY, "2026-08-05", "2026-08-15")).toBe(false);
    expect(isWithinDueDateFilter("2026-08-20", "custom", TODAY, "2026-08-05", "2026-08-15")).toBe(false);
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/sortOrder.ts src/features/tasks/sortOrder.test.ts src/features/tasks/dueDateBucket.ts src/features/tasks/dueDateBucket.test.ts
git commit -m "Add pure sortOrder and dueDateBucket utilities with tests"
```

---

### Task 3: Task Management types, Task Project CRUD API, Firestore security rules

**Files:**
- Create: `src/features/tasks/types.ts`
- Create: `src/features/tasks/taskProjectsApi.ts`
- Create: `firestore.rules` (repo root)

**Interfaces:**
- Consumes: `db` from `../../shared/lib/firebase` (Task 1).
- Produces: `TaskProject`, `Task`, `TaskStatus`, `TeamMember` types, used by every later task. `createTaskProject`, `renameTaskProject`, `toggleTaskProjectShared`, `deleteTaskProjectCascade` — used by Task 8 (Projects screen) and Task 9 (Project Detail toolbar).

- [ ] **Step 1: Write `src/features/tasks/types.ts`**

```ts
// Task Management's own data model -- deliberately standalone from the
// existing Fee Proposal Project/ProjectData types in
// src/shared/state/types.ts. Same name, different domain: this "Project"
// is a task-tracking container, not an architecture engagement. See the
// Task Management design spec, "Scope decisions".

export type TaskStatus = "todo" | "in_progress" | "complete";

export interface TaskProject {
  id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  isShared: boolean;
  members: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  status: TaskStatus;
  completed: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  projectName: string;
}

export interface TeamMember {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}
```

- [ ] **Step 2: Write `src/features/tasks/taskProjectsApi.ts`**

```ts
import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../shared/lib/firebase";

// Project name and sharing state are the two fields also copied onto every
// child task (projectName for display, nothing else -- see the design
// spec's "Architecture" section for why isShared/members are NOT
// denormalized). Both mutators below batch-update every child task's
// projectName so it never goes stale; sharing itself is checked live via
// a security-rule get() on the parent doc, so it needs no propagation.

export async function createTaskProject(
  name: string,
  uid: string,
  displayName: string,
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, "taskProjects"), {
    name,
    createdBy: uid,
    createdByName: displayName,
    isShared: false,
    members: [uid],
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function renameTaskProject(projectId: string, name: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "taskProjects", projectId), { name, updatedAt: Date.now() });
  const tasksSnap = await getDocs(collection(db, "taskProjects", projectId, "tasks"));
  tasksSnap.forEach((taskDoc) => batch.update(taskDoc.ref, { projectName: name }));
  await batch.commit();
}

export async function toggleTaskProjectShared(projectId: string, isShared: boolean): Promise<void> {
  await updateDoc(doc(db, "taskProjects", projectId), { isShared, updatedAt: Date.now() });
}

export async function deleteTaskProjectCascade(projectId: string): Promise<void> {
  const tasksSnap = await getDocs(collection(db, "taskProjects", projectId, "tasks"));
  const batch = writeBatch(db);
  tasksSnap.forEach((taskDoc) => batch.delete(taskDoc.ref));
  batch.delete(doc(db, "taskProjects", projectId));
  await batch.commit();
}
```

- [ ] **Step 3: Write `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Matches the existing VITE_WORKSPACE_DOMAIN default (see
    // src/shared/lib/firebase.ts). If that env var is ever set to a
    // different domain in a deployment, this literal must be updated to
    // match -- Firestore rules cannot read Vite env vars at runtime.
    function isTeamMember() {
      return request.auth != null
        && request.auth.token.email != null
        && request.auth.token.email.matches('.*@ossastudio[.]com$');
    }

    function isProjectVisible(projectData) {
      return projectData.isShared == true || projectData.createdBy == request.auth.uid;
    }

    match /users/{uid} {
      allow read: if isTeamMember();
      allow write: if isTeamMember() && request.auth.uid == uid;
    }

    match /taskProjects/{projectId} {
      allow read, update, delete: if isTeamMember() && isProjectVisible(resource.data);
      allow create: if isTeamMember() && request.resource.data.createdBy == request.auth.uid;

      match /tasks/{taskId} {
        allow read, create, update, delete: if isTeamMember()
          && isProjectVisible(get(/databases/$(database)/documents/taskProjects/$(projectId)).data);
      }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/tasks/types.ts src/features/tasks/taskProjectsApi.ts firestore.rules
git commit -m "Add Task Management types, Task Project CRUD API, and Firestore security rules"
```

---

### Task 4: useTeamRoster and useTaskProjectsList hooks

**Files:**
- Create: `src/features/tasks/useTeamRoster.ts`
- Create: `src/features/tasks/useTaskProjectsList.ts`

**Interfaces:**
- Consumes: `db` (Task 1), `TeamMember`/`TaskProject` types (Task 3), `useAuth()` for `user.uid`.
- Produces: `useTeamRoster()` returning `TeamMember[]`, used by Task 11 (AssigneePicker) and Task 8 (Projects screen owner display). `useTaskProjectsList()` returning `{ projects: TaskProject[], loading: boolean }`, used by Task 8.

- [ ] **Step 1: Write `useTeamRoster.ts`**

```ts
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import type { TeamMember } from "./types";

export function useTeamRoster(): TeamMember[] {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snap) => {
      setMembers(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: data.displayName || data.email || "Unknown",
            email: data.email || "",
            photoURL: data.photoURL ?? null,
          };
        }),
      );
    });
    return unsubscribe;
  }, []);

  return members;
}
```

- [ ] **Step 2: Write `useTaskProjectsList.ts`**

```ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, or, query, where } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import { useAuth } from "../../shared/state/auth";
import type { TaskProject } from "./types";

export function useTaskProjectsList(): { projects: TaskProject[]; loading: boolean } {
  const { user } = useAuth();
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "taskProjects"),
      or(where("isShared", "==", true), where("createdBy", "==", user.uid)),
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskProject, "id">) })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { projects, loading };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/tasks/useTeamRoster.ts src/features/tasks/useTaskProjectsList.ts
git commit -m "Add useTeamRoster and useTaskProjectsList hooks"
```

**Note for the implementer:** the `or()` query in Step 2 combines equality filters on two different fields (`isShared`, `createdBy`). Firestore may require a composite index for this the first time it actually runs against a live database — if so, the browser console will show a `FirebaseError` with a direct link to create it. This can only be discovered once Firestore is live (Task 18); flag it in your report as a known follow-up, don't attempt to pre-guess the index configuration.

---

### Task 5: Shared UI primitives — Popover, Drawer, Toast

**Files:**
- Create: `src/shared/components/Popover.tsx`
- Create: `src/shared/components/Drawer.tsx`
- Create: `src/shared/state/toast.tsx` (provider, hook, and the toast markup itself — there is no separate `Toast.tsx` component file, see the note at the end of this task)
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `<Popover trigger={...} open={...} onOpenChange={...}>` and `<Drawer open={...} onClose={...} widthClassName?>` components, `ToastProvider`/`useToast()` (`showToast(message, kind?)`), all used by Tasks 8–16.

These three follow the *one* existing popover pattern in the codebase (`ProfileMenu.tsx`'s outside-click + Escape-key `useEffect`), generalized into reusable primitives rather than re-invented per feature.

- [ ] **Step 1: Write `Popover.tsx`**

```tsx
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
```

- [ ] **Step 2: Write `Drawer.tsx`**

```tsx
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
```

- [ ] **Step 3: Write `src/shared/state/toast.tsx`**

```tsx
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
```

- [ ] **Step 4: Mount `ToastProvider` in `App.tsx`**

In `src/app/App.tsx`, add the import:

```ts
import { ToastProvider } from "../shared/state/toast";
```

Wrap the existing default export's return value. The current `App()` function is:

```tsx
export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppStateProvider>
          <Shell />
        </AppStateProvider>
      </AuthGate>
    </AuthProvider>
  );
}
```

Change it to:

```tsx
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
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/Popover.tsx src/shared/components/Drawer.tsx src/shared/state/toast.tsx src/app/App.tsx
git commit -m "Add shared Popover, Drawer, and Toast primitives"
```

---

### Task 6: Tasks API and useProjectTasks hook

**Files:**
- Create: `src/features/tasks/tasksApi.ts`
- Create: `src/features/tasks/useProjectTasks.ts`

**Interfaces:**
- Consumes: `db` (Task 1), `Task`/`TaskProject` types (Task 3), `computeSortOrder` (Task 2).
- Produces: `createTask`, `updateTask`, `assignTask`, `deleteTask`, `moveTaskToStatus` from `tasksApi.ts`; `useProjectTasks(projectId)` returning `{ tasks: Task[], loading: boolean }` from `useProjectTasks.ts`. Used by Tasks 9, 10, 12, 13, 14.

- [ ] **Step 1: Write `tasksApi.ts`**

```ts
import { arrayUnion, collection, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import type { Task, TaskProject, TaskStatus } from "./types";

interface NewTaskInput {
  projectId: string;
  parentTaskId: string | null;
  title: string;
  sortOrder: number;
  createdBy: string;
  project: Pick<TaskProject, "name">;
}

export async function createTask(input: NewTaskInput): Promise<string> {
  const now = Date.now();
  const ref = doc(collection(db, "taskProjects", input.projectId, "tasks"));
  await writeTaskDoc(ref.id, input);
  return ref.id;
}

// Split out so Step usage below stays readable; not exported.
async function writeTaskDoc(id: string, input: NewTaskInput) {
  const now = Date.now();
  const batch = writeBatch(db);
  batch.set(doc(db, "taskProjects", input.projectId, "tasks", id), {
    projectId: input.projectId,
    parentTaskId: input.parentTaskId,
    title: input.title,
    description: null,
    assigneeId: null,
    assigneeName: null,
    dueDate: null,
    status: "todo" as TaskStatus,
    completed: false,
    sortOrder: input.sortOrder,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    projectName: input.project.name,
  });
  await batch.commit();
}

export async function updateTask(
  projectId: string,
  taskId: string,
  fields: Partial<Pick<Task, "title" | "description" | "dueDate" | "status" | "completed" | "sortOrder">>,
): Promise<void> {
  await updateDoc(doc(db, "taskProjects", projectId, "tasks", taskId), { ...fields, updatedAt: Date.now() });
}

export async function assignTask(
  projectId: string,
  taskId: string,
  assigneeId: string | null,
  assigneeName: string | null,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "taskProjects", projectId, "tasks", taskId), {
    assigneeId,
    assigneeName,
    updatedAt: Date.now(),
  });
  if (assigneeId) {
    batch.update(doc(db, "taskProjects", projectId), { members: arrayUnion(assigneeId), updatedAt: Date.now() });
  }
  await batch.commit();
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, "taskProjects", projectId, "tasks", taskId));
}

// Board-view drop: sets status/completed per the exact mapping in the
// design spec, plus the new column-scoped sortOrder.
export async function moveTaskToStatus(
  projectId: string,
  taskId: string,
  status: TaskStatus,
  sortOrder: number,
): Promise<void> {
  await updateDoc(doc(db, "taskProjects", projectId, "tasks", taskId), {
    status,
    completed: status === "complete",
    sortOrder,
    updatedAt: Date.now(),
  });
}
```

- [ ] **Step 2: Write `useProjectTasks.ts`**

```ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import type { Task } from "./types";

export function useProjectTasks(projectId: string | null): { tasks: Task[]; loading: boolean } {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "taskProjects", projectId, "tasks"), orderBy("sortOrder"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) })));
      setLoading(false);
    });
    return unsubscribe;
  }, [projectId]);

  return { tasks, loading };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/tasks/tasksApi.ts src/features/tasks/useProjectTasks.ts
git commit -m "Add Tasks CRUD API and useProjectTasks hook"
```

---

### Task 7: Tasks navigation — sidebar entry, View type, TasksTab shell

**Files:**
- Modify: `src/shared/state/store.tsx`
- Modify: `src/app/Sidebar.tsx`
- Modify: `src/app/App.tsx`
- Create: `src/features/tasks/TasksTab.tsx`

**Interfaces:**
- Consumes: existing `View`/`goToX` pattern in `store.tsx`.
- Produces: `View` includes `"tasks"`; `goToTasks()` action; `<TasksTab />` component (placeholder screen-switcher for now, filled in by Tasks 8/9/16). Used by every subsequent UI task.

- [ ] **Step 1: Add `"tasks"` to the `View` union in `store.tsx`**

Change:

```ts
export type View = "pipeline" | "project" | "settings" | "account";
```

to:

```ts
export type View = "pipeline" | "project" | "settings" | "account" | "tasks";
```

- [ ] **Step 2: Add `goToTasks` to `AppContextShape` and the provider**

In the `AppContextShape` interface, add (next to the existing `goToAccount: () => void;`):

```ts
  goToTasks: () => void;
```

In `AppStateProvider`, add (next to the existing `goToAccount` callback):

```ts
  const goToTasks = useCallback(() => setState((s) => ({ ...s, view: "tasks" })), []);
```

Add `goToTasks` to both the `useMemo` returned object and its dependency array (the same two places `goToAccount` already appears).

- [ ] **Step 3: Add a "Tasks" sidebar entry in `Sidebar.tsx`**

Add the import:

```ts
import { useAppState } from "../shared/state/store";
```

(already present — no change needed there). Add a new icon function near the existing `PipelineIcon`/`SettingsIcon`:

```tsx
function TasksIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      <path d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
```

Destructure `goToTasks` alongside the existing `goToPipeline`/`goToSettings`:

```ts
const { state, goToPipeline, goToSettings, goToTasks, setProjectTab } = useAppState();
```

Add a nav button in the non-`"project"` branch (the `<nav>` block that currently renders only the Pipeline button), right after the Pipeline button:

```tsx
            <button
              onClick={goToTasks}
              className={`flex items-center gap-[11px] w-[calc(100%-20px)] mx-[10px] my-[2px] text-left px-[14px] py-[9px] border-0 rounded-full cursor-pointer font-medium text-[13px] ${
                view === "tasks" ? "bg-grad-accent text-white shadow-[0_2px_10px_rgba(235,91,40,.35)]" : "bg-transparent text-white/70 hover:bg-white/[.08] hover:text-white"
              }`}
            >
              <TasksIcon />
              <span>Tasks</span>
            </button>
```

- [ ] **Step 4: Create the `TasksTab.tsx` shell**

```tsx
import { useState } from "react";

// Screen-switcher for the whole Task Management module, following the
// same view-based (no-router) convention as the rest of Maestro. Filled
// in incrementally: My Tasks (Task 16), Projects (Task 8), Project Detail
// (Task 9) all render through here.
export type TasksScreen = "my-tasks" | "projects" | "project-detail";

export function TasksTab() {
  const [screen, setScreen] = useState<TasksScreen>("my-tasks");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setScreen("my-tasks")}
          className={`px-4 py-[7px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
            screen === "my-tasks" ? "bg-os-orange text-white border-os-orange" : "bg-white text-os-700 border-os-300"
          }`}
        >
          MY TASKS
        </button>
        <button
          onClick={() => setScreen("projects")}
          className={`px-4 py-[7px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
            screen === "projects" || screen === "project-detail" ? "bg-os-orange text-white border-os-orange" : "bg-white text-os-700 border-os-300"
          }`}
        >
          PROJECTS
        </button>
      </div>
      {screen === "my-tasks" && <p className="font-light text-[13.5px] text-os-500">My Tasks — coming online in a later task.</p>}
      {screen === "projects" && (
        <p className="font-light text-[13.5px] text-os-500">
          Projects — coming online in a later task.{" "}
          <button className="underline" onClick={() => { setActiveProjectId("placeholder"); setScreen("project-detail"); }}>
            (dev: open placeholder detail)
          </button>
        </p>
      )}
      {screen === "project-detail" && activeProjectId && (
        <p className="font-light text-[13.5px] text-os-500">
          Project Detail for {activeProjectId} — coming online in a later task.{" "}
          <button className="underline" onClick={() => setScreen("projects")}>Back</button>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Render `TasksTab` in `App.tsx`**

Add the import:

```ts
import { TasksTab } from "../features/tasks/TasksTab";
```

In `Shell()`, add alongside the existing `{state.view === "account" && <AccountTab />}` line:

```tsx
          {state.view === "tasks" && <TasksTab />}
```

- [ ] **Step 6: Commit**

```bash
git add src/shared/state/store.tsx src/app/Sidebar.tsx src/app/App.tsx src/features/tasks/TasksTab.tsx
git commit -m "Add Tasks navigation: sidebar entry, tasks View, and TasksTab shell"
```

**Note for the implementer:** the placeholder content and dev-only "open placeholder detail" link in `TasksTab.tsx` exist only so this task is independently reviewable/testable before Tasks 8/9/16 exist. Tasks 8, 9, and 16 will replace this placeholder body with the real screens — leave a comment marking that when you land those tasks (not this one).

---

### Task 8: Projects screen

**Files:**
- Create: `src/features/tasks/ProjectsScreen.tsx`
- Modify: `src/features/tasks/TasksTab.tsx`

**Interfaces:**
- Consumes: `useTaskProjectsList` (Task 4), `createTaskProject`/`toggleTaskProjectShared`/`deleteTaskProjectCascade` (Task 3), `useTeamRoster` (Task 4), `useAuth()`, `useToast()` (Task 5).
- Produces: `<ProjectsScreen onOpenProject={(id) => void} />`, wired into `TasksTab`'s `"projects"` branch, replacing the Task 7 placeholder.

- [ ] **Step 1: Write `ProjectsScreen.tsx`**

```tsx
import { useMemo, useState } from "react";
import { useAuth } from "../../shared/state/auth";
import { useToast } from "../../shared/state/toast";
import { createTaskProject, deleteTaskProjectCascade, toggleTaskProjectShared } from "./taskProjectsApi";
import { useTaskProjectsList } from "./useTaskProjectsList";
import type { TaskProject } from "./types";

// Compact rows, not cards -- mirrors Pipeline's existing list-row density.
// Open-task count and nearest due date require reading each project's own
// tasks; V1 keeps this screen fast by omitting those two figures from the
// row (they'd need one extra Firestore read per project on every render)
// and shows them instead inside Project Detail's own toolbar, where the
// task list is already loaded. See the design spec's acceptance criteria
// -- "nearest upcoming due date if available" is satisfied at the project
// level, just one screen deeper, rather than paying for it on every row
// of a screen whose whole point is being fast to scan.
export function ProjectsScreen({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { projects, loading } = useTaskProjectsList();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const sorted = useMemo(() => [...projects].sort((a, b) => b.updatedAt - a.updatedAt), [projects]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !user) {
      setCreating(false);
      setNewName("");
      return;
    }
    setCreating(false);
    setNewName("");
    try {
      const id = await createTaskProject(name, user.uid, user.displayName);
      onOpenProject(id);
    } catch (err) {
      console.warn("[tasks] create project failed", err);
      showToast("Couldn't create the project. Please try again.");
    }
  }

  async function handleToggleShared(p: TaskProject) {
    try {
      await toggleTaskProjectShared(p.id, !p.isShared);
    } catch (err) {
      console.warn("[tasks] toggle shared failed", err);
      showToast("Couldn't update sharing. Please try again.");
    }
  }

  async function handleDelete(p: TaskProject) {
    if (!window.confirm(`Delete "${p.name}"? This removes all of its tasks and cannot be undone.`)) return;
    try {
      await deleteTaskProjectCascade(p.id);
    } catch (err) {
      console.warn("[tasks] delete project failed", err);
      showToast("Couldn't delete the project. Please try again.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-xs tracking-[.14em] uppercase text-os-ink">Projects</div>
        {creating ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            onBlur={handleCreate}
            placeholder="Project name"
            className="box-border px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink w-[220px]"
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="px-[14px] py-[7px] border border-os-orange bg-os-orange text-white font-bold text-[11px] tracking-[.06em] rounded-full hover:bg-accent-hover"
          >
            + NEW PROJECT
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[46px] rounded-brand-sm bg-os-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <p className="my-5 font-light text-[13.5px] text-os-500 text-center border border-dashed border-os-300 p-5 rounded-brand-sm">
          No projects yet — click + New Project to get started.
        </p>
      )}

      {!loading &&
        sorted.map((p) => (
          <div key={p.id} className="flex items-center gap-3 min-h-[46px] px-[10px] border-b border-os-200 hover:bg-os-50">
            <button onClick={() => onOpenProject(p.id)} className="flex-1 min-w-0 text-left font-bold text-[13.5px] text-os-ink truncate">
              {p.name}
            </button>
            <div className="flex-none text-[11.5px] text-os-600 w-[120px] truncate">{p.createdByName}</div>
            <button
              onClick={() => handleToggleShared(p)}
              disabled={p.createdBy !== user?.uid}
              title={p.createdBy === user?.uid ? "Toggle sharing" : "Only the owner can change sharing"}
              className={`flex-none px-[10px] py-[4px] rounded-full font-bold text-[10px] tracking-[.04em] border ${
                p.isShared ? "bg-os-orange-050 text-os-orange-700 border-os-orange-300" : "bg-os-100 text-os-600 border-os-200"
              } disabled:cursor-not-allowed`}
            >
              {p.isShared ? "SHARED" : "PRIVATE"}
            </button>
            {p.createdBy === user?.uid && (
              <button
                onClick={() => handleDelete(p)}
                title="Delete project"
                className="flex-none px-2 py-[5px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700"
              >
                ×
              </button>
            )}
          </div>
        ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `TasksTab.tsx`**

Replace the Task 7 placeholder `"projects"` branch. The full updated `TasksTab.tsx`:

```tsx
import { useState } from "react";
import { ProjectsScreen } from "./ProjectsScreen";

export type TasksScreen = "my-tasks" | "projects" | "project-detail";

export function TasksTab() {
  const [screen, setScreen] = useState<TasksScreen>("my-tasks");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  function openProject(id: string) {
    setActiveProjectId(id);
    setScreen("project-detail");
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setScreen("my-tasks")}
          className={`px-4 py-[7px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
            screen === "my-tasks" ? "bg-os-orange text-white border-os-orange" : "bg-white text-os-700 border-os-300"
          }`}
        >
          MY TASKS
        </button>
        <button
          onClick={() => setScreen("projects")}
          className={`px-4 py-[7px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
            screen === "projects" || screen === "project-detail" ? "bg-os-orange text-white border-os-orange" : "bg-white text-os-700 border-os-300"
          }`}
        >
          PROJECTS
        </button>
      </div>
      {screen === "my-tasks" && <p className="font-light text-[13.5px] text-os-500">My Tasks — coming online in a later task.</p>}
      {screen === "projects" && <ProjectsScreen onOpenProject={openProject} />}
      {screen === "project-detail" && activeProjectId && (
        <p className="font-light text-[13.5px] text-os-500">
          Project Detail for {activeProjectId} — coming online in a later task.{" "}
          <button className="underline" onClick={() => setScreen("projects")}>Back</button>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/tasks/ProjectsScreen.tsx src/features/tasks/TasksTab.tsx
git commit -m "Add Projects screen"
```

---

### Task 9: Project Detail toolbar, TaskRow, List view (no drag-and-drop yet)

**Files:**
- Create: `src/features/tasks/ProjectDetailScreen.tsx`
- Create: `src/features/tasks/TaskRow.tsx`
- Create: `src/features/tasks/TaskListView.tsx`
- Modify: `src/features/tasks/TasksTab.tsx`

**Interfaces:**
- Consumes: `useProjectTasks` (Task 6), `createTask`/`updateTask`/`deleteTask` (Task 6), `renameTaskProject`/`toggleTaskProjectShared` (Task 3), `computeSortOrder` (Task 2), `useAuth()`, `useToast()`.
- Produces: `<ProjectDetailScreen projectId={...} onBack={...} />`, `<TaskRow task={...} subtasks={...} ...>` (reused by Task 16's My Tasks), `<TaskListView projectId={...} tasks={...} />`. Drag-and-drop is added on top in Task 10 — this task establishes the row markup and inline-edit behavior first, so that task's diff is reviewable on its own.

- [ ] **Step 1: Write `TaskRow.tsx`**

```tsx
import { memo, useState, type ReactNode } from "react";
import type { Task } from "./types";

// Shared between List view (Task 9/10) and My Tasks (Task 16). Height:
// 44-52px top-level, 36-44px for a subtask (passed via `compact`). See the
// design spec's row layout example. Wrapped in React.memo so dragging or
// editing one row (100+ tasks per project, per the spec's performance
// requirement) doesn't re-render every other row -- each row's props are
// plain values/callbacks scoped to that one task, so the default shallow
// prop comparison is sufficient without a custom comparator.
function TaskRowImpl({
  task,
  compact = false,
  showProject = false,
  hasSubtasks = false,
  expanded = false,
  onToggleExpand,
  onToggleComplete,
  onTitleChange,
  onOpenDrawer,
  onDelete,
  dragHandle,
}: {
  task: Task;
  compact?: boolean;
  showProject?: boolean;
  hasSubtasks?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onToggleComplete: (completed: boolean) => void;
  onTitleChange: (title: string) => void;
  onOpenDrawer: () => void;
  onDelete: () => void;
  dragHandle?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);

  function commitTitle() {
    const trimmed = draftTitle.trim();
    setEditing(false);
    if (trimmed && trimmed !== task.title) onTitleChange(trimmed);
    else setDraftTitle(task.title);
  }

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = !!task.dueDate && task.dueDate < today && !task.completed;

  return (
    <div
      className={`group flex items-center gap-[8px] px-[8px] border-b border-os-200 hover:bg-os-50 ${
        compact ? "min-h-[38px]" : "min-h-[46px]"
      }`}
    >
      {dragHandle}
      {hasSubtasks && onToggleExpand ? (
        <button onClick={onToggleExpand} aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"} className="flex-none w-4 text-os-500">
          {expanded ? "▾" : "▸"}
        </button>
      ) : (
        <span className="flex-none w-4" />
      )}
      <button
        onClick={() => onToggleComplete(!task.completed)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={`flex-none w-[18px] h-[18px] rounded-full border-2 ${
          task.completed ? "bg-os-orange border-os-orange" : "border-os-300 hover:border-os-orange"
        }`}
      />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setDraftTitle(task.title); setEditing(false); }
            }}
            className="box-border w-full px-[6px] py-[3px] border border-os-300 rounded-[6px] bg-[#fdf4e3] font-medium text-[13px] text-os-ink"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`text-left w-full truncate font-medium text-[13px] ${
              task.completed ? "line-through text-os-500" : "text-os-ink"
            }`}
          >
            {task.title}
          </button>
        )}
        {showProject && (
          <div className="text-[10.5px] text-os-500 truncate">{task.projectName}</div>
        )}
      </div>
      <div className="flex-none w-[90px] text-[11.5px] text-os-600 truncate">{task.assigneeName || "—"}</div>
      <div className={`flex-none w-[76px] text-[11.5px] ${isOverdue ? "text-os-orange-700 font-bold" : "text-os-600"}`}>
        {task.dueDate || "—"}
      </div>
      <div className="flex-none opacity-0 group-hover:opacity-100 flex items-center gap-1">
        <button onClick={onOpenDrawer} title="Open task" className="px-[7px] py-[3px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700">
          OPEN
        </button>
        <button onClick={onDelete} title="Delete task" className="px-[7px] py-[3px] border border-os-300 bg-white text-os-600 font-bold text-[10px] rounded-full hover:border-os-orange hover:text-os-orange-700">
          ×
        </button>
      </div>
    </div>
  );
}

export const TaskRow = memo(TaskRowImpl);
```

- [ ] **Step 2: Write `TaskListView.tsx`**

```tsx
import { useMemo, useState } from "react";
import { computeSortOrder } from "./sortOrder";
import { createTask, deleteTask, updateTask } from "./tasksApi";
import { TaskRow } from "./TaskRow";
import type { Task } from "./types";
import { useAuth } from "../../shared/state/auth";
import { useToast } from "../../shared/state/toast";

// No drag-and-drop yet -- Task 10 adds dnd-kit sortable wiring on top of
// this rendering/inline-edit foundation.
export function TaskListView({
  projectId,
  projectName,
  tasks,
  onOpenDrawer,
}: {
  projectId: string;
  projectName: string;
  tasks: Task[];
  onOpenDrawer: (taskId: string) => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [addingTop, setAddingTop] = useState(false);
  const [draft, setDraft] = useState("");

  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);
  const subtasksByParent = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.filter((t) => t.parentTaskId).forEach((t) => {
      const list = map.get(t.parentTaskId!) || [];
      list.push(t);
      map.set(t.parentTaskId!, list);
    });
    return map;
  }, [tasks]);

  async function handleCreate(parentTaskId: string | null) {
    const title = draft.trim();
    setDraft("");
    setAddingTop(false);
    setAddingSubtaskFor(null);
    if (!title || !user) return;
    const siblings = parentTaskId ? subtasksByParent.get(parentTaskId) || [] : topLevel;
    const sortOrder = computeSortOrder(siblings.length ? siblings[siblings.length - 1].sortOrder : null, null);
    try {
      await createTask({ projectId, parentTaskId, title, sortOrder, createdBy: user.uid, project: { name: projectName } });
    } catch (err) {
      console.warn("[tasks] create task failed", err);
      showToast("Couldn't add the task. Please try again.");
    }
  }

  async function handleToggleComplete(task: Task, completed: boolean) {
    try {
      await updateTask(projectId, task.id, { completed, status: completed ? "complete" : "todo" });
    } catch (err) {
      console.warn("[tasks] toggle complete failed", err);
      showToast("Couldn't update the task. Please try again.");
    }
  }

  async function handleTitleChange(task: Task, title: string) {
    try {
      await updateTask(projectId, task.id, { title });
    } catch (err) {
      console.warn("[tasks] rename task failed", err);
      showToast("Couldn't rename the task. Please try again.");
    }
  }

  async function handleDelete(task: Task) {
    try {
      await deleteTask(projectId, task.id);
    } catch (err) {
      console.warn("[tasks] delete task failed", err);
      showToast("Couldn't delete the task. Please try again.");
    }
  }

  return (
    <div>
      {topLevel.length === 0 && !addingTop && (
        <p className="my-5 font-light text-[13.5px] text-os-500 text-center border border-dashed border-os-300 p-5 rounded-brand-sm">
          No tasks yet — add your first one below.
        </p>
      )}
      {topLevel.map((task) => {
        const subtasks = subtasksByParent.get(task.id) || [];
        const isExpanded = expanded.has(task.id);
        return (
          <div key={task.id}>
            <TaskRow
              task={task}
              hasSubtasks={subtasks.length > 0}
              expanded={isExpanded}
              onToggleExpand={() =>
                setExpanded((s) => { const next = new Set(s); next.has(task.id) ? next.delete(task.id) : next.add(task.id); return next; })
              }
              onToggleComplete={(c) => handleToggleComplete(task, c)}
              onTitleChange={(t) => handleTitleChange(task, t)}
              onOpenDrawer={() => onOpenDrawer(task.id)}
              onDelete={() => handleDelete(task)}
            />
            {isExpanded && (
              <div className="pl-[26px]">
                {subtasks.map((sub) => (
                  <TaskRow
                    key={sub.id}
                    task={sub}
                    compact
                    onToggleComplete={(c) => handleToggleComplete(sub, c)}
                    onTitleChange={(t) => handleTitleChange(sub, t)}
                    onOpenDrawer={() => onOpenDrawer(sub.id)}
                    onDelete={() => handleDelete(sub)}
                  />
                ))}
                {addingSubtaskFor === task.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => handleCreate(task.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate(task.id);
                      if (e.key === "Escape") { setDraft(""); setAddingSubtaskFor(null); }
                    }}
                    placeholder="Subtask title"
                    className="box-border w-[calc(100%-8px)] m-1 px-[8px] py-[5px] border border-os-300 rounded-[6px] bg-[#fdf4e3] font-medium text-[12.5px] text-os-ink"
                  />
                ) : (
                  <button onClick={() => setAddingSubtaskFor(task.id)} className="w-full text-left px-[8px] py-[6px] font-medium text-[11.5px] text-os-500 hover:text-os-orange-700">
                    + Add subtask
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {addingTop ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => handleCreate(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate(null);
            if (e.key === "Escape") { setDraft(""); setAddingTop(false); }
          }}
          placeholder="Task title"
          className="box-border w-full mt-1 px-[10px] py-[8px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink"
        />
      ) : (
        <button onClick={() => setAddingTop(true)} className="mt-2 font-medium text-[12.5px] text-os-orange-700 hover:underline">
          + Add Task
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `ProjectDetailScreen.tsx`**

```tsx
import { useState } from "react";
import { useAuth } from "../../shared/state/auth";
import { useToast } from "../../shared/state/toast";
import { renameTaskProject, toggleTaskProjectShared } from "./taskProjectsApi";
import { useTaskProjectsList } from "./useTaskProjectsList";
import { useProjectTasks } from "./useProjectTasks";
import { TaskListView } from "./TaskListView";

export function ProjectDetailScreen({ projectId, onBack, onOpenDrawer }: { projectId: string; onBack: () => void; onOpenDrawer: (taskId: string) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { projects } = useTaskProjectsList();
  const project = projects.find((p) => p.id === projectId);
  const { tasks, loading } = useProjectTasks(projectId);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  if (!project) {
    return (
      <div>
        <button onClick={onBack} className="mb-4 font-medium text-[12.5px] text-os-600 hover:text-os-orange-700">← Projects</button>
        <p className="font-light text-[13.5px] text-os-500">Loading…</p>
      </div>
    );
  }

  async function commitRename() {
    const name = draftName.trim();
    setEditingName(false);
    if (!name || name === project!.name) return;
    try {
      await renameTaskProject(projectId, name);
    } catch (err) {
      console.warn("[tasks] rename project failed", err);
      showToast("Couldn't rename the project. Please try again.");
    }
  }

  async function handleToggleShared() {
    try {
      await toggleTaskProjectShared(projectId, !project!.isShared);
    } catch (err) {
      console.warn("[tasks] toggle shared failed", err);
      showToast("Couldn't update sharing. Please try again.");
    }
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 font-medium text-[12.5px] text-os-600 hover:text-os-orange-700">← Projects</button>
      <div className="flex items-center justify-between gap-4 min-h-[52px] mb-4">
        {editingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingName(false); }}
            className="box-border px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-bold text-[20px] text-os-ink"
          />
        ) : (
          <button
            onClick={() => { setDraftName(project!.name); setEditingName(true); }}
            disabled={project!.createdBy !== user?.uid}
            className="font-bold text-[24px] font-display text-os-ink text-left disabled:cursor-default"
          >
            {project!.name}
          </button>
        )}
        {project!.createdBy === user?.uid && (
          <button
            onClick={handleToggleShared}
            className={`flex-none px-4 py-[8px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
              project!.isShared ? "bg-os-orange-050 text-os-orange-700 border-os-orange-300" : "bg-white text-os-700 border-os-300"
            }`}
          >
            {project!.isShared ? "SHARED WITH TEAM" : "SHARE WITH TEAM"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[46px] rounded-brand-sm bg-os-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <TaskListView projectId={projectId} projectName={project!.name} tasks={tasks} onOpenDrawer={onOpenDrawer} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire into `TasksTab.tsx`**

Replace the `"project-detail"` placeholder branch:

```tsx
{screen === "project-detail" && activeProjectId && (
  <ProjectDetailScreen projectId={activeProjectId} onBack={() => setScreen("projects")} onOpenDrawer={() => {}} />
)}
```

(the `onOpenDrawer` no-op is replaced with a real handler in Task 14; leave it as `() => {}` for now, not a placeholder string — this is a real, correct no-op until the drawer exists.) Add the import: `import { ProjectDetailScreen } from "./ProjectDetailScreen";`.

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/ProjectDetailScreen.tsx src/features/tasks/TaskRow.tsx src/features/tasks/TaskListView.tsx src/features/tasks/TasksTab.tsx
git commit -m "Add Project Detail toolbar, TaskRow, and List view (no drag-and-drop yet)"
```

---

### Task 10: List view drag-and-drop

**Files:**
- Modify: `package.json`
- Modify: `src/features/tasks/TaskListView.tsx`

**Interfaces:**
- Consumes: `TaskListView` (Task 9), `updateTask` (Task 6), `computeSortOrder` (Task 2).
- Produces: vertical reordering of top-level tasks and, within an expanded parent, its subtasks, persisted via `sortOrder`.

- [ ] **Step 1: Add the dnd-kit dependency**

In `package.json`, add to `dependencies`:

```json
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
```

- [ ] **Step 2: Wire `@dnd-kit/sortable` into `TaskListView.tsx`**

Add imports at the top:

```tsx
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
```

Add a small sortable-row wrapper above the `TaskListView` function:

```tsx
function SortableTaskRow({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const handle = (
    <button {...attributes} {...listeners} aria-label="Drag to reorder" className="flex-none w-4 text-os-400 cursor-grab active:cursor-grabbing">
      ⠿
    </button>
  );
  return <div ref={setNodeRef} style={style}>{children(handle)}</div>;
}
```

Inside `TaskListView`, add a reorder handler (placed alongside the existing `handleDelete`):

```tsx
  async function handleReorderTop(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIndex = topLevel.findIndex((t) => t.id === active.id);
    const overIndex = topLevel.findIndex((t) => t.id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;
    const reordered = [...topLevel];
    const [moved] = reordered.splice(activeIndex, 1);
    reordered.splice(overIndex, 0, moved);
    const before = reordered[overIndex - 1]?.sortOrder ?? null;
    const after = reordered[overIndex + 1]?.sortOrder ?? null;
    try {
      await updateTask(projectId, moved.id, { sortOrder: computeSortOrder(before, after) });
    } catch (err) {
      console.warn("[tasks] reorder failed", err);
      showToast("Couldn't reorder. Please try again.");
    }
  }

  async function handleReorderSubtasks(parentId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const siblings = subtasksByParent.get(parentId) || [];
    const activeIndex = siblings.findIndex((t) => t.id === active.id);
    const overIndex = siblings.findIndex((t) => t.id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;
    const reordered = [...siblings];
    const [moved] = reordered.splice(activeIndex, 1);
    reordered.splice(overIndex, 0, moved);
    const before = reordered[overIndex - 1]?.sortOrder ?? null;
    const after = reordered[overIndex + 1]?.sortOrder ?? null;
    try {
      await updateTask(projectId, moved.id, { sortOrder: computeSortOrder(before, after) });
    } catch (err) {
      console.warn("[tasks] reorder failed", err);
      showToast("Couldn't reorder. Please try again.");
    }
  }
```

Wrap the top-level task list render in a `DndContext`/`SortableContext`, and each `TaskRow` in `SortableTaskRow`, passing its `dragHandle`. Replace the `{topLevel.map((task) => { ... })}` block with:

```tsx
      <DndContext collisionDetection={closestCenter} onDragEnd={handleReorderTop}>
        <SortableContext items={topLevel.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {topLevel.map((task) => {
            const subtasks = subtasksByParent.get(task.id) || [];
            const isExpanded = expanded.has(task.id);
            return (
              <SortableTaskRow key={task.id} id={task.id}>
                {(dragHandle) => (
                  <div>
                    <TaskRow
                      task={task}
                      hasSubtasks={subtasks.length > 0}
                      expanded={isExpanded}
                      dragHandle={dragHandle}
                      onToggleExpand={() =>
                        setExpanded((s) => { const next = new Set(s); next.has(task.id) ? next.delete(task.id) : next.add(task.id); return next; })
                      }
                      onToggleComplete={(c) => handleToggleComplete(task, c)}
                      onTitleChange={(t) => handleTitleChange(task, t)}
                      onOpenDrawer={() => onOpenDrawer(task.id)}
                      onDelete={() => handleDelete(task)}
                    />
                    {isExpanded && (
                      <div className="pl-[26px]">
                        <DndContext collisionDetection={closestCenter} onDragEnd={(e) => handleReorderSubtasks(task.id, e)}>
                          <SortableContext items={subtasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                            {subtasks.map((sub) => (
                              <SortableTaskRow key={sub.id} id={sub.id}>
                                {(subHandle) => (
                                  <TaskRow
                                    task={sub}
                                    compact
                                    dragHandle={subHandle}
                                    onToggleComplete={(c) => handleToggleComplete(sub, c)}
                                    onTitleChange={(t) => handleTitleChange(sub, t)}
                                    onOpenDrawer={() => onOpenDrawer(sub.id)}
                                    onDelete={() => handleDelete(sub)}
                                  />
                                )}
                              </SortableTaskRow>
                            ))}
                          </SortableContext>
                        </DndContext>
                        {addingSubtaskFor === task.id ? (
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => handleCreate(task.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreate(task.id);
                              if (e.key === "Escape") { setDraft(""); setAddingSubtaskFor(null); }
                            }}
                            placeholder="Subtask title"
                            className="box-border w-[calc(100%-8px)] m-1 px-[8px] py-[5px] border border-os-300 rounded-[6px] bg-[#fdf4e3] font-medium text-[12.5px] text-os-ink"
                          />
                        ) : (
                          <button onClick={() => setAddingSubtaskFor(task.id)} className="w-full text-left px-[8px] py-[6px] font-medium text-[11.5px] text-os-500 hover:text-os-orange-700">
                            + Add subtask
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </SortableTaskRow>
            );
          })}
        </SortableContext>
      </DndContext>
```

This replaces the equivalent block from Task 9 — the `{topLevel.length === 0 && ...}` empty state and the trailing `+ Add Task` control stay exactly as they were, outside this replaced block.

- [ ] **Step 3: Commit**

```bash
git add package.json src/features/tasks/TaskListView.tsx
git commit -m "Add List view drag-and-drop with dnd-kit"
```

**Note for the implementer:** `package.json` cannot be installed/verified in this environment (no Node.js) — report the dependency addition as written-but-unverified, same as every other change in this plan. Vercel's build will install it for real on the next deploy.

---

### Task 11: AssigneePicker

**Files:**
- Create: `src/features/tasks/AssigneePicker.tsx`
- Modify: `src/features/tasks/TaskRow.tsx`
- Modify: `src/features/tasks/TaskListView.tsx`

**Interfaces:**
- Consumes: `Popover` (Task 5), `useTeamRoster` (Task 4), `assignTask` (Task 6), the ProfileMenu avatar-initial pattern.
- Produces: `<AssigneePicker task={...} projectId={...} isShared={...} />`, wired into `TaskRow`'s assignee cell (both List view and later My Tasks/Drawer usage).

- [ ] **Step 1: Write `AssigneePicker.tsx`**

```tsx
import { useState } from "react";
import { Popover } from "../../shared/components/Popover";
import { useAuth } from "../../shared/state/auth";
import { useToast } from "../../shared/state/toast";
import { useTeamRoster } from "./useTeamRoster";
import { assignTask } from "./tasksApi";
import type { Task } from "./types";

function Initial({ name, photoURL }: { name: string; photoURL: string | null }) {
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
          {task.assigneeId ? <Initial name={task.assigneeName || "?"} photoURL={null} /> : <div className="w-5 h-5 rounded-full flex-none border border-dashed border-os-300" />}
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
```

- [ ] **Step 2: Wire into `TaskRow.tsx`**

`TaskRow` needs `projectId` and `isShared` to render the picker instead of plain text. Add those two props to `TaskRowImpl` (the function wrapped by `export const TaskRow = memo(TaskRowImpl);` — edit the inner function, the `memo()` export line at the bottom doesn't change):

```tsx
function TaskRowImpl({
  task,
  projectId,
  isShared,
  compact = false,
  ...
```

(add `projectId: string; isShared: boolean;` to the props type). Replace the static assignee cell:

```tsx
      <div className="flex-none w-[90px] text-[11.5px] text-os-600 truncate">{task.assigneeName || "—"}</div>
```

with:

```tsx
      <div className="flex-none w-[100px]">
        <AssigneePicker projectId={projectId} task={task} isShared={isShared} />
      </div>
```

Add the import: `import { AssigneePicker } from "./AssigneePicker";`. Every `<TaskRow ... />` call site in `TaskListView.tsx` (there are three: top-level, subtask, and the two inside the drag-and-drop wrapper from Task 10) must now also pass `projectId={projectId}` and `isShared={project's isShared}` — `TaskListView` already receives `projectId` as a prop; add a new `isShared: boolean` prop to `TaskListView` itself, passed down from `ProjectDetailScreen`'s `project!.isShared`, and thread it through to every `TaskRow` call site.

- [ ] **Step 3: Commit**

```bash
git add src/features/tasks/AssigneePicker.tsx src/features/tasks/TaskRow.tsx src/features/tasks/TaskListView.tsx src/features/tasks/ProjectDetailScreen.tsx
git commit -m "Add AssigneePicker, wired into List view task rows"
```

---

### Task 12: TaskCard and Board view (no drag-and-drop yet)

**Files:**
- Create: `src/features/tasks/TaskCard.tsx`
- Create: `src/features/tasks/TaskBoardView.tsx`
- Modify: `src/features/tasks/ProjectDetailScreen.tsx`

**Interfaces:**
- Consumes: `Task`/`TaskStatus` types (Task 3), `useProjectTasks` (Task 6).
- Produces: `<TaskBoardView projectId={...} tasks={...} onOpenDrawer={...} />`, and a List/Board toggle in `ProjectDetailScreen`, persisted per-project in `localStorage`.

- [ ] **Step 1: Write `TaskCard.tsx`**

```tsx
import { memo } from "react";
import type { Task } from "./types";

// 10-12px padding, compact -- see the design spec's Board card example.
// Memoized for the same reason as TaskRow (see that component's comment)
// -- Board columns can hold many cards and shouldn't all re-render when
// one card's drag position or data changes.
function TaskCardImpl({ task, subtaskCount, onOpen }: { task: Task; subtaskCount: number; onOpen: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = !!task.dueDate && task.dueDate < today && !task.completed;

  return (
    <button onClick={onOpen} className="w-full text-left bg-white border border-os-200 rounded-brand-sm px-[11px] py-[10px] mb-2 hover:border-os-orange/50">
      <div className="font-bold text-[12.5px] text-os-ink truncate">{task.title}</div>
      <div className="flex items-center justify-between mt-[6px]">
        <span className="text-[11px] text-os-600 truncate">{task.assigneeName || "Unassigned"}</span>
        <span className={`text-[11px] flex-none ml-2 ${isOverdue ? "text-os-orange-700 font-bold" : "text-os-500"}`}>{task.dueDate || ""}</span>
      </div>
      {subtaskCount > 0 && <div className="mt-1 text-[10px] text-os-500">{subtaskCount} subtask{subtaskCount === 1 ? "" : "s"}</div>}
    </button>
  );
}

export const TaskCard = memo(TaskCardImpl);
```

- [ ] **Step 2: Write `TaskBoardView.tsx`**

```tsx
import { useMemo } from "react";
import type { Task, TaskStatus } from "./types";
import { TaskCard } from "./TaskCard";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "TO DO" },
  { status: "in_progress", label: "IN PROGRESS" },
  { status: "complete", label: "COMPLETE" },
];

// No drag-and-drop yet -- Task 13 adds dnd-kit cross-column dragging on
// top of this rendering. Only top-level tasks appear as cards; subtasks
// aren't shown on the board (List view is where subtasks live).
export function TaskBoardView({ tasks, onOpenDrawer }: { tasks: Task[]; onOpenDrawer: (taskId: string) => void }) {
  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);
  const subtaskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.filter((t) => t.parentTaskId).forEach((t) => counts.set(t.parentTaskId!, (counts.get(t.parentTaskId!) || 0) + 1));
    return counts;
  }, [tasks]);

  return (
    <div className="grid grid-cols-3 gap-[14px] max-md:grid-cols-1">
      {COLUMNS.map((col) => {
        const items = topLevel.filter((t) => t.status === col.status).sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <div key={col.status} className="bg-os-50 rounded-brand-md p-[10px]">
            <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 mb-2">
              {col.label} <span className="font-medium text-os-500">({items.length})</span>
            </div>
            {items.map((t) => (
              <TaskCard key={t.id} task={t} subtaskCount={subtaskCounts.get(t.id) || 0} onOpen={() => onOpenDrawer(t.id)} />
            ))}
            {items.length === 0 && <div className="text-[11px] text-os-400 italic px-1 py-2">No tasks</div>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Add the List/Board toggle to `ProjectDetailScreen.tsx`**

Add state and a `localStorage`-backed initializer near the top of the component:

```tsx
  const [viewMode, setViewMode] = useState<"list" | "board">(() => (localStorage.getItem(`tasksView.${projectId}`) as "list" | "board") || "list");

  function setViewModePersist(mode: "list" | "board") {
    setViewMode(mode);
    localStorage.setItem(`tasksView.${projectId}`, mode);
  }
```

Add the import: `import { TaskBoardView } from "./TaskBoardView";`. Add a segmented toggle in the toolbar (right after the project name/share-toggle row, before the task list render):

```tsx
      <div className="flex mb-4">
        <button
          onClick={() => setViewModePersist("list")}
          className="font-bold text-[11.5px] px-4 py-[7px] border rounded-l-full cursor-pointer"
          style={{ borderColor: viewMode === "list" ? "#EB5B28" : "#d2d1d3", background: viewMode === "list" ? "#EB5B28" : "#fff", color: viewMode === "list" ? "#fff" : "#57575a" }}
        >
          LIST
        </button>
        <button
          onClick={() => setViewModePersist("board")}
          className="font-bold text-[11.5px] px-4 py-[7px] border border-l-0 rounded-r-full cursor-pointer"
          style={{ borderColor: viewMode === "board" ? "#EB5B28" : "#d2d1d3", background: viewMode === "board" ? "#EB5B28" : "#fff", color: viewMode === "board" ? "#fff" : "#57575a" }}
        >
          BOARD
        </button>
      </div>
```

Change the render of the task list from unconditionally rendering `TaskListView` to switching on `viewMode`:

```tsx
      {loading ? (
        <div className="flex flex-col gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[46px] rounded-brand-sm bg-os-100 animate-pulse" />
          ))}
        </div>
      ) : viewMode === "list" ? (
        <TaskListView projectId={projectId} projectName={project!.name} isShared={project!.isShared} tasks={tasks} onOpenDrawer={onOpenDrawer} />
      ) : (
        <TaskBoardView tasks={tasks} onOpenDrawer={onOpenDrawer} />
      )}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/tasks/TaskCard.tsx src/features/tasks/TaskBoardView.tsx src/features/tasks/ProjectDetailScreen.tsx
git commit -m "Add TaskCard and Board view with List/Board toggle"
```

---

### Task 13: Board view drag-and-drop

**Files:**
- Modify: `src/features/tasks/TaskBoardView.tsx`

**Interfaces:**
- Consumes: `moveTaskToStatus` (Task 6), `computeSortOrder` (Task 2), `@dnd-kit` (Task 10).
- Produces: within-column reordering and cross-column dragging, with the exact status/completed mapping from the design spec.

- [ ] **Step 1: Rewrite `TaskBoardView.tsx` with dnd-kit**

```tsx
import { useMemo, useState } from "react";
import { DndContext, DragOverlay, closestCenter, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { computeSortOrder } from "./sortOrder";
import { moveTaskToStatus } from "./tasksApi";
import { useToast } from "../../shared/state/toast";
import { TaskCard } from "./TaskCard";
import type { Task, TaskStatus } from "./types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "TO DO" },
  { status: "in_progress", label: "IN PROGRESS" },
  { status: "complete", label: "COMPLETE" },
];

function SortableCard({ task, subtaskCount, onOpen }: { task: Task; subtaskCount: number; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { status: task.status } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} subtaskCount={subtaskCount} onOpen={onOpen} />
    </div>
  );
}

function Column({ status, label, items, subtaskCounts, onOpenDrawer }: { status: TaskStatus; label: string; items: Task[]; subtaskCounts: Map<string, number>; onOpenDrawer: (id: string) => void }) {
  const { setNodeRef } = useDroppable({ id: `column:${status}` });
  return (
    <div ref={setNodeRef} className="bg-os-50 rounded-brand-md p-[10px] min-h-[80px]">
      <div className="font-bold text-[10.5px] tracking-[.1em] uppercase text-os-600 mb-2">
        {label} <span className="font-medium text-os-500">({items.length})</span>
      </div>
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {items.map((t) => (
          <SortableCard key={t.id} task={t} subtaskCount={subtaskCounts.get(t.id) || 0} onOpen={() => onOpenDrawer(t.id)} />
        ))}
      </SortableContext>
      {items.length === 0 && <div className="text-[11px] text-os-400 italic px-1 py-2">No tasks</div>}
    </div>
  );
}

export function TaskBoardView({ projectId, tasks, onOpenDrawer }: { projectId: string; tasks: Task[]; onOpenDrawer: (taskId: string) => void }) {
  const { showToast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);
  const subtaskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.filter((t) => t.parentTaskId).forEach((t) => counts.set(t.parentTaskId!, (counts.get(t.parentTaskId!) || 0) + 1));
    return counts;
  }, [tasks]);

  const byColumn = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    COLUMNS.forEach((c) => map.set(c.status, topLevel.filter((t) => t.status === c.status).sort((a, b) => a.sortOrder - b.sortOrder)));
    return map;
  }, [topLevel]);

  function columnOf(id: string): TaskStatus | null {
    if (id.startsWith("column:")) return id.slice(7) as TaskStatus;
    const task = topLevel.find((t) => t.id === id);
    return task ? task.status : null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeTask = topLevel.find((t) => t.id === active.id);
    if (!activeTask) return;
    const targetStatus = columnOf(String(over.id));
    if (!targetStatus) return;

    const targetItems = (byColumn.get(targetStatus) || []).filter((t) => t.id !== activeTask.id);
    const overIndex = targetItems.findIndex((t) => t.id === over.id);
    const insertAt = overIndex === -1 ? targetItems.length : overIndex;
    const before = targetItems[insertAt - 1]?.sortOrder ?? null;
    const after = targetItems[insertAt]?.sortOrder ?? null;
    const sortOrder = computeSortOrder(before, after);

    if (targetStatus === activeTask.status && sortOrder === activeTask.sortOrder) return;

    try {
      await moveTaskToStatus(projectId, activeTask.id, targetStatus, sortOrder);
    } catch (err) {
      console.warn("[tasks] board move failed", err);
      showToast("Couldn't move the task. Please try again.");
    }
  }

  const activeTask = activeId ? topLevel.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-3 gap-[14px] max-md:grid-cols-1">
        {COLUMNS.map((col) => (
          <Column key={col.status} status={col.status} label={col.label} items={byColumn.get(col.status) || []} subtaskCounts={subtaskCounts} onOpenDrawer={onOpenDrawer} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} subtaskCount={subtaskCounts.get(activeTask.id) || 0} onOpen={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 2: Update the `TaskBoardView` call site in `ProjectDetailScreen.tsx`**

Change:

```tsx
        <TaskBoardView tasks={tasks} onOpenDrawer={onOpenDrawer} />
```

to:

```tsx
        <TaskBoardView projectId={projectId} tasks={tasks} onOpenDrawer={onOpenDrawer} />
```

- [ ] **Step 3: Commit**

```bash
git add src/features/tasks/TaskBoardView.tsx src/features/tasks/ProjectDetailScreen.tsx
git commit -m "Add Board view drag-and-drop: within-column reorder and cross-column move"
```

---

### Task 14: Task Detail Drawer

**Files:**
- Create: `src/features/tasks/TaskDrawer.tsx`
- Modify: `src/features/tasks/ProjectDetailScreen.tsx`

**Interfaces:**
- Consumes: `Drawer` (Task 5), `AssigneePicker` (Task 11), `updateTask`/`deleteTask` (Task 6), `useProjectTasks` (Task 6).
- Produces: `<TaskDrawer projectId={...} taskId={...} tasks={...} isShared={...} onClose={...} />`, wired into `ProjectDetailScreen` (replacing the `onOpenDrawer={() => {}}` no-op from Task 9).

- [ ] **Step 1: Write `TaskDrawer.tsx`**

```tsx
import { useState } from "react";
import { Drawer } from "../../shared/components/Drawer";
import { AssigneePicker } from "./AssigneePicker";
import { deleteTask, updateTask } from "./tasksApi";
import { useToast } from "../../shared/state/toast";
import type { Task, TaskStatus } from "./types";

const STATUS_LABELS: Record<TaskStatus, string> = { todo: "Todo", in_progress: "In Progress", complete: "Complete" };

export function TaskDrawer({
  projectId,
  taskId,
  tasks,
  isShared,
  onClose,
  onSelectTask,
}: {
  projectId: string;
  taskId: string | null;
  tasks: Task[];
  isShared: boolean;
  onClose: () => void;
  onSelectTask: (id: string) => void;
}) {
  const { showToast } = useToast();
  const task = tasks.find((t) => t.id === taskId) || null;
  const subtasks = task ? tasks.filter((t) => t.parentTaskId === task.id) : [];
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [draft, setDraft] = useState("");

  if (!task) return <Drawer open={!!taskId} onClose={onClose}><div /></Drawer>;

  async function save(fields: Partial<Pick<Task, "title" | "description" | "dueDate" | "status" | "completed">>) {
    try {
      await updateTask(projectId, task!.id, fields);
    } catch (err) {
      console.warn("[tasks] drawer save failed", err);
      showToast("Couldn't save. Please try again.");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this task?")) return;
    try {
      await deleteTask(projectId, task!.id);
      onClose();
    } catch (err) {
      console.warn("[tasks] drawer delete failed", err);
      showToast("Couldn't delete the task. Please try again.");
    }
  }

  async function addSubtask() {
    const title = draft.trim();
    setDraft("");
    setAddingSubtask(false);
    if (!title) return;
    const { createTask } = await import("./tasksApi");
    const { computeSortOrder } = await import("./sortOrder");
    const siblingOrders = subtasks.map((s) => s.sortOrder);
    try {
      await createTask({
        projectId,
        parentTaskId: task!.id,
        title,
        sortOrder: computeSortOrder(siblingOrders.length ? Math.max(...siblingOrders) : null, null),
        createdBy: task!.createdBy,
        project: { name: task!.projectName },
      });
    } catch (err) {
      console.warn("[tasks] add subtask failed", err);
      showToast("Couldn't add the subtask. Please try again.");
    }
  }

  return (
    <Drawer open={!!taskId} onClose={onClose}>
      <div className="p-5">
        <input
          defaultValue={task.title}
          key={task.id}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== task.title) save({ title: v }); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-full mb-4 font-bold text-[20px] text-os-ink border-0 border-b-2 border-transparent focus:border-os-orange-300 focus:outline-none pb-1"
        />

        <button
          onClick={() => save({ completed: !task.completed, status: task.completed ? "todo" : "complete" })}
          className="flex items-center gap-2 mb-5 font-medium text-[13px] text-os-700"
        >
          <span className={`w-[18px] h-[18px] rounded-full border-2 ${task.completed ? "bg-os-orange border-os-orange" : "border-os-300"}`} />
          Complete
        </button>

        <div className="mb-4">
          <div className="font-bold text-[10px] tracking-[.1em] uppercase text-os-500 mb-1">Assignee</div>
          <AssigneePicker projectId={projectId} task={task} isShared={isShared} />
        </div>

        <div className="mb-4">
          <div className="font-bold text-[10px] tracking-[.1em] uppercase text-os-500 mb-1">Due date</div>
          <input
            type="date"
            defaultValue={task.dueDate || ""}
            key={task.id + "-date"}
            onChange={(e) => save({ dueDate: e.target.value || null })}
            className="box-border px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink"
          />
        </div>

        <div className="mb-4">
          <div className="font-bold text-[10px] tracking-[.1em] uppercase text-os-500 mb-1">Status</div>
          <select
            value={task.status}
            onChange={(e) => { const status = e.target.value as TaskStatus; save({ status, completed: status === "complete" }); }}
            className="box-border px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink"
          >
            {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <div className="font-bold text-[10px] tracking-[.1em] uppercase text-os-500 mb-1">Description</div>
          <textarea
            defaultValue={task.description || ""}
            key={task.id + "-desc"}
            onBlur={(e) => save({ description: e.target.value || null })}
            className="box-border w-full min-h-[70px] px-[10px] py-[6px] border border-os-300 rounded-brand-sm bg-[#fdf4e3] font-medium text-[13px] text-os-ink resize-y"
          />
        </div>

        <div className="mb-6">
          <div className="font-bold text-[10px] tracking-[.1em] uppercase text-os-500 mb-1">Subtasks</div>
          {subtasks.map((s) => (
            <button key={s.id} onClick={() => onSelectTask(s.id)} className="flex items-center gap-2 w-full text-left py-[6px] font-medium text-[12.5px] text-os-700 hover:text-os-orange-700">
              <span className={`w-[14px] h-[14px] rounded-full border-2 flex-none ${s.completed ? "bg-os-orange border-os-orange" : "border-os-300"}`} />
              <span className={s.completed ? "line-through text-os-500" : ""}>{s.title}</span>
            </button>
          ))}
          {addingSubtask ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={addSubtask}
              onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setDraft(""); setAddingSubtask(false); } }}
              placeholder="Subtask title"
              className="box-border w-full mt-1 px-[8px] py-[5px] border border-os-300 rounded-[6px] bg-[#fdf4e3] font-medium text-[12.5px] text-os-ink"
            />
          ) : (
            <button onClick={() => setAddingSubtask(true)} className="mt-1 font-medium text-[12px] text-os-orange-700 hover:underline">
              + Add subtask
            </button>
          )}
        </div>

        <button onClick={handleDelete} className="font-bold text-[12px] text-os-500 hover:text-red-600">
          Delete Task
        </button>
      </div>
    </Drawer>
  );
}
```

- [ ] **Step 2: Wire into `ProjectDetailScreen.tsx`**

Add state for the open drawer task, and render `TaskDrawer`. Add the import: `import { TaskDrawer } from "./TaskDrawer";`. Add state near `viewMode`:

```tsx
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
```

Change every `onOpenDrawer={onOpenDrawer}` prop passed to `TaskListView`/`TaskBoardView` to `onOpenDrawer={setDrawerTaskId}` (the `onOpenDrawer` prop that `ProjectDetailScreen` itself receives from `TasksTab` is no longer needed for this — remove the `onOpenDrawer` prop from `ProjectDetailScreen`'s own signature, since the drawer is now fully self-contained inside this screen). Update `TasksTab.tsx`'s render of `ProjectDetailScreen` to drop the now-removed `onOpenDrawer={() => {}}` prop.

At the end of the returned JSX (after the List/Board conditional), add:

```tsx
      <TaskDrawer
        projectId={projectId}
        taskId={drawerTaskId}
        tasks={tasks}
        isShared={project!.isShared}
        onClose={() => setDrawerTaskId(null)}
        onSelectTask={setDrawerTaskId}
      />
```

- [ ] **Step 3: Commit**

```bash
git add src/features/tasks/TaskDrawer.tsx src/features/tasks/ProjectDetailScreen.tsx src/features/tasks/TasksTab.tsx
git commit -m "Add Task Detail Drawer"
```

---

### Task 15: FilterBar

**Files:**
- Create: `src/features/tasks/FilterBar.tsx`
- Create: `src/features/tasks/useTasksFilters.ts`
- Test: `src/features/tasks/useTasksFilters.test.ts`
- Modify: `src/features/tasks/ProjectDetailScreen.tsx`

**Interfaces:**
- Consumes: `Popover` (Task 5), `isWithinDueDateFilter`/`DueDateFilter` (Task 2), `useTeamRoster` (Task 4).
- Produces: `applyTaskFilters(tasks, filters)` (pure, tested), `<FilterBar members={...} value={...} onChange={...} />`, wired into `ProjectDetailScreen` so both List and Board views only see the filtered task set.

- [ ] **Step 1: Write `useTasksFilters.ts`**

```ts
import { isWithinDueDateFilter, type DueDateFilter } from "./dueDateBucket";
import type { Task, TaskStatus } from "./types";

export interface TaskFilters {
  assigneeId: string | "any";
  dueDate: DueDateFilter;
  status: TaskStatus | "any";
}

export const DEFAULT_FILTERS: TaskFilters = { assigneeId: "any", dueDate: "any", status: "any" };

// Pure so it's independently testable -- also directly reusable by My
// Tasks (Task 16), which applies the same three filters across projects.
export function applyTaskFilters(tasks: Task[], filters: TaskFilters, todayIso: string): Task[] {
  return tasks.filter((t) => {
    if (filters.assigneeId !== "any" && t.assigneeId !== filters.assigneeId) return false;
    if (filters.status !== "any" && t.status !== filters.status) return false;
    if (!isWithinDueDateFilter(t.dueDate, filters.dueDate, todayIso)) return false;
    return true;
  });
}
```

- [ ] **Step 2: Write `useTasksFilters.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { applyTaskFilters, DEFAULT_FILTERS } from "./useTasksFilters";
import type { Task } from "./types";

const TODAY = "2026-08-07";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "t1", projectId: "p1", parentTaskId: null, title: "Test", description: null,
    assigneeId: null, assigneeName: null, dueDate: null, status: "todo", completed: false,
    sortOrder: 1000, createdAt: 0, updatedAt: 0, createdBy: "u1", projectName: "Project",
    ...overrides,
  };
}

describe("applyTaskFilters", () => {
  it("returns everything when all filters are 'any'", () => {
    const tasks = [makeTask({ id: "a" }), makeTask({ id: "b", status: "complete" })];
    expect(applyTaskFilters(tasks, DEFAULT_FILTERS, TODAY)).toHaveLength(2);
  });

  it("filters by assignee", () => {
    const tasks = [makeTask({ id: "a", assigneeId: "u1" }), makeTask({ id: "b", assigneeId: "u2" })];
    const result = applyTaskFilters(tasks, { ...DEFAULT_FILTERS, assigneeId: "u1" }, TODAY);
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });

  it("filters by status", () => {
    const tasks = [makeTask({ id: "a", status: "todo" }), makeTask({ id: "b", status: "complete" })];
    const result = applyTaskFilters(tasks, { ...DEFAULT_FILTERS, status: "complete" }, TODAY);
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });

  it("filters by due date bucket", () => {
    const tasks = [makeTask({ id: "a", dueDate: "2026-08-01" }), makeTask({ id: "b", dueDate: "2026-09-01" })];
    const result = applyTaskFilters(tasks, { ...DEFAULT_FILTERS, dueDate: "overdue" }, TODAY);
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });

  it("combines all three filters with AND semantics", () => {
    const tasks = [
      makeTask({ id: "a", assigneeId: "u1", status: "todo", dueDate: "2026-08-01" }),
      makeTask({ id: "b", assigneeId: "u1", status: "complete", dueDate: "2026-08-01" }),
    ];
    const result = applyTaskFilters(tasks, { assigneeId: "u1", status: "todo", dueDate: "overdue" }, TODAY);
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });
});
```

- [ ] **Step 3: Write `FilterBar.tsx`**

```tsx
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
```

- [ ] **Step 4: Wire into `ProjectDetailScreen.tsx`**

Add imports: `import { FilterBar } from "./FilterBar";`, `import { applyTaskFilters, DEFAULT_FILTERS, type TaskFilters } from "./useTasksFilters";`. Add state:

```tsx
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
```

Compute the filtered set right before the List/Board render (after `tasks` comes back from `useProjectTasks`):

```tsx
  const today = new Date().toISOString().slice(0, 10);
  const filteredTasks = applyTaskFilters(tasks, filters, today);
```

Note: filtering must preserve a task's subtasks alongside it if the parent matches, or callers of `TaskListView` would show orphaned subtask rows. Keep this simple, matching the spec's "no need to overengineer" tone: pass `filteredTasks` to `TaskBoardView` (which already only looks at top-level tasks, so this is correct as-is), but pass the **unfiltered** `tasks` to `TaskListView`, and instead filter only which top-level tasks are visible by intersecting with `filteredTasks`'s ids — add one line inside `TaskListView.tsx`'s existing `topLevel` computation:

In `TaskListView.tsx`, add a new optional prop `visibleTaskIds?: Set<string>` and change:

```ts
  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);
```

to:

```ts
  const topLevel = useMemo(
    () => tasks.filter((t) => !t.parentTaskId && (!visibleTaskIds || visibleTaskIds.has(t.id))),
    [tasks, visibleTaskIds],
  );
```

(subtasks of a visible parent still render normally when expanded, filters apply at the top-level task granularity only — consistent with the spec's toolbar-level filtering intent, and avoids the more complex "filter matches a subtask but not its parent" edge case the spec never asked for). Add `visibleTaskIds` to `TaskListView`'s props type. In `ProjectDetailScreen.tsx`, pass:

```tsx
        <TaskListView projectId={projectId} projectName={project!.name} isShared={project!.isShared} tasks={tasks} visibleTaskIds={new Set(filteredTasks.filter((t) => !t.parentTaskId).map((t) => t.id))} onOpenDrawer={setDrawerTaskId} />
```

and for the board:

```tsx
        <TaskBoardView projectId={projectId} tasks={filteredTasks} onOpenDrawer={setDrawerTaskId} />
```

Add `<FilterBar value={filters} onChange={setFilters} />` to the toolbar, next to the List/Board toggle.

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/FilterBar.tsx src/features/tasks/useTasksFilters.ts src/features/tasks/useTasksFilters.test.ts src/features/tasks/TaskListView.tsx src/features/tasks/ProjectDetailScreen.tsx
git commit -m "Add FilterBar (Owner/Due Date/Status) with tested pure filter logic"
```

---

### Task 16: useMyTasks hook and My Tasks screen

**Files:**
- Create: `src/features/tasks/useMyTasks.ts`
- Create: `src/features/tasks/MyTasksScreen.tsx`
- Modify: `src/features/tasks/TasksTab.tsx`

**Interfaces:**
- Consumes: `db`/`useAuth()`, `getDueDateBucket` (Task 2), `TaskRow`/`AssigneePicker` (Tasks 9/11), `updateTask`/`deleteTask` (Task 6).
- Produces: `<MyTasksScreen />`, wired into `TasksTab`'s `"my-tasks"` branch, replacing the Task 7 placeholder.

- [ ] **Step 1: Write `useMyTasks.ts`**

```ts
import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import { useAuth } from "../../shared/state/auth";
import type { Task } from "./types";

// Collection-group query across every taskProjects/*/tasks subcollection
// -- this is what the design spec's denormalized projectName field and
// get()-based security rules exist to support. See the design spec,
// "Architecture".
export function useMyTasks(): { tasks: Task[]; loading: boolean } {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const q = query(collectionGroup(db, "tasks"), where("assigneeId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { tasks, loading };
}
```

- [ ] **Step 2: Write `MyTasksScreen.tsx`**

```tsx
import { useMemo } from "react";
import { useMyTasks } from "./useMyTasks";
import { getDueDateBucket, type DueDateBucket } from "./dueDateBucket";
import { TaskRow } from "./TaskRow";
import { updateTask, deleteTask } from "./tasksApi";
import { useToast } from "../../shared/state/toast";
import type { Task } from "./types";

const GROUPS: { bucket: DueDateBucket; label: string }[] = [
  { bucket: "overdue", label: "OVERDUE" },
  { bucket: "today", label: "TODAY" },
  { bucket: "upcoming", label: "UPCOMING" },
  { bucket: "no-date", label: "NO DUE DATE" },
];

export function MyTasksScreen({ onOpenTask }: { onOpenTask: (projectId: string, taskId: string) => void }) {
  const { showToast } = useToast();
  const { tasks, loading } = useMyTasks();
  const today = new Date().toISOString().slice(0, 10);

  const grouped = useMemo(() => {
    const map = new Map<DueDateBucket, Task[]>();
    GROUPS.forEach((g) => map.set(g.bucket, []));
    tasks
      .filter((t) => !t.completed)
      .forEach((t) => map.get(getDueDateBucket(t.dueDate, today))!.push(t));
    return map;
  }, [tasks, today]);

  async function handleToggleComplete(task: Task, completed: boolean) {
    try {
      await updateTask(task.projectId, task.id, { completed, status: completed ? "complete" : "todo" });
    } catch (err) {
      console.warn("[tasks] my-tasks toggle complete failed", err);
      showToast("Couldn't update the task. Please try again.");
    }
  }

  async function handleTitleChange(task: Task, title: string) {
    try {
      await updateTask(task.projectId, task.id, { title });
    } catch (err) {
      console.warn("[tasks] my-tasks rename failed", err);
      showToast("Couldn't rename the task. Please try again.");
    }
  }

  async function handleDelete(task: Task) {
    try {
      await deleteTask(task.projectId, task.id);
    } catch (err) {
      console.warn("[tasks] my-tasks delete failed", err);
      showToast("Couldn't delete the task. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        {[0, 1, 2].map((i) => <div key={i} className="h-[46px] rounded-brand-sm bg-os-100 animate-pulse" />)}
      </div>
    );
  }

  const hasAny = tasks.some((t) => !t.completed);
  if (!hasAny) {
    return (
      <p className="my-5 font-light text-[13.5px] text-os-500 text-center border border-dashed border-os-300 p-5 rounded-brand-sm">
        No tasks assigned to you right now.
      </p>
    );
  }

  return (
    <div>
      {GROUPS.map(({ bucket, label }) => {
        const items = grouped.get(bucket) || [];
        if (!items.length) return null;
        return (
          <div key={bucket} className="mb-5">
            <div className="font-bold text-[11px] tracking-[.14em] uppercase text-os-ink border-b-2 border-os-ink pb-[6px] mb-1">{label}</div>
            {items.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projectId={task.projectId}
                isShared
                showProject
                onToggleComplete={(c) => handleToggleComplete(task, c)}
                onTitleChange={(t) => handleTitleChange(task, t)}
                onOpenDrawer={() => onOpenTask(task.projectId, task.id)}
                onDelete={() => handleDelete(task)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

**Note for the implementer:** `TaskRow` is passed `isShared` hardcoded to `true` here rather than looked up per-task. This is intentional: a task assigned to *you* is, by definition, either in a project you created (so it doesn't matter for the assignee picker) or in a project someone else shared (which is the only way you could have been assigned in the first place — private projects only ever assign to their own creator, per Task 11's `AssigneePicker` logic) — so treating every row here as if its project is shared, purely for the assignee-picker's option list, produces the same visible options a real per-task lookup would, without an extra Firestore read per row. Report this reasoning in your DONE report so the reviewer can verify it rather than re-deriving it.

- [ ] **Step 3: Wire into `TasksTab.tsx`**

Replace the `"my-tasks"` placeholder branch. `MyTasksScreen` needs to be able to open a task's drawer, which lives inside `ProjectDetailScreen` — the simplest correct behavior, consistent with the spec's "click a task and edit it from a drawer while keeping the project visible" intent, is to navigate to that task's Project Detail screen with the drawer already open. Add a `pendingDrawerTaskId` bit of state to `TasksTab`:

```tsx
import { useState } from "react";
import { ProjectsScreen } from "./ProjectsScreen";
import { ProjectDetailScreen } from "./ProjectDetailScreen";
import { MyTasksScreen } from "./MyTasksScreen";

export type TasksScreen = "my-tasks" | "projects" | "project-detail";

export function TasksTab() {
  const [screen, setScreen] = useState<TasksScreen>("my-tasks");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [pendingDrawerTaskId, setPendingDrawerTaskId] = useState<string | null>(null);

  function openProject(id: string) {
    setActiveProjectId(id);
    setScreen("project-detail");
  }

  function openTaskFromMyTasks(projectId: string, taskId: string) {
    setPendingDrawerTaskId(taskId);
    openProject(projectId);
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setScreen("my-tasks")}
          className={`px-4 py-[7px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
            screen === "my-tasks" ? "bg-os-orange text-white border-os-orange" : "bg-white text-os-700 border-os-300"
          }`}
        >
          MY TASKS
        </button>
        <button
          onClick={() => setScreen("projects")}
          className={`px-4 py-[7px] rounded-full font-bold text-[11px] tracking-[.06em] border ${
            screen === "projects" || screen === "project-detail" ? "bg-os-orange text-white border-os-orange" : "bg-white text-os-700 border-os-300"
          }`}
        >
          PROJECTS
        </button>
      </div>
      {screen === "my-tasks" && <MyTasksScreen onOpenTask={openTaskFromMyTasks} />}
      {screen === "projects" && <ProjectsScreen onOpenProject={openProject} />}
      {screen === "project-detail" && activeProjectId && (
        <ProjectDetailScreen
          projectId={activeProjectId}
          onBack={() => setScreen("projects")}
          initialDrawerTaskId={pendingDrawerTaskId}
          onDrawerTaskConsumed={() => setPendingDrawerTaskId(null)}
        />
      )}
    </div>
  );
}
```

In `ProjectDetailScreen.tsx`, accept the two new optional props and seed `drawerTaskId` from them:

```tsx
export function ProjectDetailScreen({
  projectId,
  onBack,
  initialDrawerTaskId = null,
  onDrawerTaskConsumed,
}: {
  projectId: string;
  onBack: () => void;
  initialDrawerTaskId?: string | null;
  onDrawerTaskConsumed?: () => void;
}) {
```

Change the `drawerTaskId` state initializer:

```tsx
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(initialDrawerTaskId);
```

Add an effect right after it to consume the pending id exactly once (so navigating Projects → this project again later doesn't reopen a stale drawer):

```tsx
  useEffect(() => {
    if (initialDrawerTaskId) onDrawerTaskConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Add `useEffect` to the existing `useState` import line at the top of the file (`import { useEffect, useState } from "react";`).

- [ ] **Step 4: Commit**

```bash
git add src/features/tasks/useMyTasks.ts src/features/tasks/MyTasksScreen.tsx src/features/tasks/TasksTab.tsx src/features/tasks/ProjectDetailScreen.tsx
git commit -m "Add My Tasks screen grouped by Overdue/Today/Upcoming/No Due Date"
```

---

### Task 17: Responsive behavior and empty/loading polish

**Files:**
- Modify: `src/features/tasks/TaskRow.tsx`
- Modify: `src/shared/components/Drawer.tsx`

**Interfaces:**
- Consumes: nothing new — this is a targeted polish pass over Tasks 9–16's output.

Most empty/loading states were already built inline per-screen in earlier tasks (Projects, Project Detail, My Tasks all already render skeleton rows and plain-text empty states — re-verify this is true rather than re-building it). This task's actual remaining work is the one responsive requirement not yet addressed: hiding secondary columns on small screens.

- [ ] **Step 1: Hide the project/assignee column on small screens in `TaskRow.tsx`**

The row already conditionally shows a `showProject` line beneath the title (used by My Tasks) — that part is already responsive-safe since it's not a separate horizontal column. The one column that should hide under the app's existing `max-md:` breakpoint is the assignee `AssigneePicker` cell (per the design spec: "keep task title, checkbox, and due date visible" on small screens). Change:

```tsx
      <div className="flex-none w-[100px]">
        <AssigneePicker projectId={projectId} task={task} isShared={isShared} />
      </div>
```

to:

```tsx
      <div className="flex-none w-[100px] max-md:hidden">
        <AssigneePicker projectId={projectId} task={task} isShared={isShared} />
      </div>
```

- [ ] **Step 2: Confirm the Drawer is already full-screen on small viewports**

`Drawer.tsx`'s panel classes already include `max-w-[440px] max-md:max-w-full` (written this way in Task 5) — verify this is present; no change needed if so. If Task 5 was implemented differently, add `max-md:max-w-full` to the drawer panel's className now.

- [ ] **Step 3: Commit**

```bash
git add src/features/tasks/TaskRow.tsx src/shared/components/Drawer.tsx
git commit -m "Responsive polish: hide assignee column on small screens, confirm full-screen drawer"
```

---

### Task 18: Firestore project setup and full live verification (operational)

This task is not code — it is the live, human-supervised setup step, following the same pattern as the original Google Sign-In Firebase project setup.

- [ ] **Step 1: Enable Firestore** in the Firebase Console for the existing `maestro-c6d96` project (Native mode, not Datastore mode). Choose a region consistent with the project's existing setup (or `nam5`/`us-central` if no prior constraint exists).

- [ ] **Step 2: Deploy `firestore.rules`** (written in Task 3) via the Firebase Console's Rules editor (paste and Publish) — no Firebase CLI is available in this environment, so this is a manual copy-paste-publish action, not a `firebase deploy` command.

- [ ] **Step 3: Deploy the branch to Vercel Preview** and sign in with an `@ossastudio.com` account, then walk through every acceptance criterion from the design brief in order:
  1. Create a project.
  2. Keep it private or toggle Share with Team.
  3. Open the project.
  4. Add tasks quickly (inline, Enter to save).
  5. Add subtasks.
  6. Assign tasks (self in a private project; any roster member in a shared one).
  7. Set due dates.
  8. Complete a task via its checkbox.
  9. Filter by Owner.
  10. Filter by Due Date.
  11. Filter by Status.
  12. Drag tasks up/down in List view.
  13. Refresh the page — order persists.
  14. Switch to Board view.
  15. Drag a task from To Do to In Progress.
  16. Drag it to Complete — confirm it auto-completes.
  17. Reorder cards inside a Board column.
  18. Click a task, edit it from the right-side drawer.
  19. Confirm assigned tasks appear in My Tasks, grouped correctly.
  20. Confirm the whole module feels dense — no oversized cards, no excessive scrolling.

- [ ] **Step 4: If the `or()` query in `useTaskProjectsList` (Task 4) throws a missing-index error** in the browser console, follow the link in that error to create the composite index in the Firebase Console, then retest Projects screen loading.

- [ ] **Step 5: If the `collectionGroup` query in `useMyTasks` (Task 16) throws a missing-index error**, create a collection-group-scoped index on `tasks.assigneeId` in the Firebase Console (Firestore → Indexes → Composite → Collection group scope), then retest My Tasks.

- [ ] **Step 6: Test with a second `@ossastudio.com` account** (or ask a teammate) to confirm: a shared project is visible to them, they can be assigned tasks, and a private project is correctly invisible to them.

- [ ] **Step 7: Once every criterion passes**, use `superpowers:finishing-a-development-branch` to land the branch, exactly as done for the Google Sign-In and Pipeline Unification work before it.
