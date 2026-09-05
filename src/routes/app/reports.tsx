import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar,
  Users,
  Scissors,
  DollarSign,
  UserCheck,
  Download,
  FileText,
  FileSpreadsheet,
  Database,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  appointmentsSeries,
  statusSplit,
  topClients,
  servicePerformance,
  revenueByCategory,
  byStaff,
  countByStatus,
  sumRevenue,
  deltaPct,
  clientsSeries,
  type ApptRecord,
  type RangeKey,
} from "@/lib/analytics";

export const Route = createFileRoute("/app/reports")({ component: Reports });

type Period = "week" | "month" | "year";
type Source = "appointments" | "clients" | "services" | "revenue" | "staff";

const PERIOD_LABELS: Record<Period, string> = {
  week: "Semanal",
  month: "Mensual",
  year: "Anual",
};

const SOURCES: {
  id: Source;
  label: string;
  icon: typeof Calendar;
  description: string;
  table: string;
}[] = [
  {
    id: "appointments",
    label: "Citas",
    icon: Calendar,
    description: "Volumen, estado y tendencia de citas agendadas.",
    table: "public.appointments",
  },
  {
    id: "clients",
    label: "Clientes",
    icon: Users,
    description: "Nuevos clientes, recurrentes y retención.",
    table: "public.clients",
  },
  {
    id: "services",
    label: "Servicios",
    icon: Scissors,
    description: "Servicios más solicitados y rendimiento.",
    table: "public.appointments + services",
  },
  {
    id: "revenue",
    label: "Ingresos",
    icon: DollarSign,
    description: "Facturación, ticket promedio y categorías.",
    table: "public.appointments + services",
  },
  {
    id: "staff",
    label: "Personal",
    icon: UserCheck,
    description: "Productividad y satisfacción por colaborador.",
    table: "public.staff + appointments",
  },
];

const fmtNum = (n: number) => new Intl.NumberFormat("es-CO").format(n);

function Reports() {
  const { business, formatMoney } = useBusiness();
  const [period, setPeriod] = useState<Period>("month");
  const [source, setSource] = useState<Source>("appointments");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<null | "csv" | "pdf">(null);

  const [records, setRecords] = useState<ApptRecord[]>([]);
  const [prevRecords, setPrevRecords] = useState<ApptRecord[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string; rating: number }[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const b = rangeBounds(period);
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
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [period]);

  const bounds = useMemo(() => rangeBounds(period), [period]);

  const meta = SOURCES.find((s) => s.id === source)!;

  const revenue = useMemo(() => revenueSeries(records, period, bounds), [records, period, bounds]);
  const appts = useMemo(
    () => appointmentsSeries(records, period, bounds),
    [records, period, bounds],
  );
  const status = useMemo(() => statusSplit(records), [records]);
  const totalRevenue = useMemo(() => sumRevenue(records), [records]);
  const prevRevenue = useMemo(() => sumRevenue(prevRecords), [prevRecords]);
  const completed = useMemo(() => countByStatus(records, "Completada"), [records]);
  const cancelled = useMemo(() => countByStatus(records, "Cancelada"), [records]);
  const pending = useMemo(
    () => countByStatus(records, "Pendiente") + countByStatus(records, "Confirmada"),
    [records],
  );
  const prevCompleted = useMemo(() => countByStatus(prevRecords, "Completada"), [prevRecords]);
  const revenueDelta = useMemo(
    () => deltaPct(totalRevenue, prevRevenue),
    [totalRevenue, prevRevenue],
  );
  const apptsDelta = useMemo(() => deltaPct(completed, prevCompleted), [completed, prevCompleted]);

  const clientSeries = useMemo(
    () => clientsSeries(clients, records, period, bounds),
    [clients, records, period, bounds],
  );
  const topC = useMemo(() => topClients(records, 5), [records]);
  const svcPerf = useMemo(() => servicePerformance(records), [records]);
  const svcMix = useMemo(
    () =>
      svcPerf.slice(0, 5).map((s, i) => ({
        name: s.nombre,
        value: s.citas,
        color: `var(--chart-${(i % 5) + 1})`,
      })),
    [svcPerf],
  );
  const catMix = useMemo(() => revenueByCategory(records), [records]);
  const staffRows = useMemo(() => byStaff(records, staffList), [records, staffList]);

  const ticket = totalRevenue && completed ? Math.round(totalRevenue / completed) : 0;
  const topService = svcPerf[0];

  const csv = useMemo(() => {
    const header = `Reporte: ${meta.label}\nPeríodo: ${PERIOD_LABELS[period]}\nFuente: ${meta.table}\n\n`;
    if (source === "appointments") {
      const rows = [
        "Periodo,Agendadas,Canceladas",
        ...appts.map((a) => `${a.label},${a.completadas},${a.canceladas}`),
      ];
      return header + rows.join("\n");
    }
    if (source === "clients") {
      const rows = [
        "Periodo,Nuevos,Activos",
        ...clientSeries.map((s) => `${s.label},${s.value},${s.meta}`),
      ];
      return (
        header +
        rows.join("\n") +
        "\n\nTop clientes\nNombre,Visitas,Gasto\n" +
        topC.map((t) => `${t.nombre},${t.visitas},${t.gasto}`).join("\n")
      );
    }
    if (source === "services") {
      return (
        header +
        "Servicio,Citas,Ingresos\n" +
        svcPerf.map((p) => `${p.nombre},${p.citas},${p.ingresos}`).join("\n")
      );
    }
    if (source === "revenue") {
      const rows = ["Periodo,Ingresos", ...revenue.map((r) => `${r.label},${r.value}`)];
      return (
        header +
        rows.join("\n") +
        "\n\nPor categoría\nCategoría,Ingresos\n" +
        catMix.map((c) => `${c.name},${c.value}`).join("\n")
      );
    }
    return (
      header +
      "Colaborador,Citas,Ingresos,Rating\n" +
      staffRows.map((r) => `${r.nombre},${r.citas},${r.ingresos},${r.rating}`).join("\n")
    );
  }, [
    source,
    period,
    meta.label,
    meta.table,
    appts,
    clientSeries,
    topC,
    svcPerf,
    revenue,
    catMix,
    staffRows,
  ]);

  function exportCsv() {
    setExporting("csv");
    setTimeout(() => {
      downloadCSV(`reporte-${source}-${period}-${Date.now()}.csv`, csv.split("\n"));
      setExporting(null);
      toast.success("Reporte CSV descargado");
    }, 300);
  }

  function exportPdf() {
    setExporting("pdf");
    const sections: { heading: string; headers: string[]; rows: string[][] }[] = [];
    if (source === "appointments") {
      sections.push({
        heading: "Volumen de citas",
        headers: ["Periodo", "Agendadas", "Canceladas"],
        rows: appts.map((a) => [a.label, String(a.completadas), String(a.canceladas)]),
      });
      sections.push({
        heading: "Por estado",
        headers: ["Estado", "Citas"],
        rows: status.map((s) => [s.name, String(s.value)]),
      });
    } else if (source === "clients") {
      sections.push({
        heading: "Clientes por periodo",
        headers: ["Periodo", "Nuevos", "Activos"],
        rows: clientSeries.map((s) => [s.label, String(s.value), String(s.meta)]),
      });
      sections.push({
        heading: "Top clientes",
        headers: ["Cliente", "Visitas", "Gasto"],
        rows: topC.map((t) => [t.nombre, String(t.visitas), formatMoney(t.gasto)]),
      });
    } else if (source === "services") {
      sections.push({
        heading: "Rendimiento por servicio",
        headers: ["Servicio", "Citas", "Ingresos"],
        rows: svcPerf.map((p) => [p.nombre, String(p.citas), formatMoney(p.ingresos)]),
      });
    } else if (source === "revenue") {
      sections.push({
        heading: "Ingresos por periodo",
        headers: ["Periodo", "Ingresos"],
        rows: revenue.map((r) => [r.label, formatMoney(r.value)]),
      });
      sections.push({
        heading: "Por categoría",
        headers: ["Categoría", "Ingresos"],
        rows: catMix.map((c) => [c.name, formatMoney(c.value)]),
      });
    } else {
      sections.push({
        heading: "Productividad del equipo",
        headers: ["Colaborador", "Citas", "Ingresos", "Rating"],
        rows: staffRows.map((r) => [
          r.nombre,
          String(r.citas),
          formatMoney(r.ingresos),
          r.rating.toFixed(1),
        ]),
      });
    }
    const ok = printReportPDF({
      title: `Reporte ${meta.label} — ${PERIOD_LABELS[period]}`,
      subtitle: `Fuente: ${meta.table}`,
      businessName: business?.name ?? "Citaflex",
      sections,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Reportes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Genera reportes consolidados a partir de las fuentes operativas del negocio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="week">Semanal</TabsTrigger>
              <TabsTrigger value="month">Mensual</TabsTrigger>
              <TabsTrigger value="year">Anual</TabsTrigger>
            </TabsList>
          </Tabs>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2" disabled={!!exporting}>
                <Download className={`h-4 w-4 ${exporting ? "animate-bounce" : ""}`} />{" "}
                {exporting ? "Exportando..." : "Exportar"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Descargar reporte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCsv}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf}>
                <FileText className="mr-2 h-4 w-4" /> Imprimir / PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sources */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {SOURCES.map((s) => {
          const Icon = s.icon;
          const active = source === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className={`group rounded-xl border p-4 text-left transition-all ${
                active
                  ? "border-primary bg-gradient-primary text-primary-foreground shadow-elegant"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-semibold">{s.label}</span>
              </div>
              <p
                className={`mt-1.5 line-clamp-2 text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              >
                {s.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Source context bar */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          <span>
            Fuente de datos:{" "}
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              {meta.table}
            </code>
          </span>
        </div>
        <span className="text-muted-foreground">
          Período: <strong className="text-foreground">{PERIOD_LABELS[period]}</strong>
        </span>
      </div>

      {/* Report body */}
      {source === "appointments" && (
        <AppointmentsReport
          records={records}
          appts={appts}
          status={status}
          delta={apptsDelta}
          formatMoney={formatMoney}
        />
      )}
      {source === "clients" && (
        <ClientsReport
          series={clientSeries}
          top={topC}
          newTotal={clientSeries.reduce((a, b) => a + b.value, 0)}
          activeTotal={clientSeries.reduce((a, b) => a + b.meta, 0)}
          formatMoney={formatMoney}
        />
      )}
      {source === "services" && (
        <ServicesReport perf={svcPerf} mix={svcMix} formatMoney={formatMoney} />
      )}
      {source === "revenue" && (
        <RevenueReport
          series={revenue}
          mix={catMix}
          total={totalRevenue}
          prevTotal={prevRevenue}
          delta={revenueDelta}
          ticket={ticket}
          formatMoney={formatMoney}
        />
      )}
      {source === "staff" && <StaffReport rows={staffRows} formatMoney={formatMoney} />}
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  positive = true,
}: {
  label: string;
  value: string;
  delta?: number | null;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {typeof delta === "number" && (
        <div
          className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}
        >
          {positive ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {delta > 0 ? "+" : ""}
          {delta}% vs período anterior
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <header className="mb-4">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

const AXIS = { stroke: "var(--muted-foreground)", fontSize: 12 } as const;
const GRID = { strokeDasharray: "3 3", stroke: "var(--border)" } as const;
const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
} as const;

const LEGEND_STYLE = { fontSize: 12, paddingTop: 8 } as const;

/** Legend de pastel con el porcentaje de cada porción respecto al total. */
const legendWithPct = (total: number) => (_value: unknown, entry: unknown) => {
  const payload = (entry as { payload?: { value?: number } } | undefined)?.payload;
  const pct = total > 0 && payload?.value != null ? Math.round((payload.value / total) * 100) : 0;
  const label = typeof _value === "string" ? _value : String(_value ?? "");
  return `${label} · ${pct}%`;
};

type Money = (n: number) => string;

function AppointmentsReport({
  records,
  appts,
  status,
  delta,
  formatMoney,
}: {
  records: ApptRecord[];
  appts: ReturnType<typeof appointmentsSeries>;
  status: ReturnType<typeof statusSplit>;
  delta: number | null;
  formatMoney: Money;
}) {
  const completed = countByStatus(records, "Completada");
  const cancelled = countByStatus(records, "Cancelada");
  const pending = countByStatus(records, "Pendiente") + countByStatus(records, "Confirmada");
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total citas" value={fmtNum(records.length)} delta={delta} />
        <Kpi label="Completadas" value={fmtNum(completed)} />
        <Kpi label="Canceladas" value={fmtNum(cancelled)} delta={null} />
        <Kpi label="Pendientes / confirmadas" value={fmtNum(pending)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Volumen de citas" subtitle="Agendadas vs. canceladas">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={appts}>
                  <CartesianGrid {...GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    {...AXIS}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={14}
                    tickMargin={10}
                  />
                  <YAxis
                    {...AXIS}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                    formatter={(v) => `${v} citas`}
                  />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar
                    dataKey="completadas"
                    name="Agendadas"
                    fill="var(--chart-2)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="canceladas"
                    name="Canceladas"
                    fill="var(--chart-4)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <Panel title="Distribución por estado">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={status}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {status.map((s, i) => (
                    <Cell key={i} fill={s.color} stroke="var(--card)" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={LEGEND_STYLE}
                  formatter={legendWithPct(status.reduce((a, b) => a + b.value, 0))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}

function ClientsReport({
  series,
  top,
  newTotal,
  activeTotal,
  formatMoney,
}: {
  series: ReturnType<typeof clientsSeries>;
  top: ReturnType<typeof topClients>;
  newTotal: number;
  activeTotal: number;
  formatMoney: Money;
}) {
  const retencion = activeTotal
    ? Math.round((top.reduce((a, b) => a + b.visitas, 0) / activeTotal) * 100)
    : 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Nuevos clientes" value={fmtNum(newTotal)} />
        <Kpi label="Clientes activos" value={fmtNum(activeTotal)} />
        <Kpi label="Retención estimada" value={`${retencion}%`} />
        <Kpi label="Top por gasto" value={top[0]?.nombre ?? "—"} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Adquisición y base activa">
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid {...GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    {...AXIS}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={14}
                    tickMargin={10}
                  />
                  <YAxis
                    {...AXIS}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Nuevos"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="meta"
                    name="Activos"
                    stroke="var(--chart-2)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <Panel title="Top clientes" subtitle="Por gasto del período">
          <ul className="space-y-3">
            {top.length === 0 && (
              <li className="text-center text-xs text-muted-foreground">Sin datos en el período</li>
            )}
            {top.map((t) => (
              <li
                key={t.nombre}
                className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{t.nombre}</p>
                  <p className="text-xs text-muted-foreground">{t.visitas} visitas</p>
                </div>
                <span className="text-sm font-semibold">{formatMoney(t.gasto)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function ServicesReport({
  perf,
  mix,
  formatMoney,
}: {
  perf: ReturnType<typeof servicePerformance>;
  mix: ReturnType<typeof revenueByCategory>;
  formatMoney: Money;
}) {
  const top = perf[0];
  const totalCitas = perf.reduce((a, b) => a + b.citas, 0);
  const ticket = totalCitas ? Math.round(perf.reduce((a, b) => a + b.ingresos, 0) / totalCitas) : 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Servicio top" value={top?.nombre ?? "—"} />
        <Kpi label="Citas servicio top" value={fmtNum(top?.citas ?? 0)} />
        <Kpi label="Ticket promedio" value={formatMoney(ticket)} />
        <Kpi label="Servicios activos" value={`${perf.length}`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Mix de servicios">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={mix} dataKey="value" nameKey="name" outerRadius={95} paddingAngle={2}>
                  {mix.map((s, i) => (
                    <Cell key={i} fill={s.color} stroke="var(--card)" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={LEGEND_STYLE}
                  formatter={legendWithPct(mix.reduce((a, b) => a + b.value, 0))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <div className="lg:col-span-2">
          <Panel title="Rendimiento por servicio">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-right">Citas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">% del total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perf.map((p) => (
                    <TableRow key={p.nombre}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-right">{fmtNum(p.citas)}</TableCell>
                      <TableCell className="text-right">{formatMoney(p.ingresos)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {totalCitas ? Math.round((p.citas / totalCitas) * 100) : 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function RevenueReport({
  series,
  mix,
  total,
  prevTotal,
  delta,
  ticket,
  formatMoney,
}: {
  series: ReturnType<typeof revenueSeries>;
  mix: ReturnType<typeof revenueByCategory>;
  total: number;
  prevTotal: number;
  delta: number | null;
  ticket: number;
  formatMoney: Money;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Ingresos" value={formatMoney(total)} delta={delta} />
        <Kpi label="Período anterior" value={formatMoney(prevTotal)} />
        <Kpi label="Ticket promedio" value={formatMoney(ticket)} />
        <Kpi label="Categorías" value={`${mix.length}`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Ingresos por período">
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    {...AXIS}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={14}
                    tickMargin={10}
                  />
                  <YAxis
                    {...AXIS}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatMoney(v)} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Ingresos"
                    stroke="var(--chart-1)"
                    fill="url(#rev)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <Panel title="Ingresos por categoría">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={mix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {mix.map((s, i) => (
                    <Cell key={i} fill={s.color} stroke="var(--card)" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatMoney(v)} />
                <Legend
                  wrapperStyle={LEGEND_STYLE}
                  formatter={legendWithPct(mix.reduce((a, b) => a + b.value, 0))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}

function StaffReport({
  rows,
  formatMoney,
}: {
  rows: ReturnType<typeof byStaff>;
  formatMoney: Money;
}) {
  const top = rows[0];
  const avgRating = rows.length ? rows.reduce((a, b) => a + b.rating, 0) / rows.length : 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Top colaborador" value={top?.nombre ?? "—"} />
        <Kpi label="Ingresos top" value={formatMoney(top?.ingresos ?? 0)} />
        <Kpi label="Rating promedio" value={`${avgRating.toFixed(1)} ★`} />
        <Kpi label="Equipo activo" value={`${rows.length}`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Ingresos por colaborador">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={rows} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid {...GRID} horizontal={false} />
                <XAxis
                  type="number"
                  {...AXIS}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  {...AXIS}
                  width={120}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="ingresos" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Productividad del equipo">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="text-right">Citas</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.nombre}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell className="text-right">{fmtNum(r.citas)}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.ingresos)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{r.rating.toFixed(1)} ★</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>
    </>
  );
}
