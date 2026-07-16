import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  LineChart,
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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/app/statistics")({ component: Statistics });

type Range = "week" | "month" | "year";

// ─── Mock datasets per range ──────────────────────────────────────────────
const DATASETS: Record<
  Range,
  {
    kpis: { revenue: number; revenueDelta: number; appts: number; apptsDelta: number; clients: number; clientsDelta: number; occupancy: number; occupancyDelta: number };
    revenue: { m: string; ingresos: number; meta: number }[];
    appointments: { d: string; completadas: number; canceladas: number }[];
    services: { name: string; value: number; color: string }[];
    occupancy: { h: string; ocupacion: number }[];
    summary: { label: string; value: string; sub: string }[];
    staff: { nombre: string; citas: number; ingresos: number; rating: number }[];
  }
> = {
  week: {
    kpis: { revenue: 1_120_000, revenueDelta: 12, appts: 168, apptsDelta: 9, clients: 21, clientsDelta: 4, occupancy: 74, occupancyDelta: 3.2 },
    revenue: [
      { m: "Lun", ingresos: 142_000, meta: 160_000 },
      { m: "Mar", ingresos: 168_000, meta: 160_000 },
      { m: "Mié", ingresos: 195_000, meta: 170_000 },
      { m: "Jue", ingresos: 178_000, meta: 170_000 },
      { m: "Vie", ingresos: 232_000, meta: 200_000 },
      { m: "Sáb", ingresos: 260_000, meta: 220_000 },
      { m: "Dom", ingresos: 95_000, meta: 120_000 },
    ],
    appointments: [
      { d: "Lun", completadas: 22, canceladas: 2 },
      { d: "Mar", completadas: 26, canceladas: 3 },
      { d: "Mié", completadas: 28, canceladas: 4 },
      { d: "Jue", completadas: 24, canceladas: 2 },
      { d: "Vie", completadas: 34, canceladas: 5 },
      { d: "Sáb", completadas: 38, canceladas: 3 },
      { d: "Dom", completadas: 12, canceladas: 1 },
    ],
    services: [
      { name: "Corte + Tinte", value: 28, color: "var(--chart-1)" },
      { name: "Manicure", value: 22, color: "var(--chart-2)" },
      { name: "Barba clásica", value: 18, color: "var(--chart-3)" },
      { name: "Limpieza facial", value: 14, color: "var(--chart-4)" },
      { name: "Masaje relajante", value: 9, color: "var(--chart-5)" },
    ],
    occupancy: [
      { h: "08", ocupacion: 18 }, { h: "09", ocupacion: 42 }, { h: "10", ocupacion: 65 },
      { h: "11", ocupacion: 78 }, { h: "12", ocupacion: 60 }, { h: "13", ocupacion: 36 },
      { h: "14", ocupacion: 54 }, { h: "15", ocupacion: 74 }, { h: "16", ocupacion: 85 },
      { h: "17", ocupacion: 90 }, { h: "18", ocupacion: 72 }, { h: "19", ocupacion: 38 },
    ],
    summary: [
      { label: "Citas esta semana", value: "168", sub: "+9% vs semana anterior" },
      { label: "Ingresos semanales", value: "$1.120.000", sub: "+12% vs semana anterior" },
      { label: "Clientes únicos", value: "94", sub: "21 nuevos" },
      { label: "Cancelaciones", value: "11", sub: "6.5% del total" },
    ],
    staff: [
      { nombre: "María G.", citas: 22, ingresos: 320_000, rating: 4.9 },
      { nombre: "Carlos R.", citas: 18, ingresos: 260_000, rating: 4.8 },
      { nombre: "Laura M.", citas: 15, ingresos: 230_000, rating: 4.7 },
      { nombre: "Andrés P.", citas: 12, ingresos: 180_000, rating: 4.6 },
    ],
  },
  month: {
    kpis: { revenue: 4_250_000, revenueDelta: 8.4, appts: 312, apptsDelta: 12, clients: 28, clientsDelta: 6, occupancy: 78, occupancyDelta: 4.1 },
    revenue: [
      { m: "S1", ingresos: 980_000, meta: 1_000_000 },
      { m: "S2", ingresos: 1_050_000, meta: 1_050_000 },
      { m: "S3", ingresos: 1_120_000, meta: 1_100_000 },
      { m: "S4", ingresos: 1_100_000, meta: 1_100_000 },
    ],
    appointments: [
      { d: "Lun", completadas: 38, canceladas: 4 },
      { d: "Mar", completadas: 42, canceladas: 3 },
      { d: "Mié", completadas: 51, canceladas: 6 },
      { d: "Jue", completadas: 46, canceladas: 5 },
      { d: "Vie", completadas: 62, canceladas: 7 },
      { d: "Sáb", completadas: 71, canceladas: 4 },
      { d: "Dom", completadas: 22, canceladas: 2 },
    ],
    services: [
      { name: "Corte + Tinte", value: 92, color: "var(--chart-1)" },
      { name: "Manicure", value: 78, color: "var(--chart-2)" },
      { name: "Barba clásica", value: 64, color: "var(--chart-3)" },
      { name: "Limpieza facial", value: 51, color: "var(--chart-4)" },
      { name: "Masaje relajante", value: 37, color: "var(--chart-5)" },
    ],
    occupancy: [
      { h: "08", ocupacion: 22 }, { h: "09", ocupacion: 48 }, { h: "10", ocupacion: 71 },
      { h: "11", ocupacion: 82 }, { h: "12", ocupacion: 64 }, { h: "13", ocupacion: 39 },
      { h: "14", ocupacion: 58 }, { h: "15", ocupacion: 79 }, { h: "16", ocupacion: 88 },
      { h: "17", ocupacion: 92 }, { h: "18", ocupacion: 76 }, { h: "19", ocupacion: 41 },
    ],
    summary: [
      { label: "Citas del mes", value: "312", sub: "+12% vs mes anterior" },
      { label: "Ingresos mensuales", value: "$4.250.000", sub: "+8.4% vs mes anterior" },
      { label: "Clientes únicos", value: "248", sub: "28 nuevos" },
      { label: "Cancelaciones", value: "31", sub: "9.0% del total" },
    ],
    staff: [
      { nombre: "María G.", citas: 84, ingresos: 1_280_000, rating: 4.9 },
      { nombre: "Carlos R.", citas: 71, ingresos: 1_050_000, rating: 4.8 },
      { nombre: "Laura M.", citas: 63, ingresos: 940_000, rating: 4.7 },
      { nombre: "Andrés P.", citas: 52, ingresos: 780_000, rating: 4.6 },
    ],
  },
  year: {
    kpis: { revenue: 45_030_000, revenueDelta: 18.2, appts: 3_640, apptsDelta: 15, clients: 412, clientsDelta: 96, occupancy: 81, occupancyDelta: 6.4 },
    revenue: [
      { m: "Ene", ingresos: 2_800_000, meta: 3_000_000 },
      { m: "Feb", ingresos: 3_100_000, meta: 3_000_000 },
      { m: "Mar", ingresos: 2_950_000, meta: 3_200_000 },
      { m: "Abr", ingresos: 3_400_000, meta: 3_200_000 },
      { m: "May", ingresos: 3_650_000, meta: 3_400_000 },
      { m: "Jun", ingresos: 3_900_000, meta: 3_500_000 },
      { m: "Jul", ingresos: 3_750_000, meta: 3_600_000 },
      { m: "Ago", ingresos: 4_100_000, meta: 3_800_000 },
      { m: "Sep", ingresos: 3_980_000, meta: 3_800_000 },
      { m: "Oct", ingresos: 4_250_000, meta: 4_000_000 },
      { m: "Nov", ingresos: 4_400_000, meta: 4_100_000 },
      { m: "Dic", ingresos: 4_750_000, meta: 4_300_000 },
    ],
    appointments: [
      { d: "Q1", completadas: 820, canceladas: 71 },
      { d: "Q2", completadas: 910, canceladas: 64 },
      { d: "Q3", completadas: 940, canceladas: 78 },
      { d: "Q4", completadas: 970, canceladas: 82 },
    ],
    services: [
      { name: "Corte + Tinte", value: 1_120, color: "var(--chart-1)" },
      { name: "Manicure", value: 940, color: "var(--chart-2)" },
      { name: "Barba clásica", value: 760, color: "var(--chart-3)" },
      { name: "Limpieza facial", value: 612, color: "var(--chart-4)" },
      { name: "Masaje relajante", value: 448, color: "var(--chart-5)" },
    ],
    occupancy: [
      { h: "08", ocupacion: 28 }, { h: "09", ocupacion: 54 }, { h: "10", ocupacion: 76 },
      { h: "11", ocupacion: 86 }, { h: "12", ocupacion: 68 }, { h: "13", ocupacion: 42 },
      { h: "14", ocupacion: 62 }, { h: "15", ocupacion: 83 }, { h: "16", ocupacion: 91 },
      { h: "17", ocupacion: 94 }, { h: "18", ocupacion: 80 }, { h: "19", ocupacion: 46 },
    ],
    summary: [
      { label: "Citas del año", value: "3.640", sub: "+15% vs año anterior" },
      { label: "Ingresos anuales", value: "$45.030.000", sub: "+18.2% vs año anterior" },
      { label: "Clientes únicos", value: "1.482", sub: "412 nuevos" },
      { label: "Cancelaciones", value: "295", sub: "8.1% del total" },
    ],
    staff: [
      { nombre: "María G.", citas: 980, ingresos: 14_800_000, rating: 4.9 },
      { nombre: "Carlos R.", citas: 842, ingresos: 12_400_000, rating: 4.8 },
      { nombre: "Laura M.", citas: 736, ingresos: 10_900_000, rating: 4.7 },
      { nombre: "Andrés P.", citas: 612, ingresos: 9_100_000, rating: 4.6 },
    ],
  },
};

const RANGE_LABEL: Record<Range, string> = { week: "Semana", month: "Mes", year: "Año" };
const ALL_SERVICES = ["Corte + Tinte", "Manicure", "Barba clásica", "Limpieza facial", "Masaje relajante"];
const ALL_STAFF = ["María G.", "Carlos R.", "Laura M.", "Andrés P."];

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium text-foreground">{formatter ? formatter(p.value) : p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Statistics() {
  const [range, setRange] = useState<Range>("month");
  const [reportTab, setReportTab] = useState<"weekly" | "monthly">("weekly");

  // Filters
  const [services, setServices] = useState<string[]>(ALL_SERVICES);
  const [staff, setStaff] = useState<string[]>(ALL_STAFF);
  const [status, setStatus] = useState<"all" | "completed" | "cancelled">("all");
  const [exporting, setExporting] = useState<null | "csv" | "pdf">(null);

  const data = DATASETS[range];

  const filteredServices = useMemo(
    () => data.services.filter((s) => services.includes(s.name)),
    [data.services, services],
  );
  const filteredStaff = useMemo(
    () => data.staff.filter((s) => staff.includes(s.nombre)),
    [data.staff, staff],
  );
  const filteredAppointments = useMemo(() => {
    if (status === "completed")
      return data.appointments.map((a) => ({ ...a, canceladas: 0 }));
    if (status === "cancelled")
      return data.appointments.map((a) => ({ ...a, completadas: 0 }));
    return data.appointments;
  }, [data.appointments, status]);

  const totalRevenue = useMemo(
    () => data.revenue.reduce((a, b) => a + b.ingresos, 0),
    [data.revenue],
  );

  const kpis = [
    {
      label: range === "week" ? "Ingresos semanales" : range === "month" ? "Ingresos del mes" : "Ingresos del año",
      value: COP(data.kpis.revenue), delta: `+${data.kpis.revenueDelta}%`, up: true, icon: DollarSign,
      hint: `vs. ${RANGE_LABEL[range].toLowerCase()} anterior`,
    },
    {
      label: "Citas atendidas", value: data.kpis.appts.toLocaleString("es-CO"),
      delta: `+${data.kpis.apptsDelta}%`, up: true, icon: Calendar, hint: `este ${RANGE_LABEL[range].toLowerCase()}`,
    },
    {
      label: "Clientes nuevos", value: data.kpis.clients.toString(),
      delta: `+${data.kpis.clientsDelta}`, up: true, icon: Users, hint: "nuevos registros",
    },
    {
      label: "Tasa de ocupación", value: `${data.kpis.occupancy}%`,
      delta: `+${data.kpis.occupancyDelta}%`, up: true, icon: Percent, hint: "promedio del periodo",
    },
  ];

  const activeFilterCount =
    (services.length !== ALL_SERVICES.length ? 1 : 0) +
    (staff.length !== ALL_STAFF.length ? 1 : 0) +
    (status !== "all" ? 1 : 0);

  function toggleArr(arr: string[], v: string, setter: (v: string[]) => void) {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }
  function resetFilters() {
    setServices(ALL_SERVICES);
    setStaff(ALL_STAFF);
    setStatus("all");
    toast.success("Filtros restablecidos");
  }

  function triggerDownload(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportCSV() {
    setExporting("csv");
    const lines: string[] = [];
    lines.push(`Reporte de estadísticas - ${RANGE_LABEL[range]}`);
    lines.push("");
    lines.push("KPI,Valor,Variación");
    kpis.forEach((k) => lines.push(`${k.label},${k.value},${k.delta}`));
    lines.push("");
    lines.push("Periodo,Ingresos,Meta");
    data.revenue.forEach((r) => lines.push(`${r.m},${r.ingresos},${r.meta}`));
    lines.push("");
    lines.push("Día,Completadas,Canceladas");
    filteredAppointments.forEach((a) => lines.push(`${a.d},${a.completadas},${a.canceladas}`));
    lines.push("");
    lines.push("Servicio,Solicitudes");
    filteredServices.forEach((s) => lines.push(`${s.name},${s.value}`));
    lines.push("");
    lines.push("Hora,Ocupación %");
    data.occupancy.forEach((o) => lines.push(`${o.h},${o.ocupacion}`));
    lines.push("");
    lines.push("Miembro,Citas,Ingresos,Rating");
    filteredStaff.forEach((s) => lines.push(`${s.nombre},${s.citas},${s.ingresos},${s.rating}`));

    setTimeout(() => {
      triggerDownload(`reporte-${range}-${Date.now()}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
      setExporting(null);
      toast.success("Reporte CSV descargado");
    }, 600);
  }

  function exportPDF() {
    setExporting("pdf");
    // Mock PDF: a minimal valid PDF document with text content.
    const text = `Reporte ${RANGE_LABEL[range]} - Citaflex\nIngresos: ${COP(data.kpis.revenue)}\nCitas: ${data.kpis.appts}\nOcupación: ${data.kpis.occupancy}%`;
    const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${text.length + 60}>>stream
BT /F1 14 Tf 50 740 Td (${text.replace(/\n/g, ") Tj 0 -20 Td (")}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
trailer<</Size 6/Root 1 0 R>>
%%EOF`;
    setTimeout(() => {
      triggerDownload(`reporte-${range}-${Date.now()}.pdf`, pdf, "application/pdf");
      setExporting(null);
      toast.success("Reporte PDF descargado");
    }, 600);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Estadísticas (DEMO)</h2>
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
                  <p className="text-xs text-muted-foreground">Ajusta lo que se muestra en este periodo.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Estado de citas</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
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
                    {ALL_SERVICES.map((s) => (
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
                  <div className="space-y-1.5">
                    {ALL_STAFF.map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={staff.includes(s)}
                          onCheckedChange={() => toggleArr(staff, s, setStaff)}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" size="sm" onClick={resetFilters}>Restablecer</Button>
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
                <FileText className="mr-2 h-4 w-4" /> Descargar PDF
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
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  k.up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}
              >
                {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{" "}
                {k.delta}
              </span>
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
                {range === "week" ? "Ingresos diarios" : range === "month" ? "Ingresos semanales" : "Ingresos mensuales"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Total {RANGE_LABEL[range].toLowerCase()}:{" "}
                <span className="font-semibold text-foreground">{COP(totalRevenue)}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Ingresos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Meta
              </span>
            </div>
          </div>

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenue} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1_000).toFixed(0)}K`)}
                />
                <Tooltip content={<ChartTooltip formatter={COP} />} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  name="Ingresos"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#rev)"
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  name="Meta"
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                />
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
                  data={filteredServices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {filteredServices.map((s, i) => (
                    <Cell key={i} fill={s.color} stroke="var(--card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 space-y-3">
            {filteredServices.length === 0 && (
              <li className="text-center text-xs text-muted-foreground">Sin servicios seleccionados</li>
            )}
            {filteredServices.map((s) => (
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
              <h3 className="font-display font-semibold">Citas por periodo</h3>
              <p className="text-xs text-muted-foreground">{RANGE_LABEL[range]} actual</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
              <ArrowUpRight className="h-3 w-3" /> +{data.kpis.apptsDelta}%
            </span>
          </div>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredAppointments} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar dataKey="completadas" name="Completadas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="canceladas" name="Canceladas" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Ocupación por hora</h3>
              <p className="text-xs text-muted-foreground">Promedio del periodo (%)</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.occupancy} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="occ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="h" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
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
              const sorted = [...data.occupancy].sort((a, b) => b.ocupacion - a.ocupacion);
              const peak = sorted[0];
              const valley = sorted[sorted.length - 1];
              const avg = Math.round(data.occupancy.reduce((a, b) => a + b.ocupacion, 0) / data.occupancy.length);
              return (
                <>
                  <div className="rounded-xl bg-accent/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pico</p>
                    <p className="mt-0.5 font-display text-base font-bold">{peak.h}:00</p>
                  </div>
                  <div className="rounded-xl bg-accent/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Promedio</p>
                    <p className="mt-0.5 font-display text-base font-bold">{avg}%</p>
                  </div>
                  <div className="rounded-xl bg-accent/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valle</p>
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
          {(reportTab === "weekly" ? DATASETS.week.summary : DATASETS.month.summary).map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-background p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 font-display text-xl font-bold">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Staff performance table */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Desempeño del equipo</h4>
            <button
              onClick={() => toast.info("Vista detallada del equipo próximamente")}
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver todo
            </button>
          </div>

          {/* Desktop table */}
          <div className="mt-3 hidden overflow-hidden rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Miembro</th>
                  <th className="px-4 py-2.5 text-right font-medium">Citas</th>
                  <th className="px-4 py-2.5 text-right font-medium">Ingresos</th>
                  <th className="px-4 py-2.5 text-right font-medium">Rating</th>
                  <th className="px-4 py-2.5 text-right font-medium">Carga</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((s, i) => {
                  const max = filteredStaff[0]?.citas ?? 1;
                  const pct = Math.round((s.citas / max) * 100);
                  return (
                    <tr key={s.nombre} className={i % 2 ? "bg-background" : "bg-card"}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {s.nombre.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="font-medium">{s.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.citas}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{COP(s.ingresos)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-warning-foreground">
                          <Star className="h-3.5 w-3.5 fill-current" /> {s.rating}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="ml-auto flex w-32 items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-chart-5"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredStaff.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">Sin miembros seleccionados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-3 grid gap-3 md:hidden">
            {filteredStaff.map((s) => (
              <div key={s.nombre} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {s.nombre.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{s.nombre}</p>
                      <p className="inline-flex items-center gap-1 text-xs text-warning-foreground">
                        <Star className="h-3 w-3 fill-current" /> {s.rating}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{COP(s.ingresos)}</span>
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
  );
}
