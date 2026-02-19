import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  isHydrated: boolean; // True after client-side hydration is complete
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  token: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // IMPORTANT: Initialize to false to match server render and avoid hydration mismatch
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string>("");
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from sessionStorage AFTER hydration (client-side only)
  useEffect(() => {
    const storedAuth = sessionStorage.getItem("admin_authenticated");
    const storedPassword = sessionStorage.getItem("admin_password");
    if (storedAuth === "true" && storedPassword) {
      setIsAuthenticated(true);
      setToken(storedPassword);
    }
    setIsHydrated(true);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      console.log("[AuthContext] Attempting login...");
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
      });

      console.log(
        "[AuthContext] Response status:",
        response.status,
        "ok:",
        response.ok,
      );
      const data = await response.json();
      console.log("[AuthContext] Response data:", data);

      if (response.ok && data.valid) {
        // Set sessionStorage first
        sessionStorage.setItem("admin_password", password);
        sessionStorage.setItem("admin_authenticated", "true");
        // Update React state synchronously
        setToken(password);
        setIsAuthenticated(true);
        console.log("[AuthContext] Login successful, auth state updated");
        // Small delay to ensure state propagates before any redirects/queries
        await new Promise(resolve => setTimeout(resolve, 50));
        return true;
      }
      console.log(
        "[AuthContext] Login failed - response not ok or data.valid is false",
      );
      return false;
    } catch (error) {
      console.error("[AuthContext] Login error:", error);
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem("admin_password");
    sessionStorage.removeItem("admin_authenticated");
    setToken("");
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isHydrated, login, logout, token }}
    >
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

export function getAdminPassword(): string {
  return sessionStorage.getItem("admin_password") || "";
}
