import { createFileRoute } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import { useEffect, useState } from "react";
import { Calendar, Users, DollarSign, TrendingUp, Clock, MoreHorizontal } from "lucide-react";
import supabase from "@/lib/supabase";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

interface UpcomingAppt {
  id: string;
  time: string;
  client_name: string;
  service_name: string;
  staff_name: string;
  status: string;
}

interface WeekDay {
  label: string;
  count: number;
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function Dashboard() {
  const { profile } = useRole();
  const [todayCount, setTodayCount] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [activeClients, setActiveClients] = useState(0);
  const [occupancy, setOccupancy] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingAppt[]>([]);
  const [weekData, setWeekData] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const today = fmt(new Date());
      const now = new Date();
      const monthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));

      // Today's appointments count
      const { count: todayN } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("date", today);

      setTodayCount(todayN ?? 0);

      // Month revenue: sum of service prices for completed/confirmed appointments this month
      const { data: monthAppts } = await supabase
        .from("appointments")
        .select("service_id, status")
        .gte("date", monthStart)
        .lte("date", today)
        .in("status", ["Confirmada", "Completada"]);

      if (monthAppts && monthAppts.length > 0) {
        const serviceIds = [...new Set(monthAppts.map((a) => a.service_id))];
        const { data: svcs } = await supabase
          .from("services")
          .select("id, price")
          .in("id", serviceIds);
        const priceMap = new Map((svcs ?? []).map((s) => [s.id, s.price]));
        const total = monthAppts.reduce((sum, a) => sum + (priceMap.get(a.service_id) ?? 0), 0);
        setMonthRevenue(total);
      }

      // Active clients count
      const { count: clientsN } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .neq("tag", "Inactivo");
      setActiveClients(clientsN ?? 0);

      // Occupancy: today's appointments / total staff * 100 (rough estimate)
      const { count: staffN } = await supabase
        .from("staff")
        .select("*", { count: "exact", head: true });
      const staffCount = staffN ?? 0;
      const totalSlots = staffCount > 0 ? staffCount * 10 : 1;
      const occPct =
        staffCount > 0 ? Math.min(100, Math.round(((todayN ?? 0) / totalSlots) * 100)) : 0;
      setOccupancy(occPct);

      // Upcoming appointments for today (with joins via separate queries)
      const { data: todayAppts } = await supabase
        .from("appointments")
        .select("id, time, status, client_id, service_id, staff_id")
        .eq("date", today)
        .in("status", ["Confirmada", "Pendiente"])
        .order("time");

      if (todayAppts && todayAppts.length > 0) {
        const clientIds = [...new Set(todayAppts.map((a) => a.client_id))];
        const serviceIds = [...new Set(todayAppts.map((a) => a.service_id))];
        const staffIds = [...new Set(todayAppts.map((a) => a.staff_id))];

        const [clientsRes, servicesRes, staffRes] = await Promise.all([
          supabase.from("clients").select("id, name").in("id", clientIds),
          supabase.from("services").select("id, name").in("id", serviceIds),
          supabase.from("staff").select("id, name").in("id", staffIds),
        ]);

        const clientMap = new Map((clientsRes.data ?? []).map((c) => [c.id, c.name]));
        const serviceMap = new Map((servicesRes.data ?? []).map((s) => [s.id, s.name]));
        const staffMap = new Map((staffRes.data ?? []).map((s) => [s.id, s.name]));

        setUpcoming(
          todayAppts.map((a) => ({
            id: a.id,
            time: a.time,
            client_name: clientMap.get(a.client_id) ?? "Cliente",
            service_name: serviceMap.get(a.service_id) ?? "Servicio",
            staff_name: staffMap.get(a.staff_id) ?? "Staff",
            status: a.status,
          })),
        );
      } else {
        setUpcoming([]);
      }

      // Weekly summary: appointments per day this week
      const weekStart = new Date(now);
      const day = (weekStart.getDay() + 6) % 7;
      weekStart.setDate(weekStart.getDate() - day);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { data: weekAppts } = await supabase
        .from("appointments")
        .select("date")
        .gte("date", fmt(weekStart))
        .lt("date", fmt(weekEnd));

      const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];
      const counts = new Array(7).fill(0);
      (weekAppts ?? []).forEach((a) => {
        const d = new Date(a.date + "T00:00:00");
        const idx = (d.getDay() + 6) % 7;
        counts[idx]++;
      });
      setWeekData(dayLabels.map((label, i) => ({ label, count: counts[i] })));

      setLoading(false);
    }

    load();
  }, []);

  const stats = [
    {
      label: "Citas hoy",
      value: String(todayCount),
      delta: "",
      icon: Calendar,
      tone: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Ingresos del mes",
      value: formatMoney(monthRevenue),
      delta: "",
      icon: DollarSign,
      tone: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Clientes activos",
      value: String(activeClients),
      delta: "",
      icon: Users,
      tone: "text-chart-5",
      bg: "bg-chart-5/10",
    },
    {
      label: "Ocupación",
      value: `${occupancy}%`,
      delta: "",
      icon: TrendingUp,
      tone: "text-chart-2",
      bg: "bg-chart-2/10",
    },
  ];

  const today = new Date();
  const dateLabel = today.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Buen día, <span className="text-gradient">{profile.name.split(" ")[0]}</span> 👋
        </h2>
        <p className="text-sm text-muted-foreground">Aquí tienes un resumen de tu negocio.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="card-surface hover:card-surface-hover animate-fade-up group relative overflow-hidden p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="bg-gradient-soft pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex items-start justify-between">
              <div
                className={`grid h-10 w-10 place-items-center rounded-xl ${s.bg} ${s.tone} transition-transform duration-300 group-hover:scale-110`}
              >
                <s.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="relative mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="relative mt-1 font-display text-2xl font-bold tracking-tight">
              {loading ? "—" : s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming appointments */}
        <div className="rounded-2xl border border-border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h3 className="font-display font-semibold">Próximas citas</h3>
              <p className="text-xs text-muted-foreground">Hoy, {dateLabel}</p>
            </div>
            <button className="rounded-md p-1.5 hover:bg-accent">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : upcoming.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No hay citas programadas para hoy.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center gap-4 p-4 transition hover:bg-muted/40">
                  <div className="grid w-14 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <span className="font-display text-sm font-bold">{a.time}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.client_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.service_name} · {a.staff_name}
                    </p>
                  </div>
                  <span
                    className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-block ${
                      a.status === "Confirmada"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning-foreground"
                    }`}
                  >
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Activity */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Resumen semanal</h3>
            <div className="mt-4 flex items-end gap-2 h-32">
              {weekData.map((d, i) => {
                const maxCount = Math.max(...weekData.map((x) => x.count), 1);
                const heightPct = (d.count / maxCount) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-md bg-gradient-to-t from-primary/30 to-primary"
                    style={{ height: `${Math.max(heightPct, 8)}%` }}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              {weekData.map((d, i) => (
                <span key={i}>{d.label}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Recordatorios</h3>
            <ul className="mt-3 space-y-3">
              {[
                { t: "Revisa tus citas pendientes", d: "Confirma con tus clientes" },
                { t: "Actualiza tu catálogo", d: "Servicios y precios" },
              ].map((r) => (
                <li key={r.t} className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.t}</p>
                    <p className="text-xs text-muted-foreground">{r.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
