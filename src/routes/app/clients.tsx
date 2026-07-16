import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Filter,
  X,
  ChevronRight,
  Star,
  UserPlus,
  MoreHorizontal,
  Trash2,
  Pencil,
  ClipboardList,
  CheckCircle2,
  Clock,
  Heart,
  Users,
  Eye,
  History,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import supabase from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { createNotification } from "@/lib/use-notifications";

export const Route = createFileRoute("/app/clients")({ component: Clients });

type ClientTag = "VIP" | "Frecuente" | "Nuevo" | "Inactivo";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  visits: number;
  lastVisit: string;
  lastVisitDate: string;
  tag: ClientTag;
  totalSpent: number;
  birthday: string;
  notes: string;
  preferences: string[];
  appointmentCount: number;
}

interface HistoryEntry {
  service: string;
  staff: string;
  price: number;
  status: string;
  date: string;
  time: string;
}

const tagStyles: Record<ClientTag, string> = {
  VIP: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  Frecuente: "bg-primary/10 text-primary border-primary/20",
  Nuevo: "bg-success/10 text-success border-success/20",
  Inactivo: "bg-muted text-muted-foreground border-muted",
};

const tagIcon: Record<ClientTag, typeof Star> = {
  VIP: Star,
  Frecuente: Heart,
  Nuevo: UserPlus,
  Inactivo: Clock,
};

function formatMoney(n: number) {
  return "$" + n.toLocaleString("es-CO");
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

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Users; accent: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function mapDbClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    visits: row.visits ?? 0,
    lastVisit: row.last_visit ?? "Nunca",
    lastVisitDate: row.last_visit ?? "",
    tag: (row.tag ?? "Nuevo") as ClientTag,
    totalSpent: row.total_spent ?? 0,
    birthday: row.birthday ?? "",
    notes: row.notes ?? "",
    preferences: row.preferences ?? [],
    appointmentCount: row.visits ?? 0,
  };
}

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<ClientTag | "Todas">("Todas");
  const [sortBy, setSortBy] = useState<"name" | "visits" | "spent" | "recent">("recent");
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formBirthday, setFormBirthday] = useState("");
  const [formTag, setFormTag] = useState<ClientTag>("Nuevo");
  const [formNotes, setFormNotes] = useState("");

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("name");
    setClientsData((data ?? []).map(mapDbClient));
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = useMemo(() => {
    let list = clientsData.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchTag = filterTag === "Todas" || c.tag === filterTag;
      return matchSearch && matchTag;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "visits") return b.visits - a.visits;
      if (sortBy === "spent") return b.totalSpent - a.totalSpent;
      if (sortBy === "recent") return new Date(b.lastVisitDate || "2000-01-01").getTime() - new Date(a.lastVisitDate || "2000-01-01").getTime();
      return 0;
    });
    return list;
  }, [search, filterTag, sortBy, clientsData]);

  const vipCount = clientsData.filter((c) => c.tag === "VIP").length;
  const activeCount = clientsData.filter((c) => c.tag !== "Inactivo").length;
  const totalRevenue = clientsData.reduce((sum, c) => sum + c.totalSpent, 0);

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormBirthday("");
    setFormTag("Nuevo");
    setFormNotes("");
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const saveClient = async () => {
    if (!formName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const { error } = await supabase.from("clients").insert({
      name: formName.trim(),
      phone: formPhone.trim() || null,
      email: formEmail.trim() || null,
      address: formAddress.trim() || null,
      birthday: formBirthday.trim() || null,
      tag: formTag,
      notes: formNotes.trim() || null,
    });
    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("Cliente creado");
      setCreateOpen(false);
      fetchClients();

      if (user) {
        createNotification(user.id, {
          title: "Nuevo cliente registrado",
          description: `${formName.trim()} se agregó a tu base de clientes.`,
          tone: "success",
          icon: "UserPlus",
        });
      }
    }
  };

  const updateClient = async () => {
    if (!editClient) return;
    const { error } = await supabase
      .from("clients")
      .update({
        name: formName.trim(),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        address: formAddress.trim() || null,
        birthday: formBirthday.trim() || null,
        tag: formTag,
        notes: formNotes.trim() || null,
      })
      .eq("id", editClient.id);
    if (error) {
      toast.error("Error al actualizar: " + error.message);
    } else {
      toast.success("Cliente actualizado");
      setEditClient(null);
      fetchClients();
    }
  };

  const deleteClientConfirm = async () => {
    if (!deleteClient) return;
    const { error } = await supabase.from("clients").delete().eq("id", deleteClient.id);
    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      toast.success(`${deleteClient.name} eliminado`);
      setDeleteClient(null);
      fetchClients();

      if (user) {
        createNotification(user.id, {
          title: "Cliente eliminado",
          description: `${deleteClient.name} fue eliminado de tu base de clientes.`,
          tone: "warning",
          icon: "AlertCircle",
        });
      }
    }
  };

  const openEdit = (c: Client) => {
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email);
    setFormAddress(c.address);
    setFormBirthday(c.birthday);
    setFormTag(c.tag);
    setFormNotes(c.notes);
    setEditClient(c);
  };

  const loadHistory = async (c: Client) => {
    setHistoryClient(c);
    setHistoryLoading(true);
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, date, time, status, service_id, staff_id")
      .eq("client_id", c.id)
      .order("date", { ascending: false })
      .limit(20);

    if (!appts || appts.length === 0) {
      setHistoryData([]);
      setHistoryLoading(false);
      return;
    }

    const serviceIds = [...new Set(appts.map((a) => a.service_id))];
    const staffIds = [...new Set(appts.map((a) => a.staff_id))];

    const [servicesRes, staffRes] = await Promise.all([
      supabase.from("services").select("id, name, price").in("id", serviceIds),
      supabase.from("staff").select("id, name").in("id", staffIds),
    ]);

    const serviceMap = new Map((servicesRes.data ?? []).map((s) => [s.id, s]));
    const staffMap = new Map((staffRes.data ?? []).map((s) => [s.id, s.name]));

    setHistoryData(
      appts.map((a) => {
        const svc = serviceMap.get(a.service_id) as any;
        const d = new Date(a.date + "T00:00:00");
        return {
          service: svc?.name ?? "Servicio",
          staff: staffMap.get(a.staff_id) ?? "Staff",
          price: svc?.price ?? 0,
          status: a.status,
          date: d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }),
          time: a.time,
        };
      })
    );
    setHistoryLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Clientes</h2>
          <p className="text-sm text-muted-foreground">Gestiona tu base de clientes con historial completo y preferencias.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuevo cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total clientes" value={loading ? "—" : String(clientsData.length)} icon={Users} accent="bg-primary/10 text-primary" />
        <StatCard label="Clientes activos" value={loading ? "—" : String(activeCount)} icon={CheckCircle2} accent="bg-success/10 text-success" />
        <StatCard label="Clientes VIP" value={loading ? "—" : String(vipCount)} icon={Star} accent="bg-chart-5/10 text-chart-5" />
        <StatCard label="Ingresos totales" value={loading ? "—" : formatMoney(totalRevenue)} icon={ClipboardList} accent="bg-chart-2/10 text-chart-2" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-input bg-card px-3 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar por nombre, teléfono o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 bg-transparent px-2 py-2.5 text-sm outline-none sm:w-72"
            />
            {search && (
              <button onClick={() => setSearch("")} className="rounded-md p-1 hover:bg-muted">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 text-sm shadow-sm">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value as ClientTag | "Todas")}
              className="bg-transparent text-sm outline-none"
            >
              <option value="Todas">Todos</option>
              <option value="VIP">VIP</option>
              <option value="Frecuente">Frecuente</option>
              <option value="Nuevo">Nuevo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 text-sm shadow-sm">
            <span className="text-xs text-muted-foreground">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-transparent text-sm outline-none"
            >
              <option value="recent">Más reciente</option>
              <option value="name">Nombre</option>
              <option value="visits">Visitas</option>
              <option value="spent">Gasto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden rounded-xl border border-border bg-card shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Visitas</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Última visita</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const TagIcon = tagIcon[c.tag];
                return (
                  <tr key={c.id} className="border-b border-border transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ClientAvatar name={c.name} size={36} />
                        <div>
                          <p className="font-display font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.birthday}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{c.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="max-w-[160px] truncate">{c.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`gap-1 text-[10px] font-semibold uppercase tracking-wider ${tagStyles[c.tag]}`}>
                        <TagIcon className="h-3 w-3" /> {c.tag}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{c.visits}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(c.totalSpent)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.lastVisit}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to="/app/clients/$id"
                          params={{ id: c.id }}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                        >
                          Ver <ChevronRight className="h-3 w-3" />
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-label="Más acciones"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate({ to: "/app/clients/$id", params: { id: c.id } })
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" /> Ver perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => loadHistory(c)}>
                              <History className="mr-2 h-4 w-4" /> Historial
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteClient(c)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Search className="mx-auto mb-3 h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No se encontraron clientes</p>
            <p className="text-xs">Prueba con otros filtros o términos de búsqueda</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((c) => {
          const TagIcon = tagIcon[c.tag];
          return (
            <Link
              key={c.id}
              to="/app/clients/$id"
              params={{ id: c.id }}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <ClientAvatar name={c.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-display font-semibold">{c.name}</p>
                    <Badge variant="outline" className={`gap-1 text-[10px] font-semibold uppercase ${tagStyles[c.tag]}`}>
                      <TagIcon className="h-3 w-3" /> {c.tag}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.birthday}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{c.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.address}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {c.visits} visitas
                  </span>
                  <span className="font-semibold text-foreground">{formatMoney(c.totalSpent)}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Search className="mx-auto mb-3 h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No se encontraron clientes</p>
          </div>
        )}
      </div>

      {/* Create Client Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nuevo cliente</DialogTitle>
            <DialogDescription>Registra un nuevo cliente en tu base de datos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre completo</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Ej. Ana María López" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teléfono</label>
                <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="+57 300 ..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="cliente@correo.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dirección</label>
              <input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Dirección en Barranquilla" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cumpleaños</label>
                <input value={formBirthday} onChange={(e) => setFormBirthday(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Ej. 15 Marzo" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Etiqueta</label>
                <select value={formTag} onChange={(e) => setFormTag(e.target.value as ClientTag)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="Nuevo">Nuevo</option>
                  <option value="Frecuente">Frecuente</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas</label>
              <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Alergias, preferencias, etc." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreateOpen(false)} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
            <button onClick={saveClient} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Guardar cliente</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Modal */}
      <Dialog open={!!editClient} onOpenChange={(o) => !o && setEditClient(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Editar cliente</DialogTitle>
            <DialogDescription>Actualiza la información de {editClient?.name}.</DialogDescription>
          </DialogHeader>
          {editClient && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nombre completo</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Teléfono</label>
                  <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Dirección</label>
                <input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notas</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setEditClient(null)} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
            <button onClick={updateClient} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Guardar cambios</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClient} onOpenChange={(o) => !o && setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente a <span className="font-semibold text-foreground">{deleteClient?.name}</span> y todo su historial. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteClientConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History Modal */}
      <Dialog open={!!historyClient} onOpenChange={(o) => !o && setHistoryClient(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Historial de citas</DialogTitle>
            <DialogDescription>
              {historyClient?.name} · {historyClient?.appointmentCount} citas registradas
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Cargando historial...</div>
          ) : historyData.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Clock className="mx-auto mb-2 h-8 w-8 opacity-30" />
              Sin historial de citas aún.
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto py-2">
              {historyData.map((h, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-sm font-semibold">{h.service}</p>
                      <span className="text-xs font-semibold">{formatMoney(h.price)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{h.date} · {h.time} · {h.staff}</p>
                    <Badge variant="outline" className={`mt-1.5 text-[10px] ${h.status === "Completada" ? "border-success/20 bg-success/10 text-success" : "border-muted text-muted-foreground"}`}>
                      {h.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setHistoryClient(null)} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cerrar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
