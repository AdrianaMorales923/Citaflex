import { createFileRoute } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import { useEffect, useMemo, useState } from "react";
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
import { Search, Calendar, Star, DollarSign, Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import supabase from "@/lib/supabase";

export const Route = createFileRoute("/app/history")({ component: History });

type Entry = {
  id: string;
  date: string;
  label: string;
  ts: number;
  service: string;
  staff: string;
  price: number;
  rating: number;
  notes: string;
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function History() {
  const { user } = useAuth();
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [year, setYear] = useState<"all" | "2026" | "2025">("all");
  const [sort, setSort] = useState<"recent" | "oldest" | "rating">("recent");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (!user) {
          setData([]);
          return;
        }

        const { data: mine } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mine) {
          setData([]);
          return;
        }

        const { data: rows } = await supabase
          .from("appointments")
          .select("id, date, time, status, service_id, staff_id, notes")
          .eq("client_id", mine.id)
          .in("status", ["Completada", "Cancelada"])
          .order("date", { ascending: false })
          .limit(100);

        if (!rows || rows.length === 0) {
          setData([]);
          return;
        }

        const serviceIds = [...new Set(rows.map((a) => a.service_id))];
        const staffIds = [...new Set(rows.map((a) => a.staff_id))];

        const [{ data: services }, { data: staff }] = await Promise.all([
          supabase.from("services").select("id, name, price").in("id", serviceIds),
          supabase.from("staff").select("id, name, rating").in("id", staffIds),
        ]);

        const serviceMap = new Map((services ?? []).map((s) => [s.id, s]));
        const staffMap = new Map((staff ?? []).map((s) => [s.id, s]));

        setData(
          rows.map((a) => {
            const svc = serviceMap.get(a.service_id);
            const st = staffMap.get(a.staff_id);
            return {
              id: a.id,
              date: a.date,
              label: formatLabel(a.date),
              ts: parseInt(a.date.replace(/-/g, ""), 10),
              service: svc?.name ?? "Servicio",
              staff: st?.name ?? "Personal",
              price: svc?.price ?? 0,
              rating: st?.rating != null ? Number(st.rating) : 5,
              notes: a.notes ?? "",
            };
          }),
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const filtered = useMemo(() => {
    const yearStr = year === "all" ? "" : year;
    let list = data.filter((e) => {
      const matchQ =
        !q || [e.service, e.staff, e.notes].join(" ").toLowerCase().includes(q.toLowerCase());
      const matchYear = !yearStr || String(e.ts).startsWith(yearStr);
      return matchQ && matchYear;
    });
    if (sort === "recent") list = list.slice().sort((a, b) => b.ts - a.ts);
    if (sort === "oldest") list = list.slice().sort((a, b) => a.ts - b.ts);
    if (sort === "rating") list = list.slice().sort((a, b) => b.rating - a.rating);
    return list;
  }, [data, q, year, sort]);

  const total = filtered.reduce((a, e) => a + e.price, 0);
  const avgRating = filtered.length
    ? (filtered.reduce((a, e) => a + e.rating, 0) / filtered.length).toFixed(1)
    : "—";

  if (loading) {
    return (
      <div className="flex min-h-60 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Historial de citas</h2>
        <p className="text-sm text-muted-foreground">
          Revisa tus visitas anteriores, precios y evaluaciones.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi
          icon={Calendar}
          label="Visitas"
          value={String(filtered.length)}
          tone="bg-primary/10 text-primary"
        />
        <Kpi
          icon={DollarSign}
          label="Inversión total"
          value={formatMoney(total)}
          tone="bg-success/10 text-success"
        />
        <Kpi
          icon={Star}
          label="Rating promedio"
          value={avgRating}
          tone="bg-warning/20 text-warning-foreground"
        />
      </div>

      <div className="card-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por servicio, estilista o nota..."
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={year} onValueChange={(v) => setYear(v as typeof year)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los años</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Más recientes</SelectItem>
              <SelectItem value="oldest">Más antiguos</SelectItem>
              <SelectItem value="rating">Mejor puntuados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-surface rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No hay visitas que coincidan con los filtros.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-6">
          {filtered.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[27px] top-3 grid h-4 w-4 place-items-center rounded-full border-2 border-background bg-primary" />
              <div className="card-surface p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {e.label}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-semibold">{e.service}</h3>
                    <p className="text-sm text-muted-foreground">Con {e.staff}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <DollarSign className="h-3 w-3" /> {formatMoney(e.price)}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" /> {e.rating.toFixed(1)}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />{" "}
                  {e.notes || "Sin comentarios."}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Solicitud de repetir cita enviada (demo)")}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Repetir servicio
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.info("Descarga de recibo (demo)")}
                  >
                    Descargar recibo
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="card-surface flex items-center gap-3 p-4">
      <div className={`grid h-11 w-11 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
