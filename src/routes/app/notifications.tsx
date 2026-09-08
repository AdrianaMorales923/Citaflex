import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/use-notifications";

export const Route = createFileRoute("/app/notifications")({ component: Notifications });

const toneStyles: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/20 text-warning-foreground",
};

function Notifications() {
  const { notifs, unread, markAllRead, markRead, clearAll, loading } = useNotifications();

  const handleClearAll = async () => {
    await clearAll();
    toast.success("Notificaciones eliminadas");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Notificaciones</h2>
          <p className="text-sm text-muted-foreground">Historial de avisos de tu negocio.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              markAllRead();
              toast.success("Todo marcado como leído");
            }}
            disabled={unread === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" /> Marcar todas
          </button>
          <button
            onClick={handleClearAll}
            disabled={notifs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Limpiar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Cargando notificaciones...
          </p>
        ) : notifs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No hay notificaciones.</p>
            <p className="text-xs">Los avisos de citas, reservas y clientes aparecerán aquí.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifs.map((n) => {
              const Icon = n.icon;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/60 sm:px-5",
                      !n.read && "bg-primary/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        toneStyles[n.tone] ?? toneStyles.primary,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{n.title}</span>
                        {!n.read && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </span>
                      <span className="line-clamp-2 block text-xs text-muted-foreground">
                        {n.description}
                      </span>
                      <span className="mt-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {n.time}
                      </span>
                    </span>
                    {!n.read && (
                      <span className="mt-0.5 hidden shrink-0 items-center gap-1 text-[10px] font-medium text-primary sm:flex">
                        <Check className="h-3 w-3" /> Marcar leída
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
