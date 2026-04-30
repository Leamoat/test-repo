import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken } from "./api";

export type User = {
  id: string;
  email: string;
  full_name: string;
  user_type: "sender" | "traveler" | "pro";
  phone?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  rating: number;
  review_count: number;
};

type Ctx = {
  user: User | null | undefined; // undefined = loading
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({} as Ctx);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const tok = await getToken();
      if (!tok) { setUser(null); return; }
      try {
        const r = await api.get("/auth/me");
        setUser(r.data);
      } catch {
        await setToken(null);
        setUser(null);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const r = await api.post("/auth/login", { email, password });
    await setToken(r.data.token);
    setUser(r.data.user);
  };
  const signUp = async (data: any) => {
    const r = await api.post("/auth/register", data);
    await setToken(r.data.token);
    setUser(r.data.user);
  };
  const signOut = async () => {
    await setToken(null);
    setUser(null);
  };
  const refresh = async () => {
    const r = await api.get("/auth/me");
    setUser(r.data);
  };

  return <AuthCtx.Provider value={{ user, signIn, signUp, signOut, refresh }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
