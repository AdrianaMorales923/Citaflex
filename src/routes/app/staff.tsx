import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Mail, Phone, Trash2, Pencil, Star, Calendar, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";

export const Route = createFileRoute("/app/staff")({ component: StaffPage });

type StaffRole = "admin" | "senior" | "junior" | "receptionist";
type Member = {
  id: string;
  name: string;
  initials: string;
  role: StaffRole;
  email: string;
  phone: string;
  specialties: string[];
  status: "active" | "inactive";
  appts: number;
  rating: number;
};

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Administradora",
  senior: "Estilista Senior",
  junior: "Estilista Junior",
  receptionist: "Recepción",
};

const ROLE_MAP: Record<string, StaffRole> = {
  Administradora: "admin",
  "Estilista Senior": "senior",
  "Estilista Junior": "junior",
  Recepción: "receptionist",
  Estilista: "senior",
  Barbero: "senior",
  Manicurista: "junior",
};

function mapDbStaff(row: any, apptCount: number): Member {
  const roleKey = ROLE_MAP[row.role] ?? "junior";
  return {
    id: row.id,
    name: row.name,
    initials: row.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    role: roleKey,
    email: "",
    phone: row.phone ?? "",
    specialties: [],
    status: "active",
    appts: apptCount,
    rating: Number(row.rating) || 5.0,
  };
}

function StaffPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");
  const [editing, setEditing] = useState<Member | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<StaffRole>("junior");
  const [formSpecialties, setFormSpecialties] = useState("");

  const fetchMembers = async () => {
    setLoading(true);
    const { data: staffData } = await supabase.from("staff").select("*").order("name");

    if (!staffData || staffData.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    // Get appointment counts per staff member
    const staffIds = staffData.map((s) => s.id);
    const { data: apptCounts } = await supabase
      .from("appointments")
      .select("staff_id")
      .in("staff_id", staffIds);

    const countMap = new Map<string, number>();
    (apptCounts ?? []).forEach((a) => {
      countMap.set(a.staff_id, (countMap.get(a.staff_id) ?? 0) + 1);
    });

    setMembers(staffData.map((s) => mapDbStaff(s, countMap.get(s.id) ?? 0)));
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filtered = members.filter(m => {
    const matchQ = !q || [m.name, m.email, m.specialties.join(" ")].join(" ").toLowerCase().includes(q.toLowerCase());
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    return matchQ && matchRole;
  });

  const del = async (id: string) => {
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("Miembro eliminado");
      fetchMembers();
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("junior");
    setFormSpecialties("");
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setCreating(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setFormName(m.name);
    setFormEmail(m.email);
    setFormPhone(m.phone);
    setFormRole(m.role);
    setFormSpecialties(m.specialties.join(", "));
    setCreating(true);
  };

  const saveMember = async () => {
    if (!formName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    const roleName = ROLE_LABEL[formRole] ?? "Estilista";

    if (editing) {
      const { error } = await supabase
        .from("staff")
        .update({
          name: formName.trim(),
          phone: formPhone.trim() || null,
          role: roleName,
        })
        .eq("id", editing.id);
      if (error) {
        toast.error("Error: " + error.message);
        return;
      }
      toast.success("Miembro actualizado");
    } else {
      const { error } = await supabase.from("staff").insert({
        name: formName.trim(),
        phone: formPhone.trim() || null,
        role: roleName,
      });
      if (error) {
        toast.error("Error: " + error.message);
        return;
      }
      toast.success("Miembro creado");
    }

    setCreating(false);
    setEditing(null);
    fetchMembers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Personal</h2>
          <p className="text-sm text-muted-foreground">Administra al equipo, roles y especialidades.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Nuevo miembro
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Miembros" value={loading ? "—" : String(members.length)} tone="bg-primary/10 text-primary" icon={Shield} />
        <Kpi label="Activos" value={loading ? "—" : String(members.filter(m => m.status === "active").length)} tone="bg-success/10 text-success" icon={Star} />
        <Kpi label="Citas totales" value={loading ? "—" : String(members.reduce((a, m) => a + m.appts, 0))} tone="bg-chart-2/10 text-chart-2" icon={Calendar} />
        <Kpi label="Rating promedio" value={loading ? "—" : (members.reduce((a, m) => a + m.rating, 0) / (members.length || 1)).toFixed(1)} tone="bg-warning/20 text-warning-foreground" icon={Star} />
      </div>

      <div className="card-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, correo o especialidad..." className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={v => setRoleFilter(v as typeof roleFilter)}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="senior">Estilista Senior</SelectItem>
              <SelectItem value="junior">Estilista Junior</SelectItem>
              <SelectItem value="receptionist">Recepción</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(m => (
          <div key={m.id} className="card-surface flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-5 text-sm font-bold text-primary-foreground">
                {m.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]}</p>
              </div>
              <Badge variant={m.status === "active" ? "default" : "secondary"} className={cn(m.status === "active" && "bg-success text-white")}>
                {m.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {m.email && (
                <div className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {m.email}</div>
              )}
              {m.phone && (
                <div className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {m.phone}</div>
              )}
            </div>
            {m.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {m.specialties.map(s => (
                  <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-center">
              <div>
                <p className="font-display text-lg font-bold">{m.appts}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Citas</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold">{m.rating}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => del(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No hay miembros que coincidan con los filtros.
          </div>
        )}
      </div>

      <Dialog open={creating || !!editing} onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar miembro" : "Nuevo miembro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Correo</Label>
                <Input value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email" placeholder="correo@ejemplo.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+57 300 ..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={formRole} onValueChange={v => setFormRole(v as StaffRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="senior">Estilista Senior</SelectItem>
                  <SelectItem value="junior">Estilista Junior</SelectItem>
                  <SelectItem value="receptionist">Recepción</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Especialidades (separadas por coma)</Label>
              <Input value={formSpecialties} onChange={e => setFormSpecialties(e.target.value)} placeholder="Color, Corte, Barba" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={saveMember}>
              {editing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Star; label: string; value: string; tone: string }) {
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
