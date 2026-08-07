import { useAuth } from "../../shared/state/auth";

export function useAccount() {
  const { user } = useAuth();
  return {
    displayName: user?.displayName || "",
    email: user?.email || "",
    photoURL: user?.photoURL || null,
  };
}
