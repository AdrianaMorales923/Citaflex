import { createFileRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { RoleProvider, useRole, type RolePermission } from "@/lib/role-context";
import { useAuth } from "@/lib/auth-context";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppLayoutWrapper,
});

const titles: Record<string, string> = {
  "/app": "Dashboard",
  "/app/appointments": "Citas",
  "/app/clients": "Clientes",
  "/app/services": "Servicios",
  "/app/statistics": "Estadísticas",
  "/app/reports": "Reportes",
  "/app/staff": "Personal",
  "/app/settings": "Configuración",
  "/app/profile": "Mi perfil",
  "/app/my-appointments": "Mis citas",
  "/app/history": "Historial",
};

const ROUTE_PERMISSIONS: { prefix: string; perm: RolePermission; exact?: boolean }[] = [
  { prefix: "/app", perm: "dashboard", exact: true },
  { prefix: "/app/appointments", perm: "appointments" },
  { prefix: "/app/clients", perm: "clients" },
  { prefix: "/app/services", perm: "services" },
  { prefix: "/app/statistics", perm: "statistics" },
  { prefix: "/app/reports", perm: "reports" },
  { prefix: "/app/staff", perm: "staff.manage" },
  { prefix: "/app/settings", perm: "settings" },
  { prefix: "/app/profile", perm: "profile" },
  { prefix: "/app/my-appointments", perm: "my-appointments" },
  { prefix: "/app/history", perm: "history" },
];

function AppLayoutWrapper() {
  return (
    <RoleProvider>
      <AppLayout />
    </RoleProvider>
  );
}

function AppLayout() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { can, role } = useRole();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, loading, navigate]);

  const routeMatch = ROUTE_PERMISSIONS.find((r) =>
    r.exact ? path === r.prefix : path.startsWith(r.prefix),
  );
  const allowed = routeMatch ? can(routeMatch.perm) : true;

  // Auto-redirect clients away from admin dashboard to their home
  useEffect(() => {
    if (role === "client" && path === "/app") {
      navigate({ to: "/app/my-appointments", replace: true });
    }
  }, [role, path, navigate]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const title = titles[path] ?? (path.startsWith("/app/clients/") ? "Cliente" : "Citaflex");

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenuClick={() => setOpen(true)} title={title} />
        <main className="flex-1 px-4 pt-4 pb-24 sm:px-6 sm:pt-6 sm:pb-8 lg:px-8 lg:pt-8">
          {allowed ? <Outlet /> : <NoAccess />}
        </main>
      </div>
      <MobileNav />
      <Toaster position="top-right" richColors />
    </div>
  );
}

function NoAccess() {
  const { role } = useRole();
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-muted">
        <Lock className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="font-display text-xl font-bold">Acceso restringido</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta sección no está disponible para el rol <strong>{role}</strong>. Usa el selector de rol
        en la esquina superior derecha para cambiar la vista de demostración.
      </p>
    </div>
  );
}
