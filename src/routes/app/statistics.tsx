import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Star,
  Clock,
  Download,
  Activity,
  Percent,
  ArrowUpRight,
  Filter,
  FileText,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useBusiness } from "@/lib/business-settings";
import { downloadCSV, printReportPDF } from "@/lib/report-export";
import {
  fetchAppointments,
  fetchClients,
  fetchStaffList,
  rangeBounds,
  toISODate,
  bucketLabels,
  revenueSeries,
  byWeekday,
  topServices,
  occupancyByHour,
  byStaff,
  statusSplit,
  countByStatus,
  sumRevenue,
  deltaPct,
  type ApptRecord,
  type RangeKey,
} from "@/lib/analytics";

export const Route = createFileRoute("/app/statistics")({ component: Statistics });

const RANGE_LABEL: Record<RangeKey, string> = { week: "Semana", month: "Mes", year: "Año" };

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    color?: string;
    name?: string | number;
    value?: number | string;
  }>;
  label?: string | number;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((p) => (
          <div key={String(p.dataKey)} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium text-foreground">
              {formatter && typeof p.value === "number" ? formatter(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Statistics() {
  const { business, formatMoney } = useBusiness();
  const [range, setRange] = useState<RangeKey>("month");
  const [reportTab, setReportTab] = useState<"weekly" | "monthly">("weekly");
  const [loading, setLoading] = useState(true);

  const [records, setRecords] = useState<ApptRecord[]>([]);
  const [prevRecords, setPrevRecords] = useState<ApptRecord[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string; rating: number }[]>([]);

  const [services, setServices] = useState<string[]>([]);
  const [staffSel, setStaffSel] = useState<string[]>([]);
  const [status, setStatus] = useState<"all" | "completed" | "cancelled">("all");
  const [exporting, setExporting] = useState<null | "csv" | "pdf">(null);

  const bounds = useMemo(() => rangeBounds(range), [range]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const b = rangeBounds(range);
    Promise.all([
      fetchAppointments(toISODate(b.from), toISODate(b.to)),
      fetchAppointments(toISODate(b.prevFrom), toISODate(b.prevTo)),
      fetchClients(),
      fetchStaffList(),
    ]).then(([cur, prev, cli, staff]) => {
      if (!active) return;
      setRecords(cur);
      setPrevRecords(prev);
      setClients(cli);
      setStaffList(staff);
      setServices((s) => (s.length ? s : [...new Set(cur.map((r) => r.serviceName))]));
      setStaffSel((s) => (s.length ? s : staff.map((x) => x.name)));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [range]);

  // Filtros aplicados a los registros reales
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (status === "completed" && r.status !== "Completada") return false;
      if (status === "cancelled" && r.status !== "Cancelada") return false;
      if (services.length && !services.includes(r.serviceName)) return false;
      if (staffSel.length && !staffSel.includes(r.staffName)) return false;
      return true;
    });
  }, [records, services, staffSel, status]);

  const revenue = useMemo(() => revenueSeries(filtered, range, bounds), [filtered, range, bounds]);
  const prevRevenue = useMemo(() => sumRevenue(prevRecords), [prevRecords]);
  const apptsSeries = useMemo(() => byWeekday(filtered), [filtered]);
  const servicesTop = useMemo(() => topServices(filtered, 6), [filtered]);
  const occupancy = useMemo(() => occupancyByHour(filtered), [filtered]);
  const staffPerf = useMemo(() => byStaff(filtered, staffList), [filtered, staffList]);
  const statusData = useMemo(() => statusSplit(filtered), [filtered]);

  const totalRevenue = useMemo(() => sumRevenue(filtered), [filtered]);
  const completedCount = useMemo(() => countByStatus(filtered, "Completada"), [filtered]);
  const cancelledCount = useMemo(() => countByStatus(filtered, "Cancelada"), [filtered]);
  const prevCompleted = useMemo(() => countByStatus(prevRecords, "Completada"), [prevRecords]);
  const revenueDelta = useMemo(
    () => deltaPct(totalRevenue, prevRevenue),
    [totalRevenue, prevRevenue],
  );
  const apptsDelta = useMemo(
    () => deltaPct(completedCount, prevCompleted),
    [completedCount, prevCompleted],
  );

  const newClients = useMemo(() => {
    const from = toISODate(bounds.from);
    const to = toISODate(bounds.to);
    return clients.filter((c) => c.created_at && c.created_at >= from && c.created_at <= to).length;
  }, [clients, bounds]);

  const occupancyPct = useMemo(() => {
    const total = filtered.length;
    if (!total) return 0;
    return Math.round((completedCount / total) * 100);
  }, [filtered.length, completedCount]);

  const kpis = [
    {
      label:
        range === "week"
          ? "Ingresos semanales"
          : range === "month"
            ? "Ingresos del mes"
            : "Ingresos del año",
      value: formatMoney(totalRevenue),
      delta: revenueDelta === null ? null : revenueDelta,
      up: (revenueDelta ?? 0) >= 0,
      icon: DollarSign,
      hint: `vs. ${RANGE_LABEL[range].toLowerCase()} anterior`,
    },
    {
      label: "Citas atendidas",
      value: completedCount.toLocaleString("es-CO"),
      delta: apptsDelta,
      up: (apptsDelta ?? 0) >= 0,
      icon: Calendar,
      hint: `este ${RANGE_LABEL[range].toLowerCase()}`,
    },
    {
      label: "Clientes nuevos",
      value: newClients.toString(),
      delta: null,
      up: true,
      icon: Users,
      hint: "nuevos registros",
    },
    {
      label: "Tasa de ocupación",
      value: `${occupancyPct}%`,
      delta: null,
      up: true,
      icon: Percent,
      hint: "completadas / total del periodo",
    },
  ];

  const allServices = useMemo(() => [...new Set(records.map((r) => r.serviceName))], [records]);
  const allStaff = useMemo(() => staffList.map((s) => s.name), [staffList]);

  const activeFilterCount =
    (services.length !== allServices.length ? 1 : 0) +
    (staffSel.length !== allStaff.length ? 1 : 0) +
    (status !== "all" ? 1 : 0);

  function toggleArr(arr: string[], v: string, setter: (v: string[]) => void) {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }
  function resetFilters() {
    setServices(allServices);
    setStaffSel(allStaff);
    setStatus("all");
    toast.success("Filtros restablecidos");
  }

  const reportSections = () => {
    const lines: { heading: string; headers: string[]; rows: string[][] }[] = [];
    lines.push({
      heading: "Indicadores",
      headers: ["Indicador", "Valor", "Variación"],
      rows: kpis.map((k) => [
        k.label,
        k.value,
        k.delta === null ? "—" : `${k.up ? "+" : ""}${k.delta}%`,
      ]),
    });
    lines.push({
      heading: "Ingresos por periodo",
      headers: ["Periodo", "Ingresos"],
      rows: revenue.map((r) => [r.label, formatMoney(r.value)]),
    });
    lines.push({
      heading: "Citas por día de la semana",
      headers: ["Día", "Completadas", "Canceladas"],
      rows: apptsSeries.map((a) => [a.d, String(a.completadas), String(a.canceladas)]),
    });
    lines.push({
      heading: "Servicios más solicitados",
      headers: ["Servicio", "Citas"],
      rows: servicesTop.map((s) => [s.name, String(s.value)]),
    });
    lines.push({
      heading: "Ocupación por hora",
      headers: ["Hora", "Ocupación %"],
      rows: occupancy.map((o) => [`${o.h}:00`, `${o.ocupacion}%`]),
    });
    lines.push({
      heading: "Desempeño del equipo",
      headers: ["Miembro", "Citas", "Ingresos", "Rating"],
      rows: staffPerf.map((s) => [
        s.nombre,
        String(s.citas),
        formatMoney(s.ingresos),
        s.rating.toFixed(1),
      ]),
    });
    return lines;
  };

  function exportCSV() {
    setExporting("csv");
    const lines: string[] = [];
    lines.push(`Reporte de estadísticas - ${RANGE_LABEL[range]}`);
    lines.push("");
    lines.push("KPI,Valor,Variación");
    kpis.forEach((k) =>
      lines.push(`${k.label},${k.value},${k.delta === null ? "" : k.delta + "%"}`),
    );
    lines.push("");
    lines.push("Periodo,Ingresos");
    revenue.forEach((r) => lines.push(`${r.label},${r.value}`));
    lines.push("");
    lines.push("Día,Completadas,Canceladas");
    apptsSeries.forEach((a) => lines.push(`${a.d},${a.completadas},${a.canceladas}`));
    lines.push("");
    lines.push("Servicio,Citas");
    servicesTop.forEach((s) => lines.push(`${s.name},${s.value}`));
    lines.push("");
    lines.push("Hora,Ocupación %");
    occupancy.forEach((o) => lines.push(`${o.h},${o.ocupacion}`));
    lines.push("");
    lines.push("Miembro,Citas,Ingresos,Rating");
    staffPerf.forEach((s) => lines.push(`${s.nombre},${s.citas},${s.ingresos},${s.rating}`));

    setTimeout(() => {
      downloadCSV(`reporte-estadisticas-${range}-${Date.now()}.csv`, lines);
      setExporting(null);
      toast.success("Reporte CSV descargado");
    }, 300);
  }

  function exportPDF() {
    setExporting("pdf");
    const ok = printReportPDF({
      title: `Estadísticas ${RANGE_LABEL[range]}`,
      subtitle: `Datos del negocio${business ? ` — ${business.name}` : ""}`,
      businessName: business?.name ?? "Citaflex",
      sections: reportSections(),
    });
    setTimeout(() => {
      setExporting(null);
      if (ok) toast.success("Reporte listo para imprimir o guardar como PDF");
      else toast.error("El navegador bloqueó la ventana de impresión");
    }, 300);
  }

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const summaryCards = (() => {
    if (reportTab === "weekly") {
      return [
        {
          label: "Citas de la semana",
          value: countByStatus(records, "Completada").toString(),
          sub: `+${apptsDelta ?? 0}% vs anterior`,
        },
        {
          label: "Ingresos semanales",
          value: formatMoney(totalRevenue),
          sub: `+${revenueDelta ?? 0}% vs anterior`,
        },
        {
          label: "Clientes únicos",
          value: new Set(filtered.map((r) => r.clientId)).size.toString(),
          sub: `${newClients} nuevos`,
        },
        {
          label: "Cancelaciones",
          value: cancelledCount.toString(),
          sub: `${filtered.length ? Math.round((cancelledCount / filtered.length) * 100) : 0}% del total`,
        },
      ];
    }
    return [
      {
        label: "Citas del mes",
        value: countByStatus(records, "Completada").toString(),
        sub: `+${apptsDelta ?? 0}% vs anterior`,
      },
      {
        label: "Ingresos mensuales",
        value: formatMoney(totalRevenue),
        sub: `+${revenueDelta ?? 0}% vs anterior`,
      },
      {
        label: "Clientes únicos",
        value: new Set(filtered.map((r) => r.clientId)).size.toString(),
        sub: `${newClients} nuevos`,
      },
      {
        label: "Cancelaciones",
        value: cancelledCount.toString(),
        sub: `${filtered.length ? Math.round((cancelledCount / filtered.length) * 100) : 0}% del total`,
      },
    ];
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Estadísticas</h2>
          <p className="text-sm text-muted-foreground">
            Analiza el desempeño de tu negocio en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {(["week", "month", "year"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  range === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>

          {/* Filters popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">
                    Ajusta lo que se muestra en este periodo.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Estado de citas</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="completed">Solo completadas</SelectItem>
                      <SelectItem value="cancelled">Solo canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Servicios</Label>
                  <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
                    {allServices.map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={services.includes(s)}
                          onCheckedChange={() => toggleArr(services, s, setServices)}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Equipo</Label>
                  <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
                    {allStaff.map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={staffSel.includes(s)}
                          onCheckedChange={() => toggleArr(staffSel, s, setStaffSel)}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Restablecer
                  </Button>
                  <Button size="sm" onClick={() => toast.success("Filtros aplicados")}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={!!exporting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
              >
                <Download className={`h-4 w-4 ${exporting ? "animate-bounce" : ""}`} />
                <span className="hidden sm:inline">{exporting ? "Exportando..." : "Exportar"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Exportar reporte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Descargar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF}>
                <FileText className="mr-2 h-4 w-4" /> Imprimir / PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 transition group-hover:bg-primary/10" />
            <div className="relative flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <k.icon className="h-4 w-4" />
              </div>
              {k.delta !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    k.up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{" "}
                  {k.up ? "+" : ""}
                  {k.delta}%
                </span>
              )}
            </div>
            <p className="relative mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {k.label}
            </p>
            <p className="relative mt-1 font-display text-2xl font-bold">{k.value}</p>
            <p className="relative mt-0.5 text-xs text-muted-foreground">{k.hint}</p>
          </div>
        ))}
      </div>

      {/* Revenue + top services */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display font-semibold">
                {range === "week"
                  ? "Ingresos diarios"
                  : range === "month"
                    ? "Ingresos semanales"
                    : "Ingresos mensuales"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Total {RANGE_LABEL[range].toLowerCase()}:{" "}
                <span className="font-semibold text-foreground">{formatMoney(totalRevenue)}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Ingresos
              </span>
              {prevRevenue > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Periodo anterior
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1_000).toFixed(0)}K`
                  }
                />
                <Tooltip content={<ChartTooltip formatter={formatMoney} />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Ingresos"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#rev)"
                />
                {prevRevenue > 0 && (
                  <Line
                    type="monotone"
                    dataKey="prev"
                    name="Periodo anterior"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    data={revenue.map((r, i) => ({ ...r, prev: prevRevenue / revenue.length }))}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Servicios más solicitados</h3>
              <p className="text-xs text-muted-foreground">{RANGE_LABEL[range]} actual</p>
            </div>
          </div>

          <div className="mt-4 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={servicesTop}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {servicesTop.map((s, i) => (
                    <Cell key={i} fill={s.color} stroke="var(--card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 space-y-3">
            {servicesTop.length === 0 && (
              <li className="text-center text-xs text-muted-foreground">
                Sin servicios en el periodo
              </li>
            )}
            {servicesTop.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="font-medium">{s.name}</span>
                </div>
                <span className="text-muted-foreground">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Appointments + occupancy */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Citas por día de la semana</h3>
              <p className="text-xs text-muted-foreground">{RANGE_LABEL[range]} actual</p>
            </div>
            {apptsDelta !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                <ArrowUpRight className="h-3 w-3" /> +{apptsDelta}%
              </span>
            )}
          </div>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={apptsSeries} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="d"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar
                  dataKey="completadas"
                  name="Completadas"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="canceladas"
                  name="Canceladas"
                  fill="var(--destructive)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Ocupación por hora</h3>
              <p className="text-xs text-muted-foreground">Relativa al máximo del periodo (%)</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occupancy} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="occ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="h"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <Tooltip content={<ChartTooltip formatter={(v: number) => `${v}%`} />} />
                <Area
                  type="monotone"
                  dataKey="ocupacion"
                  name="Ocupación"
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  fill="url(#occ)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {(() => {
              const sorted = [...occupancy].sort((a, b) => b.ocupacion - a.ocupacion);
              const peak = sorted[0];
              const valley = sorted[sorted.length - 1];
              const avg = Math.round(
                occupancy.reduce((a, b) => a + b.ocupacion, 0) / occupancy.length,
              );
              return (
                <>
                  <div className="rounded-xl bg-accent/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Pico
                    </p>
                    <p className="mt-0.5 font-display text-base font-bold">{peak.h}:00</p>
                  </div>
                  <div className="rounded-xl bg-accent/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Promedio
                    </p>
                    <p className="mt-0.5 font-display text-base font-bold">{avg}%</p>
                  </div>
                  <div className="rounded-xl bg-accent/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Valle
                    </p>
                    <p className="mt-0.5 font-display text-base font-bold">{valley.h}:00</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Reports section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display font-semibold">Reportes</h3>
            <p className="text-xs text-muted-foreground">Resúmenes consolidados</p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            {(["weekly", "monthly"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setReportTab(t)}
                className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
                  reportTab === t
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "weekly" ? "Semanal" : "Mensual"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-background p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 font-display text-xl font-bold">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Status split + staff table */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div>
            <h4 className="text-sm font-semibold">Distribución por estado</h4>
            <div className="mt-3 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusData.map((s, i) => (
                      <Cell key={i} fill={s.color} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Desempeño del equipo</h4>
            </div>

            <div className="mt-3 hidden overflow-hidden rounded-xl border border-border md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Miembro</th>
                    <th className="px-4 py-2.5 text-right font-medium">Citas</th>
                    <th className="px-4 py-2.5 text-right font-medium">Ingresos</th>
                    <th className="px-4 py-2.5 text-right font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {staffPerf.map((s, i) => (
                    <tr key={s.nombre} className={i % 2 ? "bg-background" : "bg-card"}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {s.nombre
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <span className="font-medium">{s.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.citas}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatMoney(s.ingresos)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-warning-foreground">
                          <Star className="h-3.5 w-3.5 fill-current" /> {s.rating.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {staffPerf.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-muted-foreground"
                      >
                        Sin datos en el periodo
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid gap-3 md:hidden">
              {staffPerf.map((s) => (
                <div key={s.nombre} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {s.nombre
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{s.nombre}</p>
                        <p className="inline-flex items-center gap-1 text-xs text-warning-foreground">
                          <Star className="h-3 w-3 fill-current" /> {s.rating.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{formatMoney(s.ingresos)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.citas} citas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
