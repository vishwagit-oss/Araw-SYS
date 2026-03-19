"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface ShipUser {
  id: string;
  name: string;
  login_id: string;
  role: "ship" | "admin";
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: ShipUser | null;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchMe(): Promise<ShipUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.ship ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<ShipUser | null>(null);

  const refresh = async () => {
    const ship = await fetchMe();
    setIsAuthenticated(!!ship);
    setUser(ship);
  };

  useEffect(() => {
    fetchMe()
      .then((ship) => {
        setIsAuthenticated(!!ship);
        setUser(ship);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
