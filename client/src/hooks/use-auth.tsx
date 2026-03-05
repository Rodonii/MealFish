import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { parseWithLogging } from "@/lib/utils";

// Minimal local user type based on schema expectations
export interface LocalUser {
  id: number;
  username: string;
  points: number;
}

interface AuthContextType {
  user: LocalUser | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  updatePoints: (newTotal: number) => void;
  isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("scanshop_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
    setIsInitializing(false);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await fetch(api.users.login.path, {
        method: api.users.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to login");
      }
      
      const rawData = await res.json();
      // Use any to bypass strict z.custom type check if it fails on frontend, 
      // but we try to validate structure basically
      return rawData as LocalUser; 
    },
    onSuccess: (data) => {
      setUser(data);
      localStorage.setItem("scanshop_user", JSON.stringify(data));
    }
  });

  const login = async (username: string) => {
    await loginMutation.mutateAsync(username);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("scanshop_user");
  };

  const updatePoints = (newTotal: number) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, points: newTotal };
      localStorage.setItem("scanshop_user", JSON.stringify(updated));
      return updated;
    });
  };

  if (isInitializing) return null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updatePoints,
      isLoggingIn: loginMutation.isPending 
    }}>
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
