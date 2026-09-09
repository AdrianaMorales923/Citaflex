import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  Scissors,
  Sparkles,
  Brush,
  Check,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  User,
  ArrowLeft,
  Loader2,
  CalendarOff,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/lib/business-settings";
import { useAuth } from "@/lib/auth-context";
import { notifyRoles } from "@/lib/use-notifications";
import supabase from "@/lib/supabase";

export const Route = createFileRoute("/book")({ component: PublicBooking });

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
  description: string;
};
type StaffMember = { id: string; name: string; role: string; rating: number };
type DayCfg = { enabled: boolean; open: string; close: string };
type BookedAppt = { time: string; staffId: string; duration: number };

const WD_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const timeLabel = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Dos franjas horarias [a, a+da] y [b, b+db] se solapan. */
function overlaps(a: number, b: number, da: number, db: number) {
  return a < b + db && b < a + da;
}

const CATEGORY_ICON: Record<string, typeof Scissors> = {
  Cabello: Scissors,
  Uñas: Sparkles,
  Maquillaje: Brush,
};
const categoryIcon = (category: string) => CATEGORY_ICON[category] ?? Scissors;

function PublicBooking() {
  const { business, settings, formatMoney } = useBusiness();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffByService, setStaffByService] = useState<Record<string, string[]>>({});
  const [hours, setHours] = useState<Record<string, DayCfg>>({});
  const [booked, setBooked] = useState<BookedAppt[]>([]);

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Cargar catalogo real: servicios, personal, relacion servicio-personal y horarios
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from("services")
        .select("id, name, duration, price, category, description")
        .eq("status", "Activo")
        .order("name"),
      supabase.from("staff").select("id, name, role, rating").eq("is_active", true).order("name"),
      supabase.from("service_staff").select("service_id, staff_id"),
      supabase.from("business_hours").select("day, enabled, open_time, close_time"),
    ]).then(([svc, stf, jun, hrs]) => {
      if (!active) return;
      setServices(
        (svc.data ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          price: s.price,
          category: s.category,
          description: s.description ?? "",
        })),
      );
      setStaff(
        (stf.data ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role ?? "",
          rating: Number(s.rating) || 0,
        })),
      );
      const map: Record<string, string[]> = {};
      for (const r of jun.data ?? []) {
        map[r.service_id] = map[r.service_id] ?? [];
        map[r.service_id].push(r.staff_id);
      }
      setStaffByService(map);
      const hm: Record<string, DayCfg> = {};
      for (const k of WD_KEYS) hm[k] = { enabled: false, open: "08:00", close: "19:00" };
      for (const r of hrs.data ?? []) {
        if (hm[r.day]) {
          hm[r.day] = {
            enabled: r.enabled,
            open: String(r.open_time).slice(0, 5),
            close: String(r.close_time).slice(0, 5),
          };
        }
      }
      setHours(hm);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // Citas ya agendadas del dia elegido (para no ofrecer horarios ocupados)
  useEffect(() => {
    if (!date) {
      setBooked([]);
      return;
    }
    let active = true;
    supabase
      .from("appointments")
      .select("time, staff_id, services(duration)")
      .eq("date", dateStr(date))
      .in("status", ["Pendiente", "Confirmada"])
      .then(({ data }) => {
        if (!active) return;
        setBooked(
          (data ?? []).map((a) => {
            const svc = Array.isArray(a.services) ? a.services[0] : a.services;
            return {
              time: String(a.time).slice(0, 5),
              staffId: a.staff_id,
              duration: svc?.duration ?? 60,
            };
          }),
        );
      });
    return () => {
      active = false;
    };
  }, [date]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const staffMember = staff.find((s) => s.id === staffId) ?? null;
  const availableStaff = useMemo(
    () => (serviceId ? staff.filter((s) => staffByService[serviceId]?.includes(s.id)) : staff),
    [serviceId, staff, staffByService],
  );

  const slots = useMemo(() => {
    if (!date || !staffId || !service) return [];
    const day = hours[WD_KEYS[(date.getDay() + 6) % 7]];
    if (!day?.enabled) return [];
    const interval = Math.max(15, settings.slotMinutes || 30);
    const open = toMin(day.open);
    const close = toMin(day.close);
    const now = new Date();
    const isToday = dateStr(date) === dateStr(now);
    const out: string[] = [];
    for (let t = open; t + service.duration <= close; t += interval) {
      const label = timeLabel(t);
      if (isToday && t <= toMin(`${pad(now.getHours())}:${pad(now.getMinutes())}`)) continue;
      if (
        booked.some(
          (b) => b.staffId === staffId && overlaps(t, toMin(b.time), service.duration, b.duration),
        )
      )
        continue;
      out.push(label);
    }
    return out;
  }, [date, staffId, service, hours, booked, settings.slotMinutes]);

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isDayClosed = (d: Date) => {
    const day = hours[WD_KEYS[(d.getDay() + 6) % 7]];
    return !day?.enabled;
  };

  const steps = [
    { n: 1, label: "Servicio" },
    { n: 2, label: "Profesional" },
    { n: 3, label: "Fecha y hora" },
    { n: 4, label: "Confirmar" },
  ];

  const canNext =
    (step === 1 && !!serviceId) ||
    (step === 2 && !!staffId) ||
    (step === 3 && !!date && !!time) ||
    (step === 4 && name.trim().length > 1 && phone.trim().length >= 7);

  function next() {
    if (!canNext) return;
    if (step === 4) {
      submit();
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setStep(1);
    setServiceId(null);
    setStaffId(null);
    setDate(undefined);
    setTime(null);
    setName("");
    setPhone("");
    setConfirmed(false);
  }

  // Busca o crea el cliente. Si hay sesion, lo vincula al usuario.
  async function findClientId(): Promise<string> {
    if (user) {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) return data.id;
    }
    const { data: byPhone } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", phone.trim())
      .maybeSingle();
    if (byPhone) return byPhone.id;

    const id = crypto.randomUUID();
    const { error } = await supabase.from("clients").insert({
      id,
      business_id: business?.id,
      name: name.trim(),
      phone: phone.trim(),
      user_id: user?.id ?? null,
      tag: "Nuevo",
    });
    if (error) throw new Error(error.message);
    return id;
  }

  async function submit() {
    if (!service || !staffMember || !date || !time) return;
    setSubmitting(true);
    try {
      const clientId = await findClientId();
      const appointmentId = crypto.randomUUID();
      const { error } = await supabase.from("appointments").insert({
        id: appointmentId,
        business_id: business?.id,
        date: dateStr(date),
        time,
        client_id: clientId,
        service_id: service.id,
        staff_id: staffMember.id,
        status: settings.booking.manualConfirm ? "Pendiente" : "Confirmada",
      });
      if (error) throw new Error(error.message);

      await notifyRoles({
        title: "Nueva reserva online",
        description: `${name.trim()} reservó ${service.name} con ${staffMember.name} el ${dateStr(date)} a las ${time}.`,
        tone: "primary",
        icon: "Calendar",
        appointmentId,
      });

      toast.success(
        settings.booking.manualConfirm
          ? "Cita agendada. El negocio la confirmará pronto."
          : "¡Cita confirmada!",
      );
      setConfirmed(true);
    } catch (e) {
      toast.error("No se pudo guardar la cita: " + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PublicHeader />
        <main className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!settings.booking.online) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PublicHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
              <CalendarOff className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold">Reservas online deshabilitadas</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {business?.name ?? "El negocio"} no está aceptando reservas por este medio por ahora.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PublicHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
              <Scissors className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold">Sin servicios disponibles</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Aún no hay servicios publicados. Vuelve más tarde.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (confirmed && service && staffMember && date && time) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PublicHeader />
        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
              <Check className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">
              {settings.booking.manualConfirm ? "¡Solicitud enviada!" : "¡Tu cita está reservada!"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {settings.booking.manualConfirm
                ? "El negocio revisará tu solicitud y la confirmará a la brevedad."
                : "Te esperamos en la fecha indicada."}
            </p>
            <div className="mt-6 grid gap-3 text-left">
              <SummaryRow label="Servicio" value={`${service.name} · ${service.duration} min`} />
              <SummaryRow label="Profesional" value={staffMember.name} />
              <SummaryRow
                label="Fecha"
                value={date.toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              />
              <SummaryRow label="Hora" value={time} />
              {settings.booking.showPrices && (
                <SummaryRow label="Total" value={formatMoney(service.price)} />
              )}
            </div>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={reset} variant="outline">
                Reservar otra cita
              </Button>
              {user ? (
                <Button asChild>
                  <Link to="/app/my-appointments" search={{ cita: undefined }}>
                    Ver mis citas
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/">Volver al inicio</Link>
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Hero */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Reserva tu cita
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {business?.name ?? "Citaflex"} · {business?.city || "Barranquilla"}
          </p>
        </div>

        {/* Stepper */}
        <ol className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 sm:mb-8">
          {steps.map((s, i) => (
            <li key={s.n} className="flex shrink-0 items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  step === s.n
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : step > s.n
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-background/20 text-[10px] font-bold">
                  {step > s.n ? <Check className="h-3 w-3" /> : s.n}
                </span>
                <span className="whitespace-nowrap">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              )}
            </li>
          ))}
        </ol>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Step content */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            {step === 1 && (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold">Elige un servicio</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.map((s) => {
                    const Icon = categoryIcon(s.category);
                    const active = serviceId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setServiceId(s.id);
                          setStaffId(null);
                          setTime(null);
                        }}
                        className={cn(
                          "group flex items-start gap-3 rounded-xl border p-4 text-left transition hover:shadow-md",
                          active
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border bg-background hover:border-primary/40",
                        )}
                      >
                        <div
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent text-accent-foreground",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="truncate text-sm font-semibold">{s.name}</h3>
                            {settings.booking.showPrices && (
                              <span className="shrink-0 text-sm font-semibold text-primary">
                                {formatMoney(s.price)}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {s.description}
                          </p>
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {s.duration} min
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold">Elige un profesional</h2>
                {availableStaff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ningún profesional atiende este servicio por ahora.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableStaff.map((s) => {
                      const active = staffId === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setStaffId(s.id);
                            setTime(null);
                          }}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-4 text-left transition hover:shadow-md",
                            active
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border bg-background hover:border-primary/40",
                          )}
                        >
                          <div
                            className={cn(
                              "grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-semibold",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent text-accent-foreground",
                            )}
                          >
                            {s.name
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold">{s.name}</h3>
                            <p className="truncate text-xs text-muted-foreground">{s.role}</p>
                            <div className="mt-1 flex items-center gap-1 text-xs">
                              <Star className="h-3 w-3 fill-warning text-warning" />
                              <span className="font-medium">{s.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-lg font-semibold">Selecciona fecha</h2>
                  <div className="mt-3 flex justify-center rounded-xl border border-border bg-background p-2">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        setDate(d);
                        setTime(null);
                      }}
                      disabled={(d) => d < startOfToday || isDayClosed(d)}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">Horarios disponibles</h2>
                  {!date ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Selecciona una fecha para ver los horarios.
                    </p>
                  ) : isDayClosed(date) ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Este día el negocio está cerrado. Prueba otra fecha.
                    </p>
                  ) : slots.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No hay disponibilidad este día para el profesional elegido. Prueba otra fecha
                      o profesional.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {slots.map((slot) => {
                        const active = time === slot;
                        return (
                          <button
                            key={slot}
                            onClick={() => setTime(slot)}
                            className={cn(
                              "rounded-lg border px-2 py-2.5 text-sm font-medium transition",
                              active
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-background hover:border-primary/40 hover:bg-accent",
                            )}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="font-display text-lg font-semibold">Tus datos</h2>
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Camila Torres"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+57 300 000 0000"
                      inputMode="tel"
                    />
                  </div>
                </div>
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {settings.booking.manualConfirm
                    ? "El negocio revisará tu solicitud y te contactará por WhatsApp para confirmarla."
                    : "Al confirmar aceptas recibir un recordatorio por WhatsApp antes de tu cita."}
                </p>
              </div>
            )}

            {/* Inline nav (replaces bottom nav bar) */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
              <Button variant="ghost" onClick={back} disabled={step === 1} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </Button>
              <Button onClick={next} disabled={!canNext || submitting} className="gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : step === 4 ? (
                  "Confirmar reserva"
                ) : (
                  "Continuar"
                )}
                {step !== 4 && !submitting && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-display text-base font-semibold">Resumen</h3>
              <div className="mt-4 space-y-3 text-sm">
                <SummaryLine
                  icon={Sparkles}
                  label="Servicio"
                  value={service ? service.name : "—"}
                  hint={service ? `${service.duration} min` : undefined}
                />
                <SummaryLine
                  icon={User}
                  label="Profesional"
                  value={staffMember ? staffMember.name : "—"}
                />
                <SummaryLine
                  icon={CalendarCheck2}
                  label="Fecha"
                  value={
                    date
                      ? date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                      : "—"
                  }
                />
                <SummaryLine icon={Clock} label="Hora" value={time ?? "—"} />
              </div>
              {settings.booking.showPrices && (
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-display text-lg font-bold text-primary">
                    {service ? formatMoney(service.price) : "—"}
                  </span>
                </div>
              )}
              {service && (
                <Badge variant="secondary" className="mt-3 w-full justify-center">
                  {settings.booking.manualConfirm
                    ? "Pendiente de confirmación"
                    : "Confirmación inmediata"}
                </Badge>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <CalendarCheck2 className="h-4 w-4" />
          </div>
          <span className="truncate font-display text-base font-bold sm:text-lg">Citaflex</span>
        </Link>
        <Link
          to="/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}

function SummaryLine({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}
