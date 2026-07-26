import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { getCurrentUser } from "../../services/userService";
import { UserRole } from "../types";

type UsePlannerRoleResult = {
  role: UserRole | null;
  loading: boolean;
  error: string | null;
};

function normalizeRole(raw: unknown): UserRole | null {
  if (typeof raw !== "string") {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "editor") return "editor";
  if (normalized === "viewer") return "viewer";
  if (normalized === "user") return "viewer";
  return null;
}

export default function usePlannerRole(): UsePlannerRoleResult {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      setLoading(true);
      setError(null);

      try {
        const currentUser = getCurrentUser();
        if (!currentUser?.id) {
          if (isMounted) {
            setRole(null);
            setLoading(false);
          }
          return;
        }

        const userRef = doc(db, "users", currentUser.id);
        const userSnap = await getDoc(userRef);

        if (!isMounted) {
          return;
        }

        if (!userSnap.exists()) {
          setRole(null);
          setLoading(false);
          return;
        }

        const data = userSnap.data() as { role?: unknown };
        setRole(normalizeRole(data.role));
      } catch {
        if (isMounted) {
          setError("Could not load role from users collection.");
          setRole(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadRole();

    return () => {
      isMounted = false;
    };
  }, []);

  return { role, loading, error };
}
