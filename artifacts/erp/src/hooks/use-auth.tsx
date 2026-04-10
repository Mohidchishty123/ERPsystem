import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, login as apiLogin, logout as apiLogout, setAuthTokenGetter } from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isEmployee: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("erp_token"));
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    setAuthTokenGetter(() => token);
    if (token) {
      localStorage.setItem("erp_token", token);
    } else {
      localStorage.removeItem("erp_token");
    }
  }, [token]);

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false
    }
  });

  useEffect(() => {
    if (isError) {
      setToken(null);
      queryClient.clear();
      setLocation("/login");
    }
  }, [isError, setLocation, queryClient]);

  const login = (newToken: string) => {
    setToken(newToken);
    setAuthTokenGetter(() => newToken);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {}
    setToken(null);
    setAuthTokenGetter(() => null);
    queryClient.clear();
    setLocation("/login");
  };

  const isSuperAdmin = () => user?.role === "super_admin";
  const isAdmin = () => user?.role === "admin" || user?.role === "super_admin";
  const isEmployee = () => user?.role === "employee";

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        isSuperAdmin,
        isAdmin,
        isEmployee
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
