import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRole, ROLE_LABEL } from "@/lib/role-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Building2,
  Shield,
  Camera,
  KeyRound,
  Bell,
  Users,
  Calendar,
  Star,
  Award,
  Briefcase,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { role, profile } = useRole();
  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    bio: profile.bio,
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Perfil actualizado correctamente");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-surface animate-fade-up relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/20 via-chart-5/20 to-chart-2/20" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative">
            <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-5 text-3xl font-bold text-primary-foreground shadow-elegant">
              {profile.initials}
            </div>
            <button
              onClick={() => toast.info("Cambio de avatar disponible pronto")}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-card shadow-sm transition hover:bg-accent"
              aria-label="Cambiar foto"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{profile.name}</h2>
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" /> {ROLE_LABEL[role]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{profile.title}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {profile.org}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.location}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Miembro desde {profile.since}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific stats */}
      {role === "admin" && <AdminStats />}
      {role === "staff" && <StaffStats />}
      {role === "client" && <ClientStats />}

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información personal</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <form onSubmit={save} className="card-surface space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" className="pl-9" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="phone" className="pl-9" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Ciudad</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="location" className="pl-9" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">{role === "client" ? "Notas y preferencias" : "Biografía profesional"}</Label>
              <Textarea id="bio" rows={4} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setForm({ name: profile.name, email: profile.email, phone: profile.phone, location: profile.location, bio: profile.bio })}>
                Cancelar
              </Button>
              <Button type="submit">Guardar cambios</Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="security">
          <div className="card-surface space-y-4 p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></div>
              <div className="flex-1">
                <h3 className="font-semibold">Contraseña</h3>
                <p className="text-sm text-muted-foreground">Última actualización hace 2 meses</p>
              </div>
              <Button variant="outline" onClick={() => toast.info("Flujo de cambio de contraseña (demo)")}>Cambiar</Button>
            </div>
            <div className="flex items-start gap-3 border-t border-border pt-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-success/10 text-success"><Shield className="h-5 w-5" /></div>
              <div className="flex-1">
                <h3 className="font-semibold">Autenticación en dos pasos</h3>
                <p className="text-sm text-muted-foreground">Añade una capa extra de seguridad a tu cuenta.</p>
              </div>
              <Button variant="outline" onClick={() => toast.success("2FA activada (demo)")}>Activar</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <div className="card-surface space-y-4 p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-chart-5/10 text-chart-5"><Bell className="h-5 w-5" /></div>
              <div className="flex-1">
                <h3 className="font-semibold">Notificaciones</h3>
                <p className="text-sm text-muted-foreground">Recibe recordatorios y alertas por correo y SMS.</p>
              </div>
              <Button variant="outline" onClick={() => toast.success("Preferencias guardadas")}>Configurar</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone: string }) {
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

function AdminStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Users} label="Equipo" value="6" tone="bg-primary/10 text-primary" />
      <StatCard icon={Calendar} label="Citas este mes" value="428" tone="bg-chart-2/10 text-chart-2" />
      <StatCard icon={Briefcase} label="Servicios activos" value="18" tone="bg-chart-5/10 text-chart-5" />
      <StatCard icon={Sparkles} label="Rating negocio" value="4.9" tone="bg-warning/20 text-warning-foreground" />
    </div>
  );
}
function StaffStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Calendar} label="Citas esta semana" value="32" tone="bg-primary/10 text-primary" />
      <StatCard icon={Users} label="Clientes atendidos" value="184" tone="bg-chart-2/10 text-chart-2" />
      <StatCard icon={Star} label="Rating personal" value="4.8" tone="bg-warning/20 text-warning-foreground" />
      <StatCard icon={Award} label="Servicio destacado" value="Color" tone="bg-chart-5/10 text-chart-5" />
    </div>
  );
}
function ClientStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Calendar} label="Próxima cita" value="Sáb 10:00" tone="bg-primary/10 text-primary" />
      <StatCard icon={Clock} label="Visitas totales" value="14" tone="bg-chart-2/10 text-chart-2" />
      <StatCard icon={Sparkles} label="Servicio favorito" value="Corte" tone="bg-chart-5/10 text-chart-5" />
      <StatCard icon={Star} label="Puntos fidelidad" value="240" tone="bg-warning/20 text-warning-foreground" />
    </div>
  );
}
