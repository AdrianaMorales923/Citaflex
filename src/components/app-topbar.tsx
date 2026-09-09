import { Menu, Search, Bell, Plus, Check, LogOut, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useNotifications, type Notification } from "@/lib/use-notifications";
import { useRole } from "@/lib/role-context";

const toneStyles: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/20 text-warning-foreground",
};

export function AppTopbar({ onMenuClick, title }: { onMenuClick: () => void; title: string }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { role } = useRole();
  const { notifs, unread, markAllRead, markRead, clearAll, remove } = useNotifications();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const goSearch = () => {
    navigate({ to: "/app/clients", search: { q: query.trim() || undefined } });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleNewAppointment = async () => {
    if (creating) return;
    setCreating(true);
    try {
      if (role === "client") {
        await navigate({ to: "/book" });
        toast.success("Abriendo formulario de reserva");
        return;
      }
      await navigate({ to: "/app/appointments", search: { new: 1, cita: undefined } });
      toast.success("Abriendo formulario de nueva cita");
    } finally {
      setTimeout(() => setCreating(false), 400);
    }
  };

  const handleClearAll = async () => {
    await clearAll();
    toast.success("Notificaciones eliminadas");
  };

  // Click en una notificacion: marca leida y navega a la cita asociada si existe.
  const handleOpen = (n: Notification) => {
    markRead(n.id);
    if (!n.appointmentId) return;
    navigate({
      to: role === "client" ? "/app/my-appointments" : "/app/appointments",
      search: { cita: n.appointmentId },
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur sm:h-16 sm:gap-3 sm:px-6">
      <button
        onClick={onMenuClick}
        className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-accent active:bg-accent/80 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="truncate font-display text-base font-semibold sm:text-xl">{title}</h1>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="hidden items-center rounded-lg border border-input bg-card px-3 transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goSearch();
            }}
            placeholder="Buscar clientes..."
            className="w-48 bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground/60 lg:w-56"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
        <button
          onClick={() => navigate({ to: "/app/clients", search: { q: undefined } })}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-all hover:bg-accent hover:shadow-sm active:scale-95 md:hidden"
          aria-label="Buscar clientes"
        >
          <Search className="h-4 w-4" />
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-all hover:bg-accent hover:shadow-sm active:scale-95"
              aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm">
                  {unread}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-[22rem] p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Notificaciones</p>
                <p className="text-xs text-muted-foreground">
                  {unread > 0 ? `${unread} sin leer` : "Estás al día"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={markAllRead}
                  disabled={unread === 0}
                  className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
                >
                  Marcar todas
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={notifs.length === 0}
                  className="rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
                  title="Limpiar notificaciones"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {notifs.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay notificaciones.
                </li>
              )}
              {notifs.map((n) => {
                const Icon = n.icon;
                return (
                  <li
                    key={n.id}
                    className="group flex items-stretch border-b border-border last:border-b-0"
                  >
                    <button
                      onClick={() => handleOpen(n)}
                      className={cn(
                        "flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60",
                        !n.read && "bg-primary/[0.03]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                          toneStyles[n.tone] ?? toneStyles.primary,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{n.title}</p>
                          {!n.read && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {n.description}
                        </p>
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {n.time}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={async () => {
                        await remove(n.id);
                        toast.success("Notificación eliminada");
                      }}
                      aria-label={`Eliminar notificación: ${n.title}`}
                      title="Eliminar"
                      className="flex shrink-0 items-center border-l border-border px-2.5 text-muted-foreground opacity-70 transition-colors hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border px-4 py-2">
              <button
                onClick={() => navigate({ to: "/app/notifications" })}
                className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Check className="h-3 w-3" /> Ver todas
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <button
          onClick={handleNewAppointment}
          disabled={creating}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gradient-primary px-3 text-sm font-semibold text-primary-foreground shadow-elegant transition-all hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:opacity-70"
        >
          <Plus className={cn("h-4 w-4 transition-transform", creating && "animate-spin")} />
          <span className="hidden sm:inline">{creating ? "Abriendo..." : "Nueva cita"}</span>
        </button>

        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-all hover:bg-destructive/10 hover:text-destructive hover:shadow-sm active:scale-95"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
