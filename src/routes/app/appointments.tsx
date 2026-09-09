import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalIcon,
  Clock,
  User,
  Scissors,
  UserCog,
  X,
  Trash2,
  Pencil,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import supabase from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { createNotification } from "@/lib/use-notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/app/appointments")({
  component: Appointments,
  validateSearch: (search: Record<string, unknown>) => ({
    new: search.new === 1 || search.new === "1" ? 1 : undefined,
    cita: typeof search.cita === "string" ? search.cita : undefined,
  }),
});

// ---------- Types ----------
interface LookupItem {
  id: string;
  name: string;
  role?: string;
  duration?: number;
  price?: number;
}

type Status = "Confirmada" | "Pendiente" | "Cancelada" | "Completada";

interface Appt {
  id: string;
  date: string;
  time: string;
  clientId: string;
  serviceId: string;
  staffId: string;
  status: Status;
  notes?: string;
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);

const STATUS_STYLE: Record<Status, string> = {
  Confirmada: "bg-success/10 text-success border-success/20",
  Pendiente: "bg-warning/20 text-warning-foreground border-warning/30",
  Cancelada: "bg-destructive/10 text-destructive border-destructive/20",
  Completada: "bg-primary/10 text-primary border-primary/20",
};

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

// ---------- Main component ----------
function Appointments() {
  const isMobile = useIsMobile();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [view, setView] = useState<"week" | "day">("week");
  useEffect(() => {
    if (isMobile) setView("day");
  }, [isMobile]);
  const [cursor, setCursor] = useState<Date>(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Lookups
  const [clientsList, setClientsList] = useState<LookupItem[]>([]);
  const [servicesList, setServicesList] = useState<LookupItem[]>([]);
  const [staffList, setStaffList] = useState<LookupItem[]>([]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [editing, setEditing] = useState<Appt | null>(null);
  const [prefill, setPrefill] = useState<{ date?: string; time?: string }>({});

  useEffect(() => {
    if (search.new === 1) {
      setEditing(null);
      setPrefill({});
      setOpen(true);
      navigate({ search: { new: undefined, cita: undefined }, replace: true });
    }
  }, [search.new, navigate]);

  // Llegada desde una notificacion (?cita=<id>): abrir la cita referida.
  useEffect(() => {
    const id = search.cita;
    if (!id) return;
    const appt = appts.find((a) => a.id === id);
    if (!appt) return;
    setEditing(appt);
    setPrefill({});
    setOpen(true);
    navigate({ search: { cita: undefined, new: undefined }, replace: true });
  }, [search.cita, appts, navigate]);

  const [cancelTarget, setCancelTarget] = useState<Appt | null>(null);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);

    const [clientsRes, servicesRes, staffRes] = await Promise.all([
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("services").select("id, name, duration, price").order("name"),
      supabase.from("staff").select("id, name, role").order("name"),
    ]);

    setClientsList((clientsRes.data ?? []).map((c) => ({ id: c.id, name: c.name })));
    setServicesList(
      (servicesRes.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration,
        price: s.price,
      })),
    );
    setStaffList((staffRes.data ?? []).map((s) => ({ id: s.id, name: s.name, role: s.role })));

    const apptRows: Array<{
      id: string;
      date: string;
      time: string;
      client_id: string;
      service_id: string;
      staff_id: string;
      status: string;
      notes: string | null;
    }> = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, date, time, client_id, service_id, staff_id, status, notes")
        .order("date")
        .range(from, from + 999);
      if (error) break;
      apptRows.push(...(data ?? []));
      if ((data ?? []).length < 1000) break;
    }

    setAppts(
      apptRows.map((a) => ({
        id: a.id,
        date: a.date,
        time: a.time?.slice(0, 5) ?? a.time,
        clientId: a.client_id,
        serviceId: a.service_id,
        staffId: a.staff_id,
        status: a.status as Status,
        notes: a.notes ?? "",
      })),
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const visibleDays = view === "week" ? weekDays : [cursor];

  const headerLabel =
    view === "week"
      ? `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0, 3)} – ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()].slice(0, 3)} ${weekDays[6].getFullYear()}`
      : `${WEEKDAYS[(cursor.getDay() + 6) % 7]}, ${cursor.getDate()} ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  const shift = (dir: -1 | 1) => {
    const d = new Date(cursor);
    d.setDate(d.getDate() + (view === "week" ? 7 : 1) * dir);
    setCursor(d);
  };

  const openCreate = (date?: string, time?: string) => {
    setEditing(null);
    setPrefill({ date, time });
    setOpen(true);
  };
  const openEdit = (a: Appt) => {
    setEditing(a);
    setPrefill({});
    setOpen(true);
  };

  const upsert = async (a: Appt) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const dbPayload = {
        date: a.date,
        time: a.time,
        client_id: a.clientId,
        service_id: a.serviceId,
        staff_id: a.staffId,
        status: a.status,
        notes: a.notes || null,
      };

      if (editing) {
        const { error } = await supabase
          .from("appointments")
          .update(dbPayload)
          .eq("id", editing.id);
        if (error) {
          toast.error("Error: " + error.message);
          return;
        }
        toast.success("Cita actualizada");
      } else {
        const newId = crypto.randomUUID();
        const { error } = await supabase.from("appointments").insert({ ...dbPayload, id: newId });
        if (error) {
          toast.error("Error: " + error.message);
          return;
        }
        toast.success("Cita creada");

        // Create notification
        if (user) {
          const clientName = clientsList.find((c) => c.id === a.clientId)?.name ?? "Cliente";
          const serviceName = servicesList.find((s) => s.id === a.serviceId)?.name ?? "Servicio";
          createNotification(user.id, {
            title: "Nueva cita creada",
            description: `${clientName} · ${serviceName} el ${a.date} a las ${a.time}`,
            tone: "primary",
            icon: "Calendar",
            appointmentId: newId,
          });
        }
      }
      setOpen(false);
      fetchData();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const cancel = async (a: Appt) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "Cancelada" })
      .eq("id", a.id);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("Cita cancelada");
      setCancelTarget(null);
      fetchData();

      if (user) {
        const clientName = clientsList.find((c) => c.id === a.clientId)?.name ?? "Cliente";
        createNotification(user.id, {
          title: "Cita cancelada",
          description: `Cita de ${clientName} el ${a.date} a las ${a.time} fue cancelada.`,
          tone: "warning",
          icon: "AlertCircle",
          appointmentId: a.id,
        });
      }
    }
  };

  // KPIs
  const todayKey = fmt(new Date());
  const todays = appts.filter((a) => a.date === todayKey);
  const kpis = [
    { label: "Hoy", value: todays.length },
    { label: "Confirmadas", value: todays.filter((a) => a.status === "Confirmada").length },
    { label: "Pendientes", value: todays.filter((a) => a.status === "Pendiente").length },
    {
      label: "Esta semana",
      value: appts.filter((a) => weekDays.some((d) => fmt(d) === a.date)).length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Agenda</h2>
          <p className="text-sm text-muted-foreground">
            Visualiza, crea y gestiona tus citas en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            <CalIcon className="h-4 w-4" /> Hoy
          </Button>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" /> Nueva cita
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 px-2 text-sm font-semibold capitalize">{headerLabel}</div>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => setView("day")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === "day" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              Día
            </button>
            <button
              onClick={() => setView("week")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === "week" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              Semana
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <CalendarGrid
        days={visibleDays}
        appts={appts}
        clientsList={clientsList}
        servicesList={servicesList}
        onSlotClick={(date, time) => openCreate(date, time)}
        onApptClick={openEdit}
      />

      {/* List below for mobile-friendly quick access */}
      <UpcomingList
        appts={appts}
        clientsList={clientsList}
        servicesList={servicesList}
        staffList={staffList}
        onEdit={openEdit}
        onCancel={setCancelTarget}
      />

      <AppointmentDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        prefill={prefill}
        clientsList={clientsList}
        servicesList={servicesList}
        staffList={staffList}
        onSave={(a) => {
          upsert(a);
        }}
        saving={saving}
        onCancelAppt={(a) => {
          setOpen(false);
          setCancelTarget(a);
        }}
      />

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar cita</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas cancelar esta cita? El cliente será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelTarget && cancel(cancelTarget)}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Calendar grid ----------
function CalendarGrid({
  days,
  appts,
  clientsList,
  servicesList,
  onSlotClick,
  onApptClick,
}: {
  days: Date[];
  appts: Appt[];
  clientsList: LookupItem[];
  servicesList: LookupItem[];
  onSlotClick: (date: string, time: string) => void;
  onApptClick: (a: Appt) => void;
}) {
  const clientMap = useMemo(() => new Map(clientsList.map((c) => [c.id, c.name])), [clientsList]);
  const serviceMap = useMemo(
    () => new Map(servicesList.map((s) => [s.id, s.name])),
    [servicesList],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[640px]"
          style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(140px, 1fr))` }}
        >
          {/* Header row */}
          <div className="border-b border-r border-border bg-muted/30" />
          {days.map((d) => {
            const isToday = fmt(d) === fmt(new Date());
            return (
              <div
                key={fmt(d)}
                className={`border-b border-border px-3 py-3 text-center ${isToday ? "bg-primary/5" : "bg-muted/30"}`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {WEEKDAYS[(d.getDay() + 6) % 7]}
                </p>
                <p
                  className={`mt-0.5 font-display text-lg font-bold ${isToday ? "text-primary" : ""}`}
                >
                  {d.getDate()}
                </p>
              </div>
            );
          })}

          {/* Time rows */}
          {TIME_SLOTS.map((time) => (
            <div key={time} className="contents">
              <div className="border-b border-r border-border px-2 py-3 text-right text-[11px] font-medium text-muted-foreground">
                {time}
              </div>
              {days.map((d) => {
                const key = fmt(d);
                const cellAppts = appts.filter((a) => a.date === key && a.time === time);
                return (
                  <button
                    key={key + time}
                    onClick={() => cellAppts.length === 0 && onSlotClick(key, time)}
                    className="group relative min-h-14 cursor-pointer border-b border-border p-1 text-left transition hover:bg-accent/40"
                  >
                    {cellAppts.length === 0 && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    )}
                    <div className="space-y-1">
                      {cellAppts.map((a) => {
                        const clientName = clientMap.get(a.clientId) ?? "Cliente";
                        const serviceName = serviceMap.get(a.serviceId) ?? "Servicio";
                        return (
                          <div
                            key={a.id}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onApptClick(a);
                            }}
                            className={`rounded-md border px-2 py-1.5 text-[11px] font-medium leading-tight shadow-sm transition hover:scale-[1.02] ${STATUS_STYLE[a.status]}`}
                          >
                            <p className="truncate font-semibold">{clientName}</p>
                            <p className="truncate opacity-80">{serviceName}</p>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Upcoming list ----------
function UpcomingList({
  appts,
  clientsList,
  servicesList,
  staffList,
  onEdit,
  onCancel,
}: {
  appts: Appt[];
  clientsList: LookupItem[];
  servicesList: LookupItem[];
  staffList: LookupItem[];
  onEdit: (a: Appt) => void;
  onCancel: (a: Appt) => void;
}) {
  const [query, setQuery] = useState("");

  const clientMap = useMemo(() => new Map(clientsList.map((c) => [c.id, c.name])), [clientsList]);
  const serviceMap = useMemo(
    () => new Map(servicesList.map((s) => [s.id, s.name])),
    [servicesList],
  );
  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s.name])), [staffList]);

  const upcoming = appts
    .filter((a) => a.status !== "Cancelada" && a.status !== "Completada")
    .filter((a) => {
      if (!query) return true;
      const c = clientMap.get(a.clientId)?.toLowerCase() ?? "";
      const s = serviceMap.get(a.serviceId)?.toLowerCase() ?? "";
      const q = query.toLowerCase();
      return c.includes(q) || s.includes(q);
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 8);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-base font-bold">Próximas citas</h3>
          <p className="text-xs text-muted-foreground">Acceso rápido para editar o cancelar.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente o servicio…"
            className="pl-8"
          />
        </div>
      </div>
      <ul className="divide-y divide-border">
        {upcoming.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            No hay citas próximas.
          </li>
        )}
        {upcoming.map((a) => {
          const clientName = clientMap.get(a.clientId) ?? "Cliente";
          const serviceName = serviceMap.get(a.serviceId) ?? "Servicio";
          const staffName = staffMap.get(a.staffId) ?? "Staff";
          return (
            <li
              key={a.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{clientName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {serviceName} · {staffName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right text-xs">
                  <p className="font-medium">{a.date}</p>
                  <p className="text-muted-foreground">{a.time}</p>
                </div>
                <span
                  className={`hidden rounded-full border px-2.5 py-0.5 text-[11px] font-medium sm:inline-block ${STATUS_STYLE[a.status]}`}
                >
                  {a.status}
                </span>
                <Button variant="ghost" size="icon" onClick={() => onEdit(a)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCancel(a)}
                  aria-label="Cancelar"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Dialog ----------
function AppointmentDialog({
  open,
  onOpenChange,
  editing,
  prefill,
  clientsList,
  servicesList,
  staffList,
  onSave,
  onCancelAppt,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Appt | null;
  prefill: { date?: string; time?: string };
  clientsList: LookupItem[];
  servicesList: LookupItem[];
  staffList: LookupItem[];
  onSave: (a: Appt) => void;
  onCancelAppt: (a: Appt) => void;
  saving: boolean;
}) {
  const isEdit = !!editing;
  const initial: Appt = editing ?? {
    id: `a_${Date.now()}`,
    date: prefill.date ?? fmt(new Date()),
    time: prefill.time ?? "09:00",
    clientId: clientsList[0]?.id ?? "",
    serviceId: servicesList[0]?.id ?? "",
    staffId: staffList[0]?.id ?? "",
    status: "Pendiente",
    notes: "",
  };

  const [form, setForm] = useState<Appt>(initial);

  useEffect(() => {
    if (open) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, prefill.date, prefill.time]);

  useEffect(() => {
    if (!open || editing) return;
    setForm((f) => ({
      ...f,
      clientId: f.clientId || clientsList[0]?.id || "",
      serviceId: f.serviceId || servicesList[0]?.id || "",
      staffId: f.staffId || staffList[0]?.id || "",
    }));
  }, [open, clientsList, servicesList, staffList, editing]);

  const set = <K extends keyof Appt>(k: K, v: Appt[K]) => setForm((f) => ({ ...f, [k]: v }));

  const canSave = Boolean(
    form.date && form.time && form.clientId && form.serviceId && form.staffId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Editar cita" : "Nueva cita"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los detalles de la reserva."
              : "Completa la información para crear una reserva."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[min(55vh,28rem)] gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <FieldWrap icon={<CalIcon className="h-3.5 w-3.5" />} label="Fecha">
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </FieldWrap>
            <FieldWrap icon={<Clock className="h-3.5 w-3.5" />} label="Hora">
              <Select value={form.time} onValueChange={(v) => set("time", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
          </div>

          <FieldWrap icon={<User className="h-3.5 w-3.5" />} label="Cliente">
            <Select value={form.clientId} onValueChange={(v) => set("clientId", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clientsList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                {clientsList.length === 0 && (
                  <SelectItem value="__none" disabled>
                    No hay clientes
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </FieldWrap>

          <FieldWrap icon={<Scissors className="h-3.5 w-3.5" />} label="Servicio">
            <Select value={form.serviceId} onValueChange={(v) => set("serviceId", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {servicesList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.duration ? `· ${s.duration} min` : ""}
                  </SelectItem>
                ))}
                {servicesList.length === 0 && (
                  <SelectItem value="__none" disabled>
                    No hay servicios
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </FieldWrap>

          <FieldWrap icon={<UserCog className="h-3.5 w-3.5" />} label="Staff asignado">
            <Select value={form.staffId} onValueChange={(v) => set("staffId", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.role ? `— ${s.role}` : ""}
                  </SelectItem>
                ))}
                {staffList.length === 0 && (
                  <SelectItem value="__none" disabled>
                    No hay personal
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </FieldWrap>

          <div>
            <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estado
            </Label>
            <div className="flex flex-wrap gap-2">
              {(["Pendiente", "Confirmada", "Completada"] as Status[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => set("status", st)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    form.status === st
                      ? STATUS_STYLE[st] + " ring-2 ring-primary/30"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label
              htmlFor="notes"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Notas
            </Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Detalles adicionales…"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {isEdit ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onCancelAppt(form)}
            >
              <X className="h-4 w-4" /> Cancelar cita
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={() => onSave(form)} disabled={!canSave || saving}>
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear cita"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldWrap({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </Label>
      {children}
    </div>
  );
}
