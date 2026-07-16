import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { Calendar, Clock, MapPin, User, Scissors, Plus, XCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/my-appointments")({ component: MyAppointments });

type Status = "confirmada" | "pendiente" | "cancelada";
type Appt = {
  id: string;
  date: string;
  time: string;
  service: string;
  staff: string;
  location: string;
  price: string;
  status: Status;
};

const INITIAL: Appt[] = [
  { id: "a1", date: "Sáb 12 Jul", time: "10:00", service: "Corte + Tinte", staff: "Laura Márquez", location: "Salón Bella · Norte", price: "$180.000", status: "confirmada" },
  { id: "a2", date: "Mié 23 Jul", time: "15:30", service: "Manicure spa", staff: "Sofía Herrera", location: "Salón Bella · Norte", price: "$65.000", status: "pendiente" },
  { id: "a3", date: "Vie 08 Ago", time: "11:00", service: "Limpieza facial", staff: "Laura Márquez", location: "Salón Bella · Norte", price: "$120.000", status: "confirmada" },
];

const TONE: Record<Status, string> = {
  confirmada: "bg-success/10 text-success border-success/20",
  pendiente: "bg-warning/20 text-warning-foreground border-warning/30",
  cancelada: "bg-destructive/10 text-destructive border-destructive/20",
};

function MyAppointments() {
  const [appts, setAppts] = useState<Appt[]>(INITIAL);

  const cancel = (id: string) => {
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status: "cancelada" } : a));
    toast.success("Cita cancelada");
  };

  const active = appts.filter(a => a.status !== "cancelada");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Mis próximas citas (DEMO)</h2>
          <p className="text-sm text-muted-foreground">Consulta, reprograma o cancela tus reservas.</p>
        </div>
        <Button asChild className="gap-2 self-start sm:self-auto">
          <a href="/book"><Plus className="h-4 w-4" /> Reservar nueva cita</a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Próximas" value={String(active.length)} tone="bg-primary/10 text-primary" />
        <Kpi label="Confirmadas" value={String(active.filter(a => a.status === "confirmada").length)} tone="bg-success/10 text-success" />
        <Kpi label="Historial total" value="14" tone="bg-chart-5/10 text-chart-5" />
      </div>

      <div className="space-y-3">
        {appts.map(a => (
          <div key={a.id} className={cn("card-surface p-5", a.status === "cancelada" && "opacity-60")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-chart-5/15 text-primary">
                <Calendar className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{a.service}</h3>
                  <Badge variant="outline" className={TONE[a.status]}>{a.status}</Badge>
                </div>
                <div className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {a.date} · {a.time}</span>
                  <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {a.staff}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {a.location}</span>
                  <span className="inline-flex items-center gap-1.5"><Scissors className="h-3.5 w-3.5" /> {a.price}</span>
                </div>
              </div>
              {a.status !== "cancelada" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast.info("Función de reprogramar (demo)")}>Reprogramar</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <XCircle className="h-3.5 w-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Cancelar</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se cancelará tu reserva del {a.date} a las {a.time}. Puedes agendar nuevamente cuando quieras.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Volver</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancel(a.id)}>Sí, cancelar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              {a.status === "cancelada" && (
                <span className="text-xs font-medium uppercase tracking-wider text-destructive">Cancelada</span>
              )}
            </div>
          </div>
        ))}
      </div>

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
      <div className={`grid h-11 w-11 place-items-center rounded-lg ${tone}`}><Check className="h-5 w-5" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
