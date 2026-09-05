import { createFileRoute, Link } from "@tanstack/react-router";
import { formatMoney as fmtCop } from "@/lib/money";
import { useMemo, useState } from "react";
import {
  CalendarCheck2,
  Scissors,
  Sparkles,
  Stethoscope,
  Brush,
  Check,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  User,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book")({ component: PublicBooking });

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
  icon: typeof Scissors;
  desc: string;
};
type Staff = { id: string; name: string; role: string; rating: number; services: string[] };

const SERVICES: Service[] = [
  {
    id: "corte",
    name: "Corte + Peinado",
    duration: 45,
    price: 40000,
    icon: Scissors,
    desc: "Corte profesional con lavado y peinado.",
  },
  {
    id: "color",
    name: "Coloración",
    duration: 90,
    price: 95000,
    icon: Brush,
    desc: "Coloración completa con productos premium.",
  },
  {
    id: "mani",
    name: "Manicure",
    duration: 60,
    price: 30000,
    icon: Sparkles,
    desc: "Manicure clásica con esmaltado.",
  },
  {
    id: "trata",
    name: "Tratamiento capilar",
    duration: 60,
    price: 70000,
    icon: Stethoscope,
    desc: "Hidratación profunda y reparación.",
  },
  {
    id: "maqui",
    name: "Maquillaje",
    duration: 60,
    price: 80000,
    icon: Sparkles,
    desc: "Maquillaje social o de evento.",
  },
];

const STAFF: Staff[] = [
  {
    id: "maria",
    name: "María González",
    role: "Estilista senior",
    rating: 4.9,
    services: ["corte", "color", "trata"],
  },
  {
    id: "laura",
    name: "Laura Restrepo",
    role: "Colorista",
    rating: 4.8,
    services: ["color", "trata", "corte"],
  },
  { id: "camilo", name: "Camilo Vargas", role: "Barbero", rating: 4.7, services: ["corte"] },
  { id: "sara", name: "Sara López", role: "Manicurista", rating: 4.9, services: ["mani", "maqui"] },
];

const ALL_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

function PublicBooking() {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const service = SERVICES.find((s) => s.id === serviceId) ?? null;
  const staff = STAFF.find((s) => s.id === staffId) ?? null;
  const availableStaff = useMemo(
    () => (serviceId ? STAFF.filter((s) => s.services.includes(serviceId)) : STAFF),
    [serviceId],
  );

  // Mock availability: deterministic per date+staff
  const availableSlots = useMemo(() => {
    if (!date || !staffId) return [];
    const seed = (date.getDate() + staffId.length) % 5;
    return ALL_SLOTS.filter((_, i) => (i + seed) % 3 !== 0);
  }, [date, staffId]);

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
      setConfirmed(true);
      toast.success("¡Cita confirmada!");
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  if (confirmed && service && staff && date && time) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PublicHeader />
        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
              <Check className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">
              ¡Tu cita está reservada!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Te enviamos los detalles por SMS al {phone}.
            </p>
            <div className="mt-6 grid gap-3 text-left">
              <SummaryRow label="Servicio" value={`${service.name} · ${service.duration} min`} />
              <SummaryRow label="Profesional" value={staff.name} />
              <SummaryRow
                label="Fecha"
                value={date.toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              />
              <SummaryRow label="Hora" value={time} />
              <SummaryRow label="Total" value={fmtCop(service.price)} />
            </div>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={reset} variant="outline">
                Reservar otra cita
              </Button>
              <Button asChild>
                <Link to="/">Volver al inicio</Link>
              </Button>
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
            <MapPin className="h-4 w-4 shrink-0" /> Salón Citaflex · Barranquilla
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
                  {SERVICES.map((s) => {
                    const Icon = s.icon;
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
                            <span className="shrink-0 text-sm font-semibold text-primary">
                              {fmtCop(s.price)}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {s.desc}
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
                            <span className="font-medium">{s.rating}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
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
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
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
                  ) : availableSlots.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No hay disponibilidad este día. Prueba otra fecha.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {availableSlots.map((slot) => {
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
                <p className="text-xs text-muted-foreground">
                  Al confirmar aceptas recibir un recordatorio por SMS.
                </p>
              </div>
            )}

            {/* Inline nav (replaces bottom nav bar) */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
              <Button variant="ghost" onClick={back} disabled={step === 1} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </Button>
              <Button onClick={next} disabled={!canNext} className="gap-2">
                {step === 4 ? "Confirmar reserva" : "Continuar"}
                {step !== 4 && <ChevronRight className="h-4 w-4" />}
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
                <SummaryLine icon={User} label="Profesional" value={staff ? staff.name : "—"} />
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
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-lg font-bold text-primary">
                  {service ? fmtCop(service.price) : "—"}
                </span>
              </div>
              {service && (
                <Badge variant="secondary" className="mt-3 w-full justify-center">
                  Confirmación inmediata
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
