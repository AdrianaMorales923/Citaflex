import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  BarChart3,
  UserCircle,
  CalendarDays,
  History,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, type Role } from "@/lib/role-context";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; external?: boolean };

const ITEMS: Record<Role, Item[]> = {
  admin: [
    { to: "/app", label: "Inicio", icon: LayoutDashboard, exact: true },
    { to: "/app/appointments", label: "Citas", icon: Calendar },
    { to: "/app/clients", label: "Clientes", icon: Users },
    { to: "/app/services", label: "Servicios", icon: Scissors },
    { to: "/app/statistics", label: "Stats", icon: BarChart3 },
  ],
  staff: [
    { to: "/app", label: "Inicio", icon: LayoutDashboard, exact: true },
    { to: "/app/appointments", label: "Citas", icon: Calendar },
    { to: "/app/clients", label: "Clientes", icon: Users },
    { to: "/app/profile", label: "Perfil", icon: UserCircle },
  ],
  client: [
    { to: "/app/my-appointments", label: "Mis citas", icon: CalendarDays },
    { to: "/app/history", label: "Historial", icon: History },
    { to: "/book", label: "Reservar", icon: Globe, external: true },
    { to: "/app/profile", label: "Perfil", icon: UserCircle },
  ],
};

export function MobileNav() {
  const path = useRouterState({ select: s => s.location.pathname });
  const { role } = useRole();
  const items = ITEMS[role];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Navegación principal"
    >
      <ul className={cn("grid", `grid-cols-${items.length}`)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(item => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const cls = cn(
            "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          );
          const inner = (
            <>
              <item.icon className={cn("h-5 w-5", active && "scale-110")} />
              <span className="leading-none">{item.label}</span>
            </>
          );
          return (
            <li key={item.to}>
              {item.external ? (
                <a href={item.to} className={cls}>{inner}</a>
              ) : (
                <Link to={item.to} className={cls}>{inner}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
