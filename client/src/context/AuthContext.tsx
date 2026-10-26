import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, tokenStore } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

type AuthResponse = { token: string; user: User };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!tokenStore.get());

  // ตอนเปิดเว็บ: ถ้ามี token เก็บไว้ ให้ถามเซิร์ฟเวอร์ว่ายังใช้ได้ไหม
  useEffect(() => {
  if (!tokenStore.get()) return;
  api<{ user: User }>("/auth/me")
    .then((r) => setUser(r.user))
    .catch((e) => {
      if (e instanceof ApiError && e.status === 401) tokenStore.clear();
    })
    .finally(() => setLoading(false));
}, []);

  async function login(email: string, password: string) {
    const r = await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
    tokenStore.set(r.token);
    setUser(r.user);
  }

  async function register(email: string, password: string) {
    const r = await api<AuthResponse>("/auth/register", { method: "POST", body: { email, password } });
    tokenStore.set(r.token);
    setUser(r.user);
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องใช้ภายใน AuthProvider");
  return ctx;
}