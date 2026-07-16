import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  Clock,
  Bell,
  Users,
  Palette,
  Upload,
  Plus,
  Trash2,
  Mail,
  MessageSquare,
  Smartphone,
  Check,
  Pencil,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({ component: Settings });

const DAYS = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

type DayCfg = { enabled: boolean; open: string; close: string };

const INITIAL_HOURS: Record<string, DayCfg> = {
  mon: { enabled: true, open: "08:00", close: "19:00" },
  tue: { enabled: true, open: "08:00", close: "19:00" },
  wed: { enabled: true, open: "08:00", close: "19:00" },
  thu: { enabled: true, open: "08:00", close: "19:00" },
  fri: { enabled: true, open: "08:00", close: "20:00" },
  sat: { enabled: true, open: "09:00", close: "18:00" },
  sun: { enabled: false, open: "09:00", close: "14:00" },
};

type Staff = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: "Activo" | "Inactivo";
};

const INITIAL_STAFF: Staff[] = [
  { id: "s1", name: "María Rodríguez", role: "Estilista senior", email: "maria@salonbella.co", phone: "+57 300 111 2233", status: "Activo" },
  { id: "s2", name: "Carlos Mendoza", role: "Barbero", email: "carlos@salonbella.co", phone: "+57 301 222 3344", status: "Activo" },
  { id: "s3", name: "Lucía Pérez", role: "Manicurista", email: "lucia@salonbella.co", phone: "+57 302 333 4455", status: "Activo" },
  { id: "s4", name: "Andrés Torres", role: "Recepcionista", email: "andres@salonbella.co", phone: "+57 303 444 5566", status: "Inactivo" },
];

const COLORS = [
  { name: "Coral", value: "#f97070" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Esmeralda", value: "#10b981" },
  { name: "Ámbar", value: "#f59e0b" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Cielo", value: "#0ea5e9" },
];

function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Configuración (DEMO)</h2>
        <p className="text-sm text-muted-foreground">
          Personaliza tu negocio, equipo y notificaciones.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-auto w-max gap-1 bg-card p-1 shadow-sm">
            <TabTrigger value="profile" icon={Building2} label="Perfil" />
            <TabTrigger value="hours" icon={Clock} label="Horarios" />
            <TabTrigger value="staff" icon={Users} label="Equipo" />
            <TabTrigger value="notifications" icon={Bell} label="Notificaciones" />
            <TabTrigger value="branding" icon={Palette} label="Personalización" />
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-0"><ProfileTab /></TabsContent>
        <TabsContent value="hours" className="mt-0"><HoursTab /></TabsContent>
        <TabsContent value="staff" className="mt-0"><StaffTab /></TabsContent>
        <TabsContent value="notifications" className="mt-0"><NotificationsTab /></TabsContent>
        <TabsContent value="branding" className="mt-0"><BrandingTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function TabTrigger({ value, icon: Icon, label }: { value: string; icon: React.ElementType; label: string }) {
  return (
    <TabsTrigger value={value} className="gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  );
}

function SectionCard({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h3 className="font-display text-base font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/* ---------------- PROFILE ---------------- */
function ProfileTab() {
  return (
    <div className="space-y-6">
      <SectionCard title="Perfil del negocio" description="Esta información aparecerá en tu página pública de reservas.">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-5 text-2xl font-bold text-primary-foreground">
            SB
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" /> Subir logo
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">Eliminar</Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre comercial" defaultValue="Salón Bella" />
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</Label>
            <Select defaultValue="belleza">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="belleza">Salón de belleza</SelectItem>
                <SelectItem value="barberia">Barbería</SelectItem>
                <SelectItem value="unas">Uñas</SelectItem>
                <SelectItem value="medico">Consulta médica</SelectItem>
                <SelectItem value="psicologia">Psicología</SelectItem>
                <SelectItem value="nutricion">Nutrición</SelectItem>
                <SelectItem value="tatuajes">Tatuajes</SelectItem>
                <SelectItem value="fotografia">Fotografía</SelectItem>
                <SelectItem value="entrenador">Entrenador personal</SelectItem>
                <SelectItem value="estetica">Centro estético</SelectItem>
                <SelectItem value="consultor">Consultor independiente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Teléfono" defaultValue="+57 300 123 4567" />
          <Field label="Correo de contacto" type="email" defaultValue="contacto@salonbella.co" />
          <div className="sm:col-span-2">
            <Field label="Dirección" defaultValue="Cra 53 #76-115, Barranquilla" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción</Label>
            <Textarea rows={4} defaultValue="Salón de belleza con más de 10 años de experiencia en Barranquilla. Cortes, color, manicure y tratamientos capilares." />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline">Cancelar</Button>
          <Button>Guardar cambios</Button>
        </div>
      </SectionCard>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<"input">) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input {...props} />
    </div>
  );
}

/* ---------------- HOURS ---------------- */
function HoursTab() {
  const [hours, setHours] = useState(INITIAL_HOURS);
  const update = (k: string, patch: Partial<DayCfg>) =>
    setHours(h => ({ ...h, [k]: { ...h[k], ...patch } }));

  return (
    <SectionCard
      title="Horarios y días laborales"
      description="Define cuándo tu negocio acepta reservas."
      action={<Button variant="outline" size="sm">Copiar a todos</Button>}
    >
      <ul className="divide-y divide-border">
        {DAYS.map(d => {
          const cfg = hours[d.key];
          return (
            <li key={d.key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Switch checked={cfg.enabled} onCheckedChange={(v) => update(d.key, { enabled: v })} />
                <div>
                  <p className="text-sm font-semibold">{d.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {cfg.enabled ? `${cfg.open} — ${cfg.close}` : "Cerrado"}
                  </p>
                </div>
              </div>
              <div className={cn("flex items-center gap-2", !cfg.enabled && "opacity-50")}>
                <Input type="time" value={cfg.open} disabled={!cfg.enabled}
                  onChange={(e) => update(d.key, { open: e.target.value })}
                  className="w-[120px]" />
                <span className="text-muted-foreground">—</span>
                <Input type="time" value={cfg.close} disabled={!cfg.enabled}
                  onChange={(e) => update(d.key, { close: e.target.value })}
                  className="w-[120px]" />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 p-4">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="text-sm">
            <p className="font-medium">Duración de slots</p>
            <p className="text-muted-foreground">Intervalo entre citas disponibles para reserva online.</p>
          </div>
          <Select defaultValue="30">
            <SelectTrigger className="ml-auto w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="45">45 min</SelectItem>
              <SelectItem value="60">60 min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button>Guardar horarios</Button>
      </div>
    </SectionCard>
  );
}

/* ---------------- STAFF ---------------- */
function StaffTab() {
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (s: Staff) => { setEditing(s); setOpen(true); };
  const remove = (id: string) => setStaff(s => s.filter(x => x.id !== id));

  const save = (data: Omit<Staff, "id">) => {
    if (editing) {
      setStaff(s => s.map(x => x.id === editing.id ? { ...editing, ...data } : x));
    } else {
      setStaff(s => [...s, { id: `s${Date.now()}`, ...data }]);
    }
    setOpen(false);
  };

  return (
    <SectionCard
      title="Equipo y staff"
      description="Profesionales que prestan los servicios de tu negocio."
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Agregar miembro</Button>
          </DialogTrigger>
          <StaffDialog editing={editing} onSave={save} />
        </Dialog>
      }
    >
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Miembro</th>
              <th className="px-4 py-3 text-left font-semibold">Rol</th>
              <th className="px-4 py-3 text-left font-semibold">Contacto</th>
              <th className="px-4 py-3 text-left font-semibold">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9"><AvatarFallback>{initials(s.name)}</AvatarFallback></Avatar>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.role}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div className="text-xs">{s.email}</div>
                  <div className="text-xs">{s.phone}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={s.status === "Activo" ? "default" : "secondary"}>{s.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {staff.map(s => (
          <div key={s.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10"><AvatarFallback>{initials(s.name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.role}</p>
              </div>
              <Badge variant={s.status === "Activo" ? "default" : "secondary"}>{s.status}</Badge>
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>{s.email}</p>
              <p>{s.phone}</p>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(s)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive" onClick={() => remove(s.id)}>
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function StaffDialog({ editing, onSave }: { editing: Staff | null; onSave: (s: Omit<Staff, "id">) => void }) {
  const [form, setForm] = useState<Omit<Staff, "id">>(
    editing ?? { name: "", role: "", email: "", phone: "", status: "Activo" }
  );
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar miembro" : "Nuevo miembro del equipo"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <Field label="Nombre completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Field label="Rol o cargo" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <Field label="Correo" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Staff["status"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} disabled={!form.name.trim()}>
          {editing ? "Guardar" : "Agregar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function initials(name: string) {
  return name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
}

/* ---------------- NOTIFICATIONS ---------------- */
function NotificationsTab() {
  const channels = [
    { icon: MessageSquare, name: "WhatsApp", desc: "Recordatorios y confirmaciones por WhatsApp.", on: true },
    { icon: Mail, name: "Email", desc: "Notificaciones por correo electrónico al cliente.", on: true },
    { icon: Smartphone, name: "SMS", desc: "Mensajes de texto al teléfono del cliente.", on: false },
  ];
  const events = [
    { name: "Nueva cita reservada", desc: "Cuando un cliente reserva online.", on: true },
    { name: "Recordatorio 24h antes", desc: "Recordatorio automático un día antes.", on: true },
    { name: "Recordatorio 2h antes", desc: "Aviso final antes de la cita.", on: true },
    { name: "Cita cancelada", desc: "Cuando una cita es cancelada.", on: true },
    { name: "Cumpleaños del cliente", desc: "Saludo automático en su cumpleaños.", on: false },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="Canales de notificación" description="Selecciona por dónde se enviarán los mensajes.">
        <ul className="divide-y divide-border">
          {channels.map(c => (
            <li key={c.name} className="flex items-start justify-between gap-4 py-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <c.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
              <Switch defaultChecked={c.on} />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Eventos automáticos" description="Qué eventos disparan notificaciones a tus clientes.">
        <ul className="divide-y divide-border">
          {events.map(e => (
            <li key={e.name} className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-semibold">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.desc}</p>
              </div>
              <Switch defaultChecked={e.on} />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Mensaje de recordatorio" description="Personaliza el mensaje que reciben tus clientes.">
        <Textarea
          rows={4}
          defaultValue="Hola {nombre}, te recordamos tu cita de {servicio} en {negocio} el {fecha} a las {hora}. ¡Te esperamos!"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Variables: <code className="rounded bg-muted px-1">{"{nombre}"}</code> <code className="rounded bg-muted px-1">{"{servicio}"}</code> <code className="rounded bg-muted px-1">{"{negocio}"}</code> <code className="rounded bg-muted px-1">{"{fecha}"}</code> <code className="rounded bg-muted px-1">{"{hora}"}</code>
        </p>
        <div className="mt-4 flex justify-end">
          <Button>Guardar mensaje</Button>
        </div>
      </SectionCard>
    </div>
  );
}

/* ---------------- BRANDING ---------------- */
function BrandingTab() {
  const [color, setColor] = useState(COLORS[0].value);
  return (
    <div className="space-y-6">
      <SectionCard title="Color de marca" description="Se aplica en tu página pública de reservas.">
        <div className="flex flex-wrap gap-3">
          {COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={cn(
                "group relative h-14 w-14 rounded-2xl border-2 transition",
                color === c.value ? "border-foreground scale-105" : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
            >
              {color === c.value && (
                <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Página pública de reservas" description="URL donde tus clientes pueden agendar.">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1 rounded-lg border border-input bg-muted/50 px-3 py-2 font-mono text-sm">
            citaflex.app/<span className="font-semibold text-foreground">salon-bella</span>
          </div>
          <Button variant="outline">Copiar enlace</Button>
        </div>
        <div className="mt-6 space-y-4">
          <Toggle title="Permitir reservas online" desc="Los clientes pueden agendar desde tu página pública." defaultChecked />
          <Toggle title="Requerir confirmación manual" desc="Las reservas quedan pendientes hasta aprobarlas." />
          <Toggle title="Mostrar precios" desc="Visualiza el precio de cada servicio en la página pública." defaultChecked />
          <Toggle title="Permitir cancelación por el cliente" desc="El cliente puede cancelar hasta 2 horas antes." defaultChecked />
        </div>
      </SectionCard>

      <SectionCard title="Idioma y moneda">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Idioma</Label>
            <Select defaultValue="es-CO">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="es-CO">Español (Colombia)</SelectItem>
                <SelectItem value="es-ES">Español (España)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Moneda</Label>
            <Select defaultValue="COP">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COP">COP — Peso colombiano</SelectItem>
                <SelectItem value="USD">USD — Dólar</SelectItem>
                <SelectItem value="MXN">MXN — Peso mexicano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function Toggle({ title, desc, defaultChecked }: { title: string; desc: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
