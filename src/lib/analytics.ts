import supabase from "./supabase";

export type RangeKey = "week" | "month" | "year";

export type ApptRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  status: string; // Pendiente | Confirmada | Completada | Cancelada
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  price: number;
  staffId: string;
  staffName: string;
  clientId: string;
  clientName: string;
};

export type ClientRow = { id: string; name: string; created_at: string };
export type StaffRow = { id: string; name: string; rating: number };

export type RangeBounds = { from: Date; to: Date; prevFrom: Date; prevTo: Date };

const DAY_MS = 86_400_000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Rango actual y rango anterior equivalente (para deltas). */
export function rangeBounds(range: RangeKey, now = new Date()): RangeBounds {
  const today = startOfDay(now);
  if (range === "week") {
    const dow = (today.getDay() + 6) % 7; // lunes = 0
    const from = new Date(today.getTime() - dow * DAY_MS);
    const to = new Date(from.getTime() + 6 * DAY_MS);
    return {
      from,
      to,
      prevFrom: new Date(from.getTime() - 7 * DAY_MS),
      prevTo: new Date(from.getTime() - DAY_MS),
    };
  }
  if (range === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const prevFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevTo = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from, to, prevFrom, prevTo };
  }
  const from = new Date(today.getFullYear(), 0, 1);
  const to = new Date(today.getFullYear(), 11, 31);
  return {
    from,
    to,
    prevFrom: new Date(today.getFullYear() - 1, 0, 1),
    prevTo: new Date(today.getFullYear() - 1, 11, 31),
  };
}

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function fetchAppointments(fromISO: string, toISO: string): Promise<ApptRecord[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, date, time, status, service_id, staff_id, client_id, services(name, price, category), staff(name), clients(name)",
    )
    .gte("date", fromISO)
    .lte("date", toISO)
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(5000);
  if (error || !data) return [];
  return data.map((r) => {
    const svc = Array.isArray(r.services) ? r.services[0] : r.services;
    const stf = Array.isArray(r.staff) ? r.staff[0] : r.staff;
    const cli = Array.isArray(r.clients) ? r.clients[0] : r.clients;
    return {
      id: r.id,
      date: r.date,
      time: r.time,
      status: r.status,
      serviceId: r.service_id,
      serviceName: svc?.name ?? "Servicio",
      serviceCategory: svc?.category ?? "General",
      price: svc?.price ?? 0,
      staffId: r.staff_id,
      staffName: stf?.name ?? "—",
      clientId: r.client_id,
      clientName: cli?.name ?? "Cliente",
    };
  });
}

export async function fetchClients(): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, created_at")
    .order("created_at", { ascending: true })
    .limit(5000);
  if (error || !data) return [];
  return data;
}

export async function fetchStaffList(): Promise<StaffRow[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, rating")
    .eq("is_active", true)
    .order("name");
  if (error || !data) return [];
  return data.map((s) => ({ id: s.id, name: s.name, rating: Number(s.rating) || 0 }));
}

// ─── Agregaciones ──────────────────────────────────────────────────────────

const WD_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/** Etiquetas de los buckets de la serie temporal según el rango. */
export function bucketLabels(range: RangeKey, bounds: RangeBounds): string[] {
  if (range === "week") return WD_LABELS;
  if (range === "month") {
    const weeks = Math.ceil((bounds.to.getTime() - bounds.from.getTime() + DAY_MS) / (7 * DAY_MS));
    return Array.from({ length: weeks }, (_, i) => `S${i + 1}`);
  }
  return MONTH_LABELS;
}

/** Índice del bucket al que pertenece una fecha dentro del rango. */
export function bucketIndex(range: RangeKey, bounds: RangeBounds, dateISO: string): number {
  const d = new Date(`${dateISO}T00:00:00`);
  if (range === "week") return (d.getDay() + 6) % 7;
  if (range === "month")
    return Math.min(
      bucketLabels("month", bounds).length - 1,
      Math.floor((d.getTime() - bounds.from.getTime()) / (7 * DAY_MS)),
    );
  return d.getMonth();
}

/** Ingresos (citas Completadas) por bucket. */
export function revenueSeries(records: ApptRecord[], range: RangeKey, bounds: RangeBounds) {
  const labels = bucketLabels(range, bounds);
  const values = new Array(labels.length).fill(0);
  for (const r of records) {
    if (r.status !== "Completada") continue;
    values[bucketIndex(range, bounds, r.date)] += r.price;
  }
  return labels.map((label, i) => ({ label, value: values[i] }));
}

/** Citas completadas vs canceladas por bucket. */
export function appointmentsSeries(records: ApptRecord[], range: RangeKey, bounds: RangeBounds) {
  const labels = bucketLabels(range, bounds);
  const done = new Array(labels.length).fill(0);
  const cancelled = new Array(labels.length).fill(0);
  for (const r of records) {
    const i = bucketIndex(range, bounds, r.date);
    if (r.status === "Completada") done[i] += 1;
    else if (r.status === "Cancelada") cancelled[i] += 1;
  }
  return labels.map((label, i) => ({ label, completadas: done[i], canceladas: cancelled[i] }));
}

/** Citas por día de la semana (Lun..Dom), para cualquier rango. */
export function byWeekday(records: ApptRecord[]) {
  const done = new Array(7).fill(0);
  const cancelled = new Array(7).fill(0);
  for (const r of records) {
    const i = (new Date(`${r.date}T00:00:00`).getDay() + 6) % 7;
    if (r.status === "Completada") done[i] += 1;
    else if (r.status === "Cancelada") cancelled[i] += 1;
  }
  return WD_LABELS.map((d, i) => ({ d, completadas: done[i], canceladas: cancelled[i] }));
}

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Top servicios por número de citas (sin canceladas). */
export function topServices(records: ApptRecord[], limit = 5) {
  const map = new Map<string, number>();
  for (const r of records) {
    if (r.status === "Cancelada") continue;
    map.set(r.serviceName, (map.get(r.serviceName) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
}

/** Distribución de citas por estado. */
export function statusSplit(records: ApptRecord[]) {
  const order = ["Completada", "Confirmada", "Pendiente", "Cancelada"];
  const colors: Record<string, string> = {
    Completada: "var(--chart-3)",
    Confirmada: "var(--chart-2)",
    Pendiente: "var(--chart-4)",
    Cancelada: "var(--destructive)",
  };
  const map = new Map<string, number>();
  for (const r of records) map.set(r.status, (map.get(r.status) ?? 0) + 1);
  return order
    .filter((s) => map.has(s))
    .map((s) => ({ name: `${s}s`, value: map.get(s)!, color: colors[s] }));
}

/** Ocupación por hora: % relativo al máximo de citas en una franja. */
export function occupancyByHour(records: ApptRecord[]) {
  const counts = new Map<number, number>();
  for (const r of records) {
    if (r.status === "Cancelada") continue;
    const h = parseInt(r.time.slice(0, 2), 10);
    if (!Number.isNaN(h)) counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  const max = Math.max(1, ...counts.values());
  const out: { h: string; ocupacion: number }[] = [];
  for (let h = 8; h <= 19; h++) {
    out.push({
      h: String(h).padStart(2, "0"),
      ocupacion: Math.round(((counts.get(h) ?? 0) / max) * 100),
    });
  }
  return out;
}

/** Desempeño por miembro del equipo. */
export function byStaff(records: ApptRecord[], staffList: StaffRow[]) {
  const map = new Map<string, { citas: number; ingresos: number }>();
  for (const r of records) {
    if (r.status !== "Completada") continue;
    const cur = map.get(r.staffId) ?? { citas: 0, ingresos: 0 };
    cur.citas += 1;
    cur.ingresos += r.price;
    map.set(r.staffId, cur);
  }
  return staffList
    .map((s) => ({
      nombre: s.name,
      citas: map.get(s.id)?.citas ?? 0,
      ingresos: map.get(s.id)?.ingresos ?? 0,
      rating: s.rating,
    }))
    .sort((a, b) => b.citas - a.citas);
}

/** Rendimiento por servicio: citas e ingresos (solo completadas). */
export function servicePerformance(records: ApptRecord[]) {
  const map = new Map<string, { citas: number; ingresos: number; categoria: string }>();
  for (const r of records) {
    if (r.status !== "Completada") continue;
    const cur = map.get(r.serviceName) ?? { citas: 0, ingresos: 0, categoria: r.serviceCategory };
    cur.citas += 1;
    cur.ingresos += r.price;
    map.set(r.serviceName, cur);
  }
  return [...map.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.ingresos - a.ingresos);
}

/** Ingresos agrupados por categoría de servicio. */
export function revenueByCategory(records: ApptRecord[]) {
  const map = new Map<string, number>();
  for (const r of records) {
    if (r.status !== "Completada") continue;
    map.set(r.serviceCategory, (map.get(r.serviceCategory) ?? 0) + r.price);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
}

/** Top clientes por gasto (citas completadas). */
export function topClients(records: ApptRecord[], limit = 5) {
  const map = new Map<string, { visitas: number; gasto: number }>();
  for (const r of records) {
    if (r.status !== "Completada") continue;
    const cur = map.get(r.clientName) ?? { visitas: 0, gasto: 0 };
    cur.visitas += 1;
    cur.gasto += r.price;
    map.set(r.clientName, cur);
  }
  return [...map.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, limit);
}

/** Nuevos clientes (por created_at) por bucket + clientes activos (con cita) por bucket. */
export function clientsSeries(
  clients: ClientRow[],
  records: ApptRecord[],
  range: RangeKey,
  bounds: RangeBounds,
) {
  const labels = bucketLabels(range, bounds);
  const nuevos = new Array(labels.length).fill(0);
  const activos = new Array(labels.length).fill(0);
  for (const c of clients) {
    const created = c.created_at?.slice(0, 10);
    if (!created) continue;
    if (created < toISODate(bounds.from) || created > toISODate(bounds.to)) continue;
    nuevos[bucketIndex(range, bounds, created)] += 1;
  }
  const seen = labels.map(() => new Set<string>());
  for (const r of records) {
    if (r.status === "Cancelada") continue;
    seen[bucketIndex(range, bounds, r.date)].add(r.clientId);
  }
  seen.forEach((s, i) => (activos[i] = s.size));
  return labels.map((label, i) => ({ label, value: nuevos[i], meta: activos[i] }));
}

export function sumRevenue(records: ApptRecord[]) {
  return records.reduce((acc, r) => (r.status === "Completada" ? acc + r.price : acc), 0);
}

export function countByStatus(records: ApptRecord[], status: string) {
  return records.filter((r) => r.status === status).length;
}

/** Variación porcentual vs periodo anterior; null si no hay base de comparación. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
