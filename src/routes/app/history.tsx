import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Star, DollarSign, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/history")({ component: History });

type Entry = {
  id: string;
  date: string;
  ts: number;
  service: string;
  staff: string;
  price: string;
  rating: number;
  notes: string;
};

const DATA: Entry[] = [
  { id: "h1", date: "12 Jun 2026", ts: 20260612, service: "Corte + Tinte", staff: "Laura Márquez", price: "$180.000", rating: 5, notes: "Excelente atención, quedó justo como pedí." },
  { id: "h2", date: "05 May 2026", ts: 20260505, service: "Manicure spa", staff: "Sofía Herrera", price: "$65.000", rating: 5, notes: "Muy relajante, repetiría." },
  { id: "h3", date: "22 Abr 2026", ts: 20260422, service: "Limpieza facial", staff: "Laura Márquez", price: "$120.000", rating: 4, notes: "Buen resultado, ambiente cómodo." },
  { id: "h4", date: "10 Mar 2026", ts: 20260310, service: "Corte", staff: "Andrés Molina", price: "$55.000", rating: 4, notes: "Rápido y puntual." },
  { id: "h5", date: "14 Feb 2026", ts: 20260214, service: "Tinte", staff: "Laura Márquez", price: "$140.000", rating: 5, notes: "Color perfecto para San Valentín." },
  { id: "h6", date: "20 Ene 2026", ts: 20260120, service: "Pedicure", staff: "Sofía Herrera", price: "$70.000", rating: 5, notes: "Súper detallado." },
  { id: "h7", date: "08 Dic 2025", ts: 20251208, service: "Corte + Barba", staff: "Andrés Molina", price: "$90.000", rating: 4, notes: "Buen servicio navideño." },
  { id: "h8", date: "15 Oct 2025", ts: 20251015, service: "Facial premium", staff: "Laura Márquez", price: "$150.000", rating: 5, notes: "Piel radiante." },
];

function History() {
  const [q, setQ] = useState("");
  const [year, setYear] = useState<"all" | "2026" | "2025">("all");
  const [sort, setSort] = useState<"recent" | "oldest" | "rating">("recent");

  const filtered = useMemo(() => {
    let list = DATA.filter(e => {
      const matchQ = !q || [e.service, e.staff, e.notes].join(" ").toLowerCase().includes(q.toLowerCase());
      const matchYear = year === "all" || e.date.includes(year);
      return matchQ && matchYear;
    });
    if (sort === "recent") list = list.slice().sort((a, b) => b.ts - a.ts);
    if (sort === "oldest") list = list.slice().sort((a, b) => a.ts - b.ts);
    if (sort === "rating") list = list.slice().sort((a, b) => b.rating - a.rating);
    return list;
  }, [q, year, sort]);

  const total = filtered.reduce((a, e) => a + parseInt(e.price.replace(/\D/g, ""), 10), 0);
  const avgRating = filtered.length ? (filtered.reduce((a, e) => a + e.rating, 0) / filtered.length).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Historial de citas (DEMO)</h2>
        <p className="text-sm text-muted-foreground">Revisa tus visitas anteriores, precios y evaluaciones.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={Calendar} label="Visitas" value={String(filtered.length)} tone="bg-primary/10 text-primary" />
        <Kpi icon={DollarSign} label="Inversión total" value={`$${total.toLocaleString("es-CO")}`} tone="bg-success/10 text-success" />
        <Kpi icon={Star} label="Rating promedio" value={avgRating} tone="bg-warning/20 text-warning-foreground" />
      </div>

      <div className="card-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por servicio, estilista o nota..." className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={year} onValueChange={v => setYear(v as typeof year)}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los años</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={v => setSort(v as typeof sort)}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Más recientes</SelectItem>
              <SelectItem value="oldest">Más antiguos</SelectItem>
              <SelectItem value="rating">Mejor puntuados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ol className="relative space-y-3 border-l border-border pl-6">
        {filtered.map(e => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[27px] top-3 grid h-4 w-4 place-items-center rounded-full border-2 border-background bg-primary" />
            <div className="card-surface p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{e.date}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold">{e.service}</h3>
                  <p className="text-sm text-muted-foreground">Con {e.staff}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1"><DollarSign className="h-3 w-3" /> {e.price}</Badge>
                  <Badge variant="outline" className="gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {e.rating}.0</Badge>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" /> {e.notes}
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.info("Solicitud de repetir cita enviada (demo)")}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Repetir servicio
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast.info("Descarga de recibo (demo)")}>
                  Descargar recibo
                </Button>
              </div>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-12 text-center text-sm text-muted-foreground">No hay visitas que coincidan con los filtros.</li>
        )}
      </ol>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Calendar; label: string; value: string; tone: string }) {
  return (
    <div className="card-surface flex items-center gap-3 p-4">
      <div className={`grid h-11 w-11 place-items-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
