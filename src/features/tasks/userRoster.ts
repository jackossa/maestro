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
