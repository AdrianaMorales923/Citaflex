import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth-context";
import supabase from "./supabase";

export type Role = "admin" | "staff" | "client";

export type RolePermission =
  | "dashboard"
  | "appointments"
  | "appointments.manage"
  | "appointments.status"
  | "clients"
  | "clients.manage"
  | "services"
  | "services.manage"
  | "statistics"
  | "reports"
  | "staff.manage"
  | "settings"
  | "profile"
  | "my-appointments"
  | "history"
  | "book";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  staff: "Personal",
  client: "Cliente",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: "Acceso total al negocio y su equipo.",
  staff: "Gestiona tus citas y clientes asignados.",
  client: "Reserva y consulta tus citas.",
};

const PERMISSIONS: Record<Role, RolePermission[]> = {
  admin: [
    "dashboard",
    "appointments",
    "appointments.manage",
    "appointments.status",
    "clients",
    "clients.manage",
    "services",
    "services.manage",
    "statistics",
    "reports",
    "staff.manage",
    "settings",
    "profile",
  ],
  staff: [
    "dashboard",
    "appointments",
    "appointments.manage",
    "appointments.status",
    "clients",
    "profile",
  ],
  client: ["profile", "my-appointments", "history", "book"],
};

export interface UserProfile {
  name: string;
  initials: string;
  email: string;
  phone: string;
  org: string;
  title: string;
  location: string;
  since: string;
  bio: string;
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type RoleContextValue = {
  role: Role;
  setRole: (r: Role) => void;
  can: (p: RolePermission) => boolean;
  profile: UserProfile;
  profileLoading: boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

const STORAGE_KEY = "citaflex.role";

const EMPTY_PROFILE: UserProfile = {
  name: "Usuario",
  initials: "U",
  email: "",
  phone: "",
  org: "",
  title: "",
  location: "Barranquilla, Colombia",
  since: "",
  bio: "",
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [role, setRoleState] = useState<Role>("admin");
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);

  // Restore saved role from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Role | null;
      if (stored && stored in PERMISSIONS) setRoleState(stored);
    } catch { /* noop */ }
  }, []);

  // Fetch real profile from Supabase when user is available
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    async function fetchProfile() {
      setProfileLoading(true);

      // Get role from users table
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user!.id)
        .single();

      if (userData?.role) {
        setRoleState(userData.role as Role);
        try { window.localStorage.setItem(STORAGE_KEY, userData.role); } catch { /* noop */ }
      }

      // Get profile info
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, phone, org, title")
        .eq("user_id", user!.id)
        .single();

      if (profileData) {
        setProfile({
          name: profileData.name || "Usuario",
          initials: initialsFromName(profileData.name || "Usuario"),
          email: user!.email || "",
          phone: profileData.phone || "",
          org: profileData.org || "",
          title: profileData.title || "",
          location: "Barranquilla, Colombia",
          since: "",
          bio: "",
        });
      } else {
        const fallbackName = (user!.email?.split("@")[0] || "Usuario")
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setProfile({
          name: fallbackName,
          initials: initialsFromName(fallbackName),
          email: user!.email || "",
          phone: "",
          org: "",
          title: "",
          location: "Barranquilla, Colombia",
          since: "",
          bio: "",
        });
      }

      setProfileLoading(false);
    }

    fetchProfile();
  }, [user]);

  const setRole = (r: Role) => {
    setRoleState(r);
    try { window.localStorage.setItem(STORAGE_KEY, r); } catch { /* noop */ }
  };

  const value = useMemo<RoleContextValue>(() => ({
    role,
    setRole,
    can: (p) => PERMISSIONS[role].includes(p),
    profile,
    profileLoading,
  }), [role, profile, profileLoading]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
