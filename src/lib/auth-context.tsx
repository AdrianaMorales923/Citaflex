import { createContext, useContext, useState, type ReactNode } from "react";
import supabase from "./supabase";
import { notifyRoles } from "./use-notifications";

export type AppRole = "admin" | "staff" | "client";

export interface AppUser {
  id: string;
  email: string;
  role: AppRole;
  business_name: string | null;
  created_at: string | null;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (opts: {
    email: string;
    password: string;
    role: AppRole;
    name: string;
    business?: string;
  }) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const SESSION_KEY = "citaflex.session";
const ROLE_KEY = "citaflex.role";

// Sesion simple en localStorage: sin Supabase Auth, el login es una consulta
// directa a public.users (email + password). Ideal para demo y para QA.
function readSession(): AppUser | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    if (parsed && typeof parsed.id === "string" && typeof parsed.email === "string") {
      return parsed;
    }
  } catch {
    /* noop */
  }
  return null;
}

function writeSession(user: AppUser | null) {
  try {
    if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => readSession());
  const [loading] = useState(false);

  async function signIn(email: string, password: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role, business_name, created_at")
      .eq("email", email.trim().toLowerCase())
      .eq("password_hash", password)
      .maybeSingle();

    if (error) return error.message;
    if (!data) return "Correo o contraseña incorrectos";

    const appUser = data as AppUser;
    writeSession(appUser);
    setUser(appUser);
    try {
      window.localStorage.setItem(ROLE_KEY, appUser.role);
    } catch {
      /* noop */
    }
    return null;
  }

  async function signUp(opts: {
    email: string;
    password: string;
    role: AppRole;
    name: string;
    business?: string;
  }): Promise<string | null> {
    const normalizedEmail = opts.email.trim().toLowerCase();

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (existing) return "Este correo ya está registrado";

    const { data: created, error } = await supabase
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        email: normalizedEmail,
        password_hash: opts.password,
        role: opts.role,
        business_name: opts.role === "admin" ? (opts.business ?? null) : null,
      })
      .select("id, email, role, business_name, created_at")
      .single();
    if (error) return error.message;

    await supabase.from("profiles").insert({ user_id: created.id, name: opts.name });

    const roleLabel: Record<AppRole, string> = {
      admin: "administrador",
      staff: "personal",
      client: "cliente",
    };
    await notifyRoles(
      {
        title: "Nueva cuenta creada",
        description: `${opts.name.trim()} (${normalizedEmail}) se registró como ${roleLabel[opts.role]}.`,
        tone: "success",
        icon: "UserPlus",
      },
      ["admin"],
    );

    const appUser = created as AppUser;
    writeSession(appUser);
    setUser(appUser);
    try {
      window.localStorage.setItem(ROLE_KEY, opts.role);
    } catch {
      /* noop */
    }
    return null;
  }

  async function signOut() {
    writeSession(null);
    setUser(null);
    try {
      window.localStorage.removeItem(ROLE_KEY);
    } catch {
      /* noop */
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
