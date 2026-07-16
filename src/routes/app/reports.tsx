import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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

export const Route = createFileRoute("/app/reports")({ component: Reports });

type Period = "week" | "month" | "year";
type Source = "appointments" | "clients" | "services" | "revenue" | "staff";

const PERIOD_LABELS: Record<Period, string> = {
  week: "Semanal",
  month: "Mensual",
  year: "Anual",
};

const SOURCES: { id: Source; label: string; icon: typeof Calendar; description: string; table: string }[] = [
  { id: "appointments", label: "Citas", icon: Calendar, description: "Volumen, estado y tendencia de citas agendadas.", table: "public.appointments" },
  { id: "clients", label: "Clientes", icon: Users, description: "Nuevos clientes, recurrentes y retención.", table: "public.clients" },
  { id: "services", label: "Servicios", icon: Scissors, description: "Servicios más solicitados y rendimiento.", table: "public.services + appointments" },
  { id: "revenue", label: "Ingresos", icon: DollarSign, description: "Facturación, ticket promedio y meta.", table: "public.payments" },
  { id: "staff", label: "Personal", icon: UserCheck, description: "Productividad y satisfacción por colaborador.", table: "public.staff + appointments" },
];

// ─── Mock data per source × period ─────────────────────────────────────────
type SeriesPoint = { label: string; value: number; meta?: number; extra?: number };

const APPOINTMENTS: Record<Period, { kpi: { total: number; completadas: number; canceladas: number; noShow: number; delta: number }; series: SeriesPoint[]; status: { name: string; value: number; color: string }[] }> = {
  week: {
    kpi: { total: 168, completadas: 142, canceladas: 18, noShow: 8, delta: 9.2 },
    series: [
      { label: "Lun", value: 22, extra: 3 },
      { label: "Mar", value: 26, extra: 2 },
      { label: "Mié", value: 31, extra: 4 },
      { label: "Jue", value: 28, extra: 2 },
      { label: "Vie", value: 34, extra: 5 },
      { label: "Sáb", value: 21, extra: 1 },
      { label: "Dom", value: 6, extra: 1 },
    ],
    status: [
      { name: "Completadas", value: 142, color: "hsl(var(--chart-2))" },
      { name: "Canceladas", value: 18, color: "hsl(var(--chart-4))" },
      { name: "No-show", value: 8, color: "hsl(var(--chart-5))" },
    ],
  },
  month: {
    kpi: { total: 712, completadas: 612, canceladas: 64, noShow: 36, delta: 14.5 },
    series: Array.from({ length: 4 }, (_, i) => ({ label: `Sem ${i + 1}`, value: [168, 182, 174, 188][i], extra: [16, 18, 14, 16][i] })),
    status: [
      { name: "Completadas", value: 612, color: "hsl(var(--chart-2))" },
      { name: "Canceladas", value: 64, color: "hsl(var(--chart-4))" },
      { name: "No-show", value: 36, color: "hsl(var(--chart-5))" },
    ],
  },
  year: {
    kpi: { total: 8420, completadas: 7240, canceladas: 760, noShow: 420, delta: 22.1 },
    series: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m, i) => ({
      label: m,
      value: [612, 588, 640, 680, 705, 712, 730, 745, 690, 715, 730, 873][i],
      extra: [42, 36, 48, 52, 55, 58, 62, 60, 50, 52, 58, 67][i],
    })),
    status: [
      { name: "Completadas", value: 7240, color: "hsl(var(--chart-2))" },
      { name: "Canceladas", value: 760, color: "hsl(var(--chart-4))" },
      { name: "No-show", value: 420, color: "hsl(var(--chart-5))" },
    ],
  },
};

const CLIENTS: Record<Period, { kpi: { total: number; nuevos: number; recurrentes: number; retencion: number; delta: number }; series: SeriesPoint[]; top: { nombre: string; visitas: number; gasto: number }[] }> = {
  week: {
    kpi: { total: 21, nuevos: 14, recurrentes: 128, retencion: 62, delta: 4.1 },
    series: [
      { label: "Lun", value: 3, meta: 12 },
      { label: "Mar", value: 2, meta: 14 },
      { label: "Mié", value: 4, meta: 18 },
      { label: "Jue", value: 1, meta: 16 },
      { label: "Vie", value: 3, meta: 22 },
      { label: "Sáb", value: 1, meta: 19 },
      { label: "Dom", value: 0, meta: 5 },
    ],
    top: [
      { nombre: "Camila Torres", visitas: 3, gasto: 180_000 },
      { nombre: "Sofía Méndez", visitas: 2, gasto: 142_000 },
      { nombre: "Lucía Pérez", visitas: 2, gasto: 128_000 },
    ],
  },
  month: {
    kpi: { total: 96, nuevos: 62, recurrentes: 410, retencion: 68, delta: 8.7 },
    series: Array.from({ length: 4 }, (_, i) => ({ label: `Sem ${i + 1}`, value: [14, 18, 16, 14][i], meta: [88, 102, 96, 124][i] })),
    top: [
      { nombre: "Camila Torres", visitas: 11, gasto: 620_000 },
      { nombre: "Sofía Méndez", visitas: 9, gasto: 540_000 },
      { nombre: "Andrea Gil", visitas: 8, gasto: 480_000 },
      { nombre: "Lucía Pérez", visitas: 8, gasto: 462_000 },
    ],
  },
  year: {
    kpi: { total: 1284, nuevos: 842, recurrentes: 442, retencion: 71, delta: 18.4 },
    series: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m, i) => ({
      label: m,
      value: [58, 62, 70, 74, 80, 78, 82, 76, 64, 70, 74, 154][i],
      meta: [320, 340, 360, 380, 400, 410, 420, 425, 390, 405, 412, 460][i],
    })),
    top: [
      { nombre: "Camila Torres", visitas: 42, gasto: 2_410_000 },
      { nombre: "Sofía Méndez", visitas: 36, gasto: 2_080_000 },
      { nombre: "Andrea Gil", visitas: 33, gasto: 1_920_000 },
      { nombre: "Valeria Ríos", visitas: 31, gasto: 1_780_000 },
      { nombre: "Lucía Pérez", visitas: 29, gasto: 1_650_000 },
    ],
  },
};

const SERVICES: Record<Period, { kpi: { topService: string; topCount: number; ticket: number; delta: number }; mix: { name: string; value: number; color: string }[]; perf: { nombre: string; citas: number; ingresos: number; rating: number }[] }> = {
  week: {
    kpi: { topService: "Corte + Peinado", topCount: 48, ticket: 64_800, delta: 3.4 },
    mix: [
      { name: "Corte + Peinado", value: 48, color: "hsl(var(--chart-1))" },
      { name: "Coloración", value: 32, color: "hsl(var(--chart-2))" },
      { name: "Manicure", value: 28, color: "hsl(var(--chart-3))" },
      { name: "Tratamiento", value: 22, color: "hsl(var(--chart-4))" },
      { name: "Maquillaje", value: 14, color: "hsl(var(--chart-5))" },
    ],
    perf: [
      { nombre: "Corte + Peinado", citas: 48, ingresos: 1_920_000, rating: 4.8 },
      { nombre: "Coloración", citas: 32, ingresos: 2_560_000, rating: 4.7 },
      { nombre: "Manicure", citas: 28, ingresos: 840_000, rating: 4.9 },
      { nombre: "Tratamiento", citas: 22, ingresos: 1_540_000, rating: 4.6 },
      { nombre: "Maquillaje", citas: 14, ingresos: 980_000, rating: 4.8 },
    ],
  },
  month: {
    kpi: { topService: "Coloración", topCount: 184, ticket: 68_200, delta: 6.1 },
    mix: [
      { name: "Corte + Peinado", value: 210, color: "hsl(var(--chart-1))" },
      { name: "Coloración", value: 184, color: "hsl(var(--chart-2))" },
      { name: "Manicure", value: 142, color: "hsl(var(--chart-3))" },
      { name: "Tratamiento", value: 96, color: "hsl(var(--chart-4))" },
      { name: "Maquillaje", value: 80, color: "hsl(var(--chart-5))" },
    ],
    perf: [
      { nombre: "Coloración", citas: 184, ingresos: 14_720_000, rating: 4.8 },
      { nombre: "Corte + Peinado", citas: 210, ingresos: 8_400_000, rating: 4.7 },
      { nombre: "Tratamiento", citas: 96, ingresos: 6_720_000, rating: 4.7 },
      { nombre: "Maquillaje", citas: 80, ingresos: 5_600_000, rating: 4.8 },
      { nombre: "Manicure", citas: 142, ingresos: 4_260_000, rating: 4.9 },
    ],
  },
  year: {
    kpi: { topService: "Coloración", topCount: 2180, ticket: 71_500, delta: 11.8 },
    mix: [
      { name: "Coloración", value: 2180, color: "hsl(var(--chart-2))" },
      { name: "Corte + Peinado", value: 2450, color: "hsl(var(--chart-1))" },
      { name: "Manicure", value: 1680, color: "hsl(var(--chart-3))" },
      { name: "Tratamiento", value: 1120, color: "hsl(var(--chart-4))" },
      { name: "Maquillaje", value: 990, color: "hsl(var(--chart-5))" },
    ],
    perf: [
      { nombre: "Coloración", citas: 2180, ingresos: 174_400_000, rating: 4.8 },
      { nombre: "Corte + Peinado", citas: 2450, ingresos: 98_000_000, rating: 4.7 },
      { nombre: "Tratamiento", citas: 1120, ingresos: 78_400_000, rating: 4.7 },
      { nombre: "Maquillaje", citas: 990, ingresos: 69_300_000, rating: 4.8 },
      { nombre: "Manicure", citas: 1680, ingresos: 50_400_000, rating: 4.9 },
    ],
  },
};

const REVENUE: Record<Period, { kpi: { total: number; meta: number; ticket: number; delta: number }; series: SeriesPoint[]; mix: { name: string; value: number; color: string }[] }> = {
  week: {
    kpi: { total: 1_120_000, meta: 1_200_000, ticket: 66_600, delta: 12.0 },
    series: [
      { label: "Lun", value: 142_000, meta: 160_000 },
      { label: "Mar", value: 168_000, meta: 160_000 },
      { label: "Mié", value: 195_000, meta: 170_000 },
      { label: "Jue", value: 178_000, meta: 170_000 },
      { label: "Vie", value: 232_000, meta: 200_000 },
      { label: "Sáb", value: 260_000, meta: 220_000 },
      { label: "Dom", value: 95_000, meta: 120_000 },
    ],
    mix: [
      { name: "Efectivo", value: 420_000, color: "hsl(var(--chart-1))" },
      { name: "Tarjeta", value: 540_000, color: "hsl(var(--chart-2))" },
      { name: "Transferencia", value: 160_000, color: "hsl(var(--chart-3))" },
    ],
  },
  month: {
    kpi: { total: 4_860_000, meta: 5_000_000, ticket: 68_200, delta: 14.5 },
    series: Array.from({ length: 4 }, (_, i) => ({ label: `Sem ${i + 1}`, value: [1_120_000, 1_240_000, 1_180_000, 1_320_000][i], meta: 1_250_000 })),
    mix: [
      { name: "Efectivo", value: 1_700_000, color: "hsl(var(--chart-1))" },
      { name: "Tarjeta", value: 2_460_000, color: "hsl(var(--chart-2))" },
      { name: "Transferencia", value: 700_000, color: "hsl(var(--chart-3))" },
    ],
  },
  year: {
    kpi: { total: 58_420_000, meta: 60_000_000, ticket: 71_500, delta: 22.1 },
    series: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m, i) => ({
      label: m,
      value: [4_120_000, 4_240_000, 4_580_000, 4_720_000, 4_880_000, 4_960_000, 5_120_000, 5_240_000, 4_640_000, 4_980_000, 5_120_000, 5_820_000][i],
      meta: 5_000_000,
    })),
    mix: [
      { name: "Efectivo", value: 20_000_000, color: "hsl(var(--chart-1))" },
      { name: "Tarjeta", value: 30_120_000, color: "hsl(var(--chart-2))" },
      { name: "Transferencia", value: 8_300_000, color: "hsl(var(--chart-3))" },
    ],
  },
};

const STAFF: Record<Period, { kpi: { top: string; topRev: number; avgRating: number; delta: number }; rows: { nombre: string; citas: number; ingresos: number; ocupacion: number; rating: number }[] }> = {
  week: {
    kpi: { top: "María González", topRev: 420_000, avgRating: 4.8, delta: 5.4 },
    rows: [
      { nombre: "María González", citas: 38, ingresos: 420_000, ocupacion: 82, rating: 4.9 },
      { nombre: "Laura Restrepo", citas: 34, ingresos: 380_000, ocupacion: 78, rating: 4.8 },
      { nombre: "Camilo Vargas", citas: 30, ingresos: 320_000, ocupacion: 71, rating: 4.7 },
      { nombre: "Sara López", citas: 28, ingresos: 290_000, ocupacion: 68, rating: 4.8 },
    ],
  },
  month: {
    kpi: { top: "María González", topRev: 1_820_000, avgRating: 4.8, delta: 9.1 },
    rows: [
      { nombre: "María González", citas: 162, ingresos: 1_820_000, ocupacion: 84, rating: 4.9 },
      { nombre: "Laura Restrepo", citas: 148, ingresos: 1_640_000, ocupacion: 80, rating: 4.8 },
      { nombre: "Camilo Vargas", citas: 134, ingresos: 1_420_000, ocupacion: 73, rating: 4.7 },
      { nombre: "Sara López", citas: 128, ingresos: 1_280_000, ocupacion: 70, rating: 4.8 },
    ],
  },
  year: {
    kpi: { top: "María González", topRev: 21_840_000, avgRating: 4.8, delta: 16.7 },
    rows: [
      { nombre: "María González", citas: 1944, ingresos: 21_840_000, ocupacion: 86, rating: 4.9 },
      { nombre: "Laura Restrepo", citas: 1776, ingresos: 19_680_000, ocupacion: 82, rating: 4.8 },
      { nombre: "Camilo Vargas", citas: 1608, ingresos: 17_040_000, ocupacion: 75, rating: 4.7 },
      { nombre: "Sara López", citas: 1536, ingresos: 15_360_000, ocupacion: 72, rating: 4.8 },
    ],
  },
};

const fmtCop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("es-CO").format(n);

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Reports() {
  const [period, setPeriod] = useState<Period>("month");
  const [source, setSource] = useState<Source>("appointments");

  const meta = SOURCES.find(s => s.id === source)!;

  const csv = useMemo(() => {
    const header = `Reporte: ${meta.label}\nPeríodo: ${PERIOD_LABELS[period]}\nFuente: ${meta.table}\n\n`;
    if (source === "appointments") {
      const d = APPOINTMENTS[period];
      const rows = ["Período,Citas,Canceladas", ...d.series.map(s => `${s.label},${s.value},${s.extra ?? 0}`)];
      return header + rows.join("\n");
    }
    if (source === "clients") {
      const d = CLIENTS[period];
      const rows = ["Período,Nuevos,Activos", ...d.series.map(s => `${s.label},${s.value},${s.meta ?? 0}`)];
      return header + rows.join("\n") + "\n\nTop clientes\nNombre,Visitas,Gasto\n" + d.top.map(t => `${t.nombre},${t.visitas},${t.gasto}`).join("\n");
    }
    if (source === "services") {
      const d = SERVICES[period];
      return header + "Servicio,Citas,Ingresos,Rating\n" + d.perf.map(p => `${p.nombre},${p.citas},${p.ingresos},${p.rating}`).join("\n");
    }
    if (source === "revenue") {
      const d = REVENUE[period];
      const rows = ["Período,Ingresos,Meta", ...d.series.map(s => `${s.label},${s.value},${s.meta ?? 0}`)];
      return header + rows.join("\n");
    }
    const d = STAFF[period];
    return header + "Colaborador,Citas,Ingresos,Ocupación %,Rating\n" + d.rows.map(r => `${r.nombre},${r.citas},${r.ingresos},${r.ocupacion},${r.rating}`).join("\n");
  }, [source, period, meta.label, meta.table]);

  function exportCsv() {
    triggerDownload(`reporte-${source}-${period}.csv`, csv, "text/csv;charset=utf-8");
    toast.success("Reporte CSV descargado");
  }

  function exportPdf() {
    const text = csv.replace(/\(/g, "[").replace(/\)/g, "]");
    const lines = text.split("\n").slice(0, 40);
    const stream = `BT /F1 10 Tf 50 800 Td 12 TL ${lines.map(l => `(${l.replace(/[^\x20-\x7E]/g, "?")}) Tj T*`).join(" ")} ET`;
    const pdf = `%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\ntrailer<< /Root 1 0 R >>\n%%EOF`;
    triggerDownload(`reporte-${source}-${period}.pdf`, pdf, "application/pdf");
    toast.success("Reporte PDF descargado");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Reportes (DEMO)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Genera reportes consolidados a partir de las fuentes operativas del negocio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="week">Semanal</TabsTrigger>
              <TabsTrigger value="month">Mensual</TabsTrigger>
              <TabsTrigger value="year">Anual</TabsTrigger>
            </TabsList>
          </Tabs>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Descargar reporte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCsv}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sources */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {SOURCES.map(s => {
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
              <p className={`mt-1.5 line-clamp-2 text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
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
          <span>Fuente de datos: <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">{meta.table}</code></span>
        </div>
        <span className="text-muted-foreground">Período: <strong className="text-foreground">{PERIOD_LABELS[period]}</strong></span>
      </div>

      {/* Report body */}
      {source === "appointments" && <AppointmentsReport period={period} />}
      {source === "clients" && <ClientsReport period={period} />}
      {source === "services" && <ServicesReport period={period} />}
      {source === "revenue" && <RevenueReport period={period} />}
      {source === "staff" && <StaffReport period={period} />}
    </div>
  );
}

// ─── KPI helper ────────────────────────────────────────────────────────────
function Kpi({ label, value, delta, positive = true }: { label: string; value: string; delta?: number; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {typeof delta === "number" && (
        <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}>
          {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {delta}% vs período anterior
        </div>
      )}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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

// ─── Reports ──────────────────────────────────────────────────────────────
function AppointmentsReport({ period }: { period: Period }) {
  const d = APPOINTMENTS[period];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total citas" value={fmtNum(d.kpi.total)} delta={d.kpi.delta} />
        <Kpi label="Completadas" value={fmtNum(d.kpi.completadas)} />
        <Kpi label="Canceladas" value={fmtNum(d.kpi.canceladas)} delta={-3.2} positive={false} />
        <Kpi label="No-show" value={fmtNum(d.kpi.noShow)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Volumen de citas" subtitle="Agendadas vs. canceladas">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={d.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="value" name="Agendadas" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="extra" name="Canceladas" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <Panel title="Distribución por estado">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={d.status} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {d.status.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}

function ClientsReport({ period }: { period: Period }) {
  const d = CLIENTS[period];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Nuevos clientes" value={fmtNum(d.kpi.total)} delta={d.kpi.delta} />
        <Kpi label="Recurrentes" value={fmtNum(d.kpi.recurrentes)} />
        <Kpi label="Retención" value={`${d.kpi.retencion}%`} />
        <Kpi label="Nuevos / activos" value={`${d.kpi.nuevos} / ${d.kpi.recurrentes}`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Adquisición y base activa">
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={d.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="value" name="Nuevos" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="meta" name="Activos" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <Panel title="Top clientes" subtitle="Por gasto del período">
          <ul className="space-y-3">
            {d.top.map(t => (
              <li key={t.nombre} className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
                <div>
                  <p className="text-sm font-semibold">{t.nombre}</p>
                  <p className="text-xs text-muted-foreground">{t.visitas} visitas</p>
                </div>
                <span className="text-sm font-semibold">{fmtCop(t.gasto)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function ServicesReport({ period }: { period: Period }) {
  const d = SERVICES[period];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Servicio top" value={d.kpi.topService} />
        <Kpi label="Citas servicio top" value={fmtNum(d.kpi.topCount)} delta={d.kpi.delta} />
        <Kpi label="Ticket promedio" value={fmtCop(d.kpi.ticket)} />
        <Kpi label="Servicios activos" value={`${d.mix.length}`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Mix de servicios">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={d.mix} dataKey="value" nameKey="name" outerRadius={95}>
                  {d.mix.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
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
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.perf.map(p => (
                    <TableRow key={p.nombre}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-right">{fmtNum(p.citas)}</TableCell>
                      <TableCell className="text-right">{fmtCop(p.ingresos)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{p.rating.toFixed(1)} ★</Badge>
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

function RevenueReport({ period }: { period: Period }) {
  const d = REVENUE[period];
  const cumplimiento = Math.round((d.kpi.total / d.kpi.meta) * 100);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Ingresos" value={fmtCop(d.kpi.total)} delta={d.kpi.delta} />
        <Kpi label="Meta" value={fmtCop(d.kpi.meta)} />
        <Kpi label="Cumplimiento" value={`${cumplimiento}%`} positive={cumplimiento >= 100} delta={cumplimiento - 100} />
        <Kpi label="Ticket promedio" value={fmtCop(d.kpi.ticket)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Ingresos vs. meta">
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={d.series}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => fmtCop(v)}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="value" name="Ingresos" stroke="hsl(var(--chart-1))" fill="url(#rev)" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="meta" name="Meta" stroke="hsl(var(--chart-4))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <Panel title="Ingresos por método de pago">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={d.mix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={95} paddingAngle={3}>
                  {d.mix.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => fmtCop(v)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}

function StaffReport({ period }: { period: Period }) {
  const d = STAFF[period];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Top colaborador" value={d.kpi.top} />
        <Kpi label="Ingresos top" value={fmtCop(d.kpi.topRev)} delta={d.kpi.delta} />
        <Kpi label="Rating promedio" value={`${d.kpi.avgRating} ★`} />
        <Kpi label="Equipo activo" value={`${d.rows.length}`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Ingresos por colaborador">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={d.rows} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nombre" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => fmtCop(v)}
                />
                <Bar dataKey="ingresos" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
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
                  <TableHead className="text-right">Ocupación</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.rows.map(r => (
                  <TableRow key={r.nombre}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell className="text-right">{fmtNum(r.citas)}</TableCell>
                    <TableCell className="text-right">{r.ocupacion}%</TableCell>
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
