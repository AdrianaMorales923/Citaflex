import { createFileRoute, Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  Star,
  Heart,
  ClipboardList,
  Pencil,
  Save,
  CheckCircle2,
  AlertCircle,
  Ban,
  Hash,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import supabase from "@/lib/supabase";

export const Route = createFileRoute("/app/clients/$id")({ component: ClientProfile });

type ClientTag = "VIP" | "Frecuente" | "Nuevo" | "Inactivo";
type ApptStatus = "Confirmada" | "Pendiente" | "Completada" | "Cancelada";

interface ClientDetail {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  birthday: string;
  tag: ClientTag;
  visits: number;
  totalSpent: number;
  registeredAt: string;
  notes: string;
  preferences: string[];
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  service: string;
  staff: string;
  status: ApptStatus;
  price: number;
  notes: string;
}

const tagStyles: Record<ClientTag, string> = {
  VIP: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  Frecuente: "bg-primary/10 text-primary border-primary/20",
  Nuevo: "bg-success/10 text-success border-success/20",
  Inactivo: "bg-muted text-muted-foreground border-muted",
};

const statusStyles: Record<ApptStatus, string> = {
  Confirmada: "bg-primary/10 text-primary border-primary/20",
  Pendiente: "bg-warning/10 text-warning-foreground border-warning/20",
  Completada: "bg-success/10 text-success border-success/20",
  Cancelada: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusIcon: Record<ApptStatus, typeof CheckCircle2> = {
  Confirmada: CheckCircle2,
  Pendiente: Clock,
  Completada: CheckCircle2,
  Cancelada: Ban,
};

function formatDate(dateStr: string, opts: Intl.DateTimeFormatOptions) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "—";
  return d.toLocaleDateString("es-CO", opts);
}

function ClientAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-chart-5 font-bold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring";

function ClientProfile() {
  const { id } = Route.useParams();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    birthday: "",
    tag: "Nuevo" as ClientTag,
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data: c } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();

    if (!c) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: appts } = await supabase
      .from("appointments")
      .select("id, date, time, status, notes, service_id, staff_id")
      .eq("client_id", id)
      .order("date", { ascending: false })
      .order("time", { ascending: false })
      .limit(60);

    let mapped: Appointment[] = [];
    if (appts && appts.length > 0) {
      const serviceIds = [...new Set(appts.map((a) => a.service_id))];
      const staffIds = [...new Set(appts.map((a) => a.staff_id))];
      const [servicesRes, staffRes] = await Promise.all([
        supabase.from("services").select("id, name, price").in("id", serviceIds),
        supabase.from("staff").select("id, name").in("id", staffIds),
      ]);
      const serviceMap = new Map((servicesRes.data ?? []).map((s) => [s.id, s]));
      const staffMap = new Map((staffRes.data ?? []).map((s) => [s.id, s.name]));
      mapped = appts.map((a) => {
        const svc = serviceMap.get(a.service_id);
        return {
          id: a.id,
          date: formatDate(a.date, { day: "2-digit", month: "short", year: "numeric" }),
          time: (a.time ?? "").slice(0, 5),
          service: svc?.name ?? "Servicio",
          staff: staffMap.get(a.staff_id) ?? "—",
          status: (a.status === "No-show" ? "Cancelada" : a.status) as ApptStatus,
          price: svc?.price ?? 0,
          notes: a.notes ?? "",
        };
      });
    }

    setClient({
      id: c.id,
      name: c.name ?? "Sin nombre",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      birthday: c.birthday ?? "",
      tag: (c.tag ?? "Nuevo") as ClientTag,
      visits: c.visits ?? 0,
      totalSpent: c.total_spent ?? 0,
      registeredAt: formatDate(c.created_at, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      notes: c.notes ?? "",
      preferences: c.preferences ?? [],
    });
    setAppointments(mapped);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = () => {
    if (!client) return;
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      birthday: client.birthday,
      tag: client.tag,
      notes: client.notes,
    });
    setEditOpen(true);
  };

  const saveClient = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        birthday: form.birthday.trim() || null,
        tag: form.tag,
        notes: form.notes.trim() || null,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("Cliente actualizado");
      setEditOpen(false);
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando cliente...
      </div>
    );
  }

  if (notFound || !client) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <User className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
        <h2 className="font-display text-xl font-bold">Cliente no encontrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El cliente que buscas no existe o fue eliminado.
        </p>
        <Link
          to="/app/clients"
          search={{ q: undefined }}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a clientes
        </Link>
      </div>
    );
  }

  const completed = appointments.filter((a) => a.status === "Completada");
  const totalApptValue = appointments.reduce((s, a) => s + a.price, 0);

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/clients"
          search={{ q: undefined }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a clientes
        </Link>
        <button
          onClick={openEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Pencil className="h-4 w-4" /> Editar
        </button>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:gap-6">
        <ClientAvatar name={client.name} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold sm:text-2xl">{client.name}</h1>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold uppercase tracking-wider ${tagStyles[client.tag]}`}
            >
              {client.tag}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cliente desde {client.registeredAt} · {client.visits} visitas
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {client.phone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="max-w-[200px] truncate">{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span className="max-w-[240px] truncate">{client.address}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4 sm:text-right">
          <div>
            <p className="text-2xl font-bold">{formatMoney(client.totalSpent)}</p>
            <p className="text-xs text-muted-foreground">Total gastado</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold">{appointments.length}</p>
            <p className="text-xs text-muted-foreground">Citas registradas</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold">{completed.length}</p>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-chart-2/10 text-chart-2">
            <Hash className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-lg font-bold">{formatMoney(totalApptValue)}</p>
            <p className="text-xs text-muted-foreground">Valor citas</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-muted/50 p-1 sm:w-auto">
          <TabsTrigger value="info" className="rounded-lg text-sm">
            Información
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-sm">
            Historial de citas
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-lg text-sm">
            Notas y preferencias
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-display font-semibold">
                <User className="h-4 w-4 text-primary" /> Información personal
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Nombre completo</span>
                  <span className="font-medium">{client.name}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Teléfono</span>
                  <span className="font-medium">{client.phone || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{client.email || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Dirección</span>
                  <span className="max-w-[60%] text-right font-medium">
                    {client.address || "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Cumpleaños</span>
                  <span className="font-medium">{client.birthday || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registrado</span>
                  <span className="font-medium">{client.registeredAt}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-display font-semibold">
                <Heart className="h-4 w-4 text-chart-5" /> Preferencias
              </h3>
              {client.preferences.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {client.preferences.map((pref) => (
                    <span
                      key={pref}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
                    >
                      <Star className="h-3 w-3" /> {pref}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay preferencias registradas.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4 space-y-4">
          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
              <Calendar className="mx-auto mb-3 h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">No hay citas registradas</p>
              <p className="text-xs">Este cliente aún no tiene historial de citas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop table */}
              <div className="hidden rounded-xl border border-border bg-card shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Fecha y hora</th>
                        <th className="px-4 py-3">Servicio</th>
                        <th className="px-4 py-3">Profesional</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((a) => {
                        const StatusIcon = statusIcon[a.status];
                        return (
                          <tr
                            key={a.id}
                            className="border-b border-border transition-colors hover:bg-muted/40"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{a.date}</div>
                              <div className="text-xs text-muted-foreground">{a.time}</div>
                            </td>
                            <td className="px-4 py-3 font-medium">{a.service}</td>
                            <td className="px-4 py-3 text-muted-foreground">{a.staff}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={`gap-1 text-[10px] font-semibold uppercase ${statusStyles[a.status]}`}
                              >
                                <StatusIcon className="h-3 w-3" /> {a.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatMoney(a.price)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-3 md:hidden">
                {appointments.map((a) => {
                  const StatusIcon = statusIcon[a.status];
                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-display font-semibold">{a.service}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.date} · {a.time}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`gap-1 text-[10px] font-semibold uppercase ${statusStyles[a.status]}`}
                        >
                          <StatusIcon className="h-3 w-3" /> {a.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{a.staff}</span>
                        <span className="font-semibold">{formatMoney(a.price)}</span>
                      </div>
                      {a.notes && (
                        <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                          {a.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
              <ClipboardList className="h-4 w-4 text-primary" /> Notas generales
            </h3>
            {client.notes ? (
              <div className="rounded-lg bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
                {client.notes}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin notas registradas.</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
              <Heart className="h-4 w-4 text-chart-5" /> Preferencias del cliente
            </h3>
            {client.preferences.length > 0 ? (
              <ul className="space-y-2">
                {client.preferences.map((pref) => (
                  <li key={pref} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {pref}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin preferencias registradas.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Editar cliente</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre completo</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dirección</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cumpleaños</label>
                <input
                  value={form.birthday}
                  onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                  className={inputCls}
                  placeholder="Ej. 15 Marzo"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Etiqueta</label>
                <select
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value as ClientTag })}
                  className={inputCls}
                >
                  <option value="VIP">VIP</option>
                  <option value="Frecuente">Frecuente</option>
                  <option value="Nuevo">Nuevo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditOpen(false)}
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={saveClient}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cambios
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
