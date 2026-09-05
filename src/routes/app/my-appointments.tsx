import { createFileRoute, Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, MapPin, User, Scissors, Plus, XCircle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import supabase from "@/lib/supabase";

export const Route = createFileRoute("/app/my-appointments")({ component: MyAppointments });

type Status = "Confirmada" | "Pendiente" | "Cancelada";

type Appt = {
  id: string;
  date: string;
  label: string;
  time: string;
  service: string;
  staff: string;
  location: string;
  price: string;
  status: Status;
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TONE: Record<Status, string> = {
  Confirmada: "bg-success/10 text-success border-success/20",
  Pendiente: "bg-warning/20 text-warning-foreground border-warning/30",
  Cancelada: "bg-destructive/10 text-destructive border-destructive/20",
};

function MyAppointments() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      if (!user) {
        setAppts([]);
        setHistoryCount(0);
        return;
      }

      const { data: mine } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mine) {
        setAppts([]);
        setHistoryCount(0);
        return;
      }

      const [upcomingRes, pastRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, date, time, service_id, staff_id, status")
          .eq("client_id", mine.id)
          .gte("date", todayStr())
          .in("status", ["Pendiente", "Confirmada"])
          .order("date")
          .order("time"),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("client_id", mine.id)
          .in("status", ["Completada", "Cancelada"]),
      ]);

      const rows = upcomingRes.data ?? [];
      const serviceIds = [...new Set(rows.map((a) => a.service_id))];
      const staffIds = [...new Set(rows.map((a) => a.staff_id))];

      const [{ data: services }, { data: staff }] = await Promise.all([
        supabase.from("services").select("id, name, price").in("id", serviceIds),
        supabase.from("staff").select("id, name").in("id", staffIds),
      ]);

      const serviceMap = new Map((services ?? []).map((s) => [s.id, s]));
      const staffMap = new Map((staff ?? []).map((s) => [s.id, s.name]));

      setAppts(
        rows.map((a) => ({
          id: a.id,
          date: a.date,
          label: formatDateLabel(a.date),
          time: a.time.slice(0, 5),
          service: serviceMap.get(a.service_id)?.name ?? "Servicio",
          staff: staffMap.get(a.staff_id) ?? "Personal",
          location: "Salón Bella · Barranquilla",
          price: formatMoney(serviceMap.get(a.service_id)?.price ?? 0),
          status: a.status as Status,
        })),
      );
      setHistoryCount(pastRes.count ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "Cancelada" })
      .eq("id", id);
    if (error) {
      toast.error("Error al cancelar: " + error.message);
      return;
    }
    toast.success("Cita cancelada");
    load();
  };

  const active = appts.filter((a) => a.status !== "Cancelada");

  if (loading) {
    return (
      <div className="flex min-h-60 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Mis próximas citas</h2>
          <p className="text-sm text-muted-foreground">
            Consulta, reprograma o cancela tus reservas.
          </p>
        </div>
        <Button asChild className="gap-2 self-start sm:self-auto">
          <a href="/book">
            <Plus className="h-4 w-4" /> Reservar nueva cita
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Próximas" value={String(active.length)} tone="bg-primary/10 text-primary" />
        <Kpi
          label="Confirmadas"
          value={String(active.filter((a) => a.status === "Confirmada").length)}
          tone="bg-success/10 text-success"
        />
        <Kpi
          label="Visitas anteriores"
          value={String(historyCount)}
          tone="bg-chart-5/10 text-chart-5"
        />
      </div>

      {appts.length === 0 ? (
        <div className="card-surface rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No tienes próximas citas.</p>
          <Button asChild variant="link" className="mt-2">
            <a href="/book">Reservar una ahora</a>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {appts.map((a) => (
            <div
              key={a.id}
              className={cn("card-surface p-5", a.status === "Cancelada" && "opacity-60")}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-chart-5/15 text-primary">
                  <Calendar className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{a.service}</h3>
                    <Badge variant="outline" className={TONE[a.status]}>
                      {a.status}
                    </Badge>
                  </div>
                  <div className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> {a.label} · {a.time}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> {a.staff}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {a.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Scissors className="h-3.5 w-3.5" /> {a.price}
                    </span>
                  </div>
                </div>
                {a.status !== "Cancelada" && (
                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <XCircle className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">Cancelar</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se cancelará tu reserva del {a.label} a las {a.time}. Puedes agendar
                            nuevamente cuando quieras.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Volver</AlertDialogCancel>
                          <AlertDialogAction onClick={() => cancel(a.id)}>
                            Sí, cancelar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                {a.status === "Cancelada" && (
                  <span className="text-xs font-medium uppercase tracking-wider text-destructive">
                    Cancelada
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">¿Quieres ver todas tus visitas anteriores?</p>
        <Button asChild variant="link" className="mt-1">
          <Link to="/app/history">Ver historial completo</Link>
        </Button>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="card-surface flex items-center gap-3 p-4">
      <div className={`grid h-11 w-11 place-items-center rounded-lg ${tone}`}>
        <Check className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
