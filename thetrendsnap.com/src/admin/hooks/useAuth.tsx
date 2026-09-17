import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AUTH_EXPIRED_EVENT, authApi, session } from "@/admin/lib/api";
import type { Admin } from "@/admin/types";

interface AuthValue {
  admin: Admin | null;
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (permission: "canPublish" | "canDelete") => boolean;
}

const AuthContext = createContext<AuthValue>({
  admin: null,
  isAuthed: false,
  login: async () => {},
  logout: () => {},
  can: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(() => session.admin());
  const [authed, setAuthed] = useState<boolean>(() => Boolean(session.token()));

  // The api layer clears the session on a 401/403 and fires this event.
  useEffect(() => {
    const onExpired = () => {
      setAdmin(null);
      setAuthed(false);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    session.save(res.token, res.admin);
    setAdmin(res.admin);
    setAuthed(true);
  }, []);

  const logout = useCallback(() => {
    session.clear();
    setAdmin(null);
    setAuthed(false);
  }, []);

  const can = useCallback(
    (permission: "canPublish" | "canDelete") => {
      if (!admin) return false;
      if (admin.role === "superadmin") return true;
      return Boolean(admin.permissions?.[permission]);
    },
    [admin]
  );

  const value = useMemo(
    () => ({ admin, isAuthed: authed, login, logout, can }),
    [admin, authed, login, logout, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
