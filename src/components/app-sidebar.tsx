import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarCheck2,
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  BarChart3,
  FileBarChart2,
  Settings,
  LogOut,
  X,
  UserCog,
  UserCircle,
  History,
  CalendarDays,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, ROLE_LABEL, type Role, type RolePermission } from "@/lib/role-context";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  perm: RolePermission;
  external?: boolean;
};

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true, perm: "dashboard" },
    { to: "/app/appointments", label: "Citas", icon: Calendar, perm: "appointments" },
    { to: "/app/clients", label: "Clientes", icon: Users, perm: "clients" },
    { to: "/app/services", label: "Servicios", icon: Scissors, perm: "services" },
    { to: "/app/statistics", label: "Estadísticas (DEMO)", icon: BarChart3, perm: "statistics" },
    { to: "/app/reports", label: "Reportes (DEMO)", icon: FileBarChart2, perm: "reports" },
    { to: "/app/staff", label: "Personal", icon: UserCog, perm: "staff.manage" },
    { to: "/app/profile", label: "Mi perfil", icon: UserCircle, perm: "profile" },
    { to: "/app/settings", label: "Configuración (DEMO)", icon: Settings, perm: "settings" },
  ],
  staff: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true, perm: "dashboard" },
    { to: "/app/appointments", label: "Mis citas", icon: Calendar, perm: "appointments" },
    { to: "/app/clients", label: "Clientes", icon: Users, perm: "clients" },
    { to: "/app/profile", label: "Mi perfil", icon: UserCircle, perm: "profile" },
  ],
  client: [
    { to: "/app/my-appointments", label: "Mis citas (DEMO)", icon: CalendarDays, perm: "my-appointments" },
    { to: "/app/history", label: "Historial (DEMO)", icon: History, perm: "history" },
    { to: "/app/profile", label: "Mi perfil", icon: UserCircle, perm: "profile" },
    { to: "/book", label: "Reservar cita", icon: Globe, perm: "book", external: true },
  ],
};

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const { role, profile } = useRole();
  const nav = NAV_BY_ROLE[role];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to={role === "client" ? "/app/my-appointments" : "/app"} className="flex items-center gap-2" onClick={onClose}>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <CalendarCheck2 className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold">Citaflex</span>
          </Link>
          <button className="rounded-md p-1.5 hover:bg-sidebar-accent lg:hidden" onClick={onClose} aria-label="Cerrar menú">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Menú · {ROLE_LABEL[role]}
          </p>
          {nav.map(item => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const className = cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-gradient-primary text-sidebar-primary-foreground shadow-elegant"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5 active:translate-x-0"
            );
            const inner = (
              <>
                <item.icon className={cn("h-4 w-4 transition-transform", active ? "" : "group-hover:scale-110")} />
                {item.label}
              </>
            );
            return item.external ? (
              <a key={item.to} href={item.to} onClick={onClose} className={className}>
                {inner}
              </a>
            ) : (
              <Link key={item.to} to={item.to} onClick={onClose} className={className}>
                {inner}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-chart-5 text-sm font-semibold text-primary-foreground">
              {profile.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">{profile.name}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{profile.title}</p>
            </div>
            <Link to="/" className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Salir">
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
