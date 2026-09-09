import { createFileRoute } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  Clock,
  DollarSign,
  Users,
  Scissors,
  Sparkles,
  Stethoscope,
  Heart,
  Palette,
  Camera,
  Dumbbell,
  MessageSquare,
  X,
  Pencil,
  Trash2,
  Filter,
  CheckCircle2,
  Briefcase,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import supabase from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/app/services")({ component: Services });

// ---------- Types ----------
interface StaffMember {
  id: string;
  name: string;
  role: string;
}

type ServiceStatus = "Activo" | "Inactivo";

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  description: string;
  staffIds: string[];
  status: ServiceStatus;
}

// ---------- Category metadata ----------
const CATEGORIES = [
  {
    label: "Cabello",
    icon: Scissors,
    color: "bg-primary/10 text-primary",
    border: "border-primary/20",
  },
  {
    label: "Uñas",
    icon: Sparkles,
    color: "bg-chart-5/10 text-chart-5",
    border: "border-chart-5/20",
  },
  {
    label: "Barbería",
    icon: Scissors,
    color: "bg-chart-3/10 text-chart-3",
    border: "border-chart-3/20",
  },
  {
    label: "Estética",
    icon: Heart,
    color: "bg-chart-2/10 text-chart-2",
    border: "border-chart-2/20",
  },
  {
    label: "Salud",
    icon: Stethoscope,
    color: "bg-success/10 text-success",
    border: "border-success/20",
  },
  {
    label: "Belleza",
    icon: Palette,
    color: "bg-chart-4/10 text-chart-4",
    border: "border-chart-4/20",
  },
  {
    label: "Fotografía",
    icon: Camera,
    color: "bg-chart-1/10 text-chart-1",
    border: "border-chart-1/20",
  },
  {
    label: "Fitness",
    icon: Dumbbell,
    color: "bg-warning/10 text-warning-foreground",
    border: "border-warning/30",
  },
  {
    label: "Consultoría",
    icon: MessageSquare,
    color: "bg-secondary/20 text-secondary-foreground",
    border: "border-secondary/30",
  },
];

function categoryMeta(label: string) {
  return CATEGORIES.find((c) => c.label === label) ?? CATEGORIES[0];
}

// ---------- Helpers ----------
function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// ---------- Components ----------
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  accent: string;
}) {
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

// ---------- Main page ----------
function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("Todas");
  const [filterStatus, setFilterStatus] = useState<ServiceStatus | "Todas">("Todas");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Cabello");
  const [formDuration, setFormDuration] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStaffIds, setFormStaffIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<ServiceStatus>("Activo");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const fetchData = async () => {
    setLoading(true);
    const [servicesRes, staffRes, junctionRes] = await Promise.all([
      supabase.from("services").select("*").order("name"),
      supabase.from("staff").select("id, name, role").order("name"),
      supabase.from("service_staff").select("service_id, staff_id"),
    ]);

    const staffMap = new Map<string, string[]>();
    (junctionRes.data ?? []).forEach((j) => {
      const existing = staffMap.get(j.service_id) ?? [];
      existing.push(j.staff_id);
      staffMap.set(j.service_id, existing);
    });

    setServices(
      (servicesRes.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category ?? "Cabello",
        duration: s.duration ?? 60,
        price: s.price ?? 0,
        description: s.description ?? "",
        staffIds: staffMap.get(s.id) ?? [],
        status: (s.status ?? "Activo") as ServiceStatus,
      })),
    );
    setStaffList(
      (staffRes.data ?? []).map((s) => ({ id: s.id, name: s.name, role: s.role ?? "" })),
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const list = services.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      const matchCat = filterCategory === "Todas" || s.category === filterCategory;
      const matchStatus = filterStatus === "Todas" || s.status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
    return list;
  }, [services, search, filterCategory, filterStatus]);

  const activeCount = services.filter((s) => s.status === "Activo").length;
  const inactiveCount = services.filter((s) => s.status === "Inactivo").length;
  const totalRevenue = services.reduce((sum, s) => sum + (s.status === "Activo" ? s.price : 0), 0);
  const avgDuration =
    services.length > 0
      ? Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length)
      : 0;

  const resetForm = () => {
    setFormName("");
    setFormCategory("Cabello");
    setFormDuration("");
    setFormPrice("");
    setFormDescription("");
    setFormStaffIds([]);
    setFormStatus("Activo");
    setFormError("");
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (svc: Service) => {
    setEditing(svc);
    setFormName(svc.name);
    setFormCategory(svc.category);
    setFormDuration(String(svc.duration));
    setFormPrice(String(svc.price));
    setFormDescription(svc.description);
    setFormStaffIds(svc.staffIds);
    setFormStatus(svc.status);
    setFormError("");
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formName.trim()) {
      setFormError("El nombre del servicio es obligatorio.");
      return false;
    }
    if (!formCategory.trim()) {
      setFormError("Selecciona una categoría.");
      return false;
    }
    const duration = parseInt(formDuration, 10);
    if (isNaN(duration) || duration <= 0) {
      setFormError("La duración debe ser mayor a 0 minutos.");
      return false;
    }
    const price = parseInt(formPrice, 10);
    if (isNaN(price) || price < 0) {
      setFormError("El precio no puede ser negativo.");
      return false;
    }
    setFormError("");
    return true;
  };

  const saveService = async () => {
    if (savingRef.current) return;
    if (!validateForm()) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        category: formCategory,
        duration: parseInt(formDuration, 10),
        price: parseInt(formPrice, 10),
        description: formDescription.trim() || null,
        status: formStatus,
      };

      if (editing) {
        const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
        if (error) {
          toast.error("Error: " + error.message);
          return;
        }

        // Update staff assignments
        await supabase.from("service_staff").delete().eq("service_id", editing.id);
        if (formStaffIds.length > 0) {
          await supabase
            .from("service_staff")
            .insert(formStaffIds.map((sid) => ({ service_id: editing.id, staff_id: sid })));
        }
        toast.success("Servicio actualizado");
      } else {
        const { data, error } = await supabase
          .from("services")
          .insert(payload)
          .select("id")
          .single();
        if (error) {
          toast.error("Error: " + error.message);
          return;
        }

        if (data && formStaffIds.length > 0) {
          await supabase
            .from("service_staff")
            .insert(formStaffIds.map((sid) => ({ service_id: data.id, staff_id: sid })));
        }
        toast.success("Servicio creado");
      }

      setDialogOpen(false);
      fetchData();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const deleteService = async (svc: Service) => {
    const { error } = await supabase.from("services").delete().eq("id", svc.id);
    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      toast.success("Servicio eliminado");
      setDeleteTarget(null);
      fetchData();
    }
  };

  const toggleStaff = (id: string) => {
    setFormStaffIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Servicios</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona precios, duración, categorías y asignación de personal.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo servicio
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Servicios activos"
          value={loading ? "—" : String(activeCount)}
          icon={CheckCircle2}
          accent="bg-success/10 text-success"
        />
        <StatCard
          label="Servicios inactivos"
          value={loading ? "—" : String(inactiveCount)}
          icon={Package}
          accent="bg-muted text-muted-foreground"
        />
        <StatCard
          label="Ingreso potencial"
          value={loading ? "—" : formatMoney(totalRevenue)}
          icon={DollarSign}
          accent="bg-chart-2/10 text-chart-2"
        />
        <StatCard
          label="Duración promedio"
          value={loading ? "—" : formatDuration(avgDuration)}
          icon={Clock}
          accent="bg-primary/10 text-primary"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-input bg-card px-3 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar servicio..."
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              <option value="Todas">Todas las categorías</option>
              {CATEGORIES.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 text-sm shadow-sm">
            <span className="text-xs text-muted-foreground">Estado:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ServiceStatus | "Todas")}
              className="bg-transparent text-sm outline-none"
            >
              <option value="Todas">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
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
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Duración</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-center">Staff</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const meta = categoryMeta(s.category);
                const CatIcon = meta.icon;
                const assignedStaff = staffList.filter((st) => s.staffIds.includes(st.id));
                return (
                  <tr
                    key={s.id}
                    className="border-b border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.color}`}
                        >
                          <CatIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-display font-medium">{s.name}</p>
                          <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                            {s.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color} ${meta.border}`}
                      >
                        {s.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatDuration(s.duration)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(s.price)}</td>
                    <td className="px-4 py-3 text-center">
                      {assignedStaff.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium">{assignedStaff.length}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          s.status === "Activo"
                            ? "bg-success/10 text-success border border-success/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${s.status === "Activo" ? "bg-success" : "bg-muted-foreground"}`}
                        />
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
            <p className="text-sm font-medium">No se encontraron servicios</p>
            <p className="text-xs">Prueba con otros filtros o términos de búsqueda</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((s) => {
          const meta = categoryMeta(s.category);
          const CatIcon = meta.icon;
          const assignedStaff = staffList.filter((st) => s.staffIds.includes(st.id));
          return (
            <div
              key={s.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.color}`}
                  >
                    <CatIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold">{s.name}</p>
                    <Badge
                      variant="outline"
                      className={`mt-1 text-[10px] font-semibold uppercase ${meta.color} ${meta.border}`}
                    >
                      {s.category}
                    </Badge>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    s.status === "Activo"
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${s.status === "Activo" ? "bg-success" : "bg-muted-foreground"}`}
                  />
                  {s.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center text-sm">
                <div>
                  <Clock className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                  <p className="mt-1 text-xs font-semibold">{formatDuration(s.duration)}</p>
                </div>
                <div>
                  <DollarSign className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                  <p className="mt-1 text-xs font-semibold">{formatMoney(s.price)}</p>
                </div>
                <div>
                  <Users className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                  <p className="mt-1 text-xs font-semibold">{assignedStaff.length || "—"}</p>
                </div>
              </div>

              {assignedStaff.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {assignedStaff.map((st) => (
                    <span
                      key={st.id}
                      className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
                    >
                      {st.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-border pt-3">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(s)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(s)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Search className="mx-auto mb-3 h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No se encontraron servicios</p>
            <p className="text-xs">Prueba con otros filtros o términos de búsqueda</p>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) setDialogOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Actualiza la información del servicio."
                : "Completa los datos para crear un nuevo servicio."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="svc-name">Nombre del servicio</Label>
              <Input
                id="svc-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej. Corte + Tinte"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="svc-category">Categoría</Label>
                <select
                  id="svc-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-status">Estado</Label>
                <select
                  id="svc-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ServiceStatus)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="svc-duration">Duración (minutos)</Label>
                <Input
                  id="svc-duration"
                  type="number"
                  min={5}
                  step={5}
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  placeholder="Ej. 60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-price">Precio (COP)</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min={0}
                  step={1000}
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="Ej. 50000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-desc">Descripción</Label>
              <Textarea
                id="svc-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe brevemente el servicio..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Personal asignado</Label>
              <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                {staffList.map((st) => (
                  <label
                    key={st.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md p-2 transition hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={formStaffIds.includes(st.id)}
                      onCheckedChange={() => toggleStaff(st.id)}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{st.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{st.role}</p>
                    </div>
                  </label>
                ))}
                {staffList.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay personal registrado.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveService} disabled={saving}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteService(deleteTarget)}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
