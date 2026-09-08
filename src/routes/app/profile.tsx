import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useRole, ROLE_LABEL } from "@/lib/role-context";
import { useAuth } from "@/lib/auth-context";
import supabase from "@/lib/supabase";
import { fileToResizedDataUrl } from "@/lib/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const { role, profile, refreshProfile } = useRole();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    bio: profile.bio,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      bio: profile.bio,
    });
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        location: form.location.trim() || null,
        bio: form.bio.trim() || null,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      toast.error("Error al guardar: " + error.message);
      return;
    }
    toast.success("Perfil actualizado correctamente");
    await refreshProfile();
  };

  const handleAvatar = async (file: File | undefined) => {
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 256);
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, avatar_url: dataUrl }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
      await refreshProfile();
      toast.success("Foto de perfil actualizada");
    } catch (err) {
      toast.error("No se pudo subir la foto: " + (err as Error).message);
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-surface animate-fade-up relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/20 via-chart-5/20 to-chart-2/20" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-chart-5 text-3xl font-bold text-primary-foreground shadow-elegant">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                profile.initials
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-card shadow-sm transition hover:bg-accent disabled:opacity-60"
              aria-label="Cambiar foto"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAvatar(e.target.files?.[0])}
            />
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
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {profile.org}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {profile.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Miembro desde {profile.since}
              </span>
            </div>
          </div>
        </div>
      </div>

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
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" className="pl-9" type="email" value={form.email} readOnly />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    className="pl-9"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Ciudad</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="location"
                    className="pl-9"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">
                {role === "client" ? "Notas y preferencias" : "Biografía profesional"}
              </Label>
              <Textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm({
                    name: profile.name,
                    email: profile.email,
                    phone: profile.phone,
                    location: profile.location,
                    bio: profile.bio,
                  })
                }
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="security">
          <div className="card-surface space-y-4 p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Contraseña</h3>
                <p className="text-sm text-muted-foreground">
                  Elige una contraseña nueva. Se te pedirá al iniciar sesión.
                </p>
              </div>
              <Button variant="outline" onClick={() => setPwOpen(true)}>
                Cambiar
              </Button>
            </div>
          </div>
          <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
        </TabsContent>

        <TabsContent value="preferences">
          <NotificationPrefs />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (next !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    const { data: check } = await supabase
      .from("users")
      .select("id")
      .eq("id", user!.id)
      .eq("password_hash", current)
      .maybeSingle();
    if (!check) {
      setBusy(false);
      toast.error("La contraseña actual no es correcta");
      return;
    }
    const { error } = await supabase
      .from("users")
      .update({ password_hash: next })
      .eq("id", user!.id);
    setBusy(false);
    if (error) {
      toast.error("No se pudo cambiar la contraseña: " + error.message);
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    onOpenChange(false);
    toast.success("Contraseña actualizada correctamente");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">Contraseña actual</Label>
            <Input
              id="pw-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">Contraseña nueva</Label>
            <Input
              id="pw-new"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">Confirmar contraseña nueva</Label>
            <Input
              id="pw-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy || !current || !next || !confirm}>
            {busy ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const NOTIF_KEY = (uid: string) => `citaflex.notif-prefs.${uid}`;

const DEFAULT_PREFS = { email: true, whatsapp: true, sms: false, reminders: true };

type NotifPrefs = typeof DEFAULT_PREFS;

function NotificationPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || loaded) return;
    try {
      const raw = window.localStorage.getItem(NOTIF_KEY(user.id));
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      /* noop */
    }
    setLoaded(true);
  }, [user, loaded]);

  const toggle = (k: keyof NotifPrefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      window.localStorage.setItem(NOTIF_KEY(user.id), JSON.stringify(prefs));
      await new Promise((r) => setTimeout(r, 300));
      toast.success("Preferencias guardadas");
    } catch {
      toast.error("No se pudieron guardar las preferencias");
    } finally {
      setSaving(false);
    }
  };

  const items: { key: keyof NotifPrefs; title: string; desc: string }[] = [
    { key: "email", title: "Correo electrónico", desc: "Recibir notificaciones por correo." },
    { key: "whatsapp", title: "WhatsApp", desc: "Confirmaciones y recordatorios por WhatsApp." },
    { key: "sms", title: "SMS", desc: "Mensajes de texto al teléfono." },
    {
      key: "reminders",
      title: "Recordatorios de citas",
      desc: "Avisos antes de tus próximas citas.",
    },
  ];

  return (
    <div className="card-surface space-y-1 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-chart-5/10 text-chart-5">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Notificaciones</h3>
          <p className="text-sm text-muted-foreground">
            Elige cómo y cuándo quieres recibir alertas.
          </p>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {items.map((it) => (
          <li key={it.key} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold">{it.title}</p>
              <p className="text-xs text-muted-foreground">{it.desc}</p>
            </div>
            <Switch checked={prefs[it.key]} onCheckedChange={() => toggle(it.key)} />
          </li>
        ))}
      </ul>
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Guardando..." : "Guardar preferencias"}
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
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

function AdminStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Users} label="Equipo" value="6" tone="bg-primary/10 text-primary" />
      <StatCard
        icon={Calendar}
        label="Citas este mes"
        value="428"
        tone="bg-chart-2/10 text-chart-2"
      />
      <StatCard
        icon={Briefcase}
        label="Servicios activos"
        value="18"
        tone="bg-chart-5/10 text-chart-5"
      />
      <StatCard
        icon={Sparkles}
        label="Rating negocio"
        value="4.9"
        tone="bg-warning/20 text-warning-foreground"
      />
    </div>
  );
}
function StaffStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={Calendar}
        label="Citas esta semana"
        value="32"
        tone="bg-primary/10 text-primary"
      />
      <StatCard
        icon={Users}
        label="Clientes atendidos"
        value="184"
        tone="bg-chart-2/10 text-chart-2"
      />
      <StatCard
        icon={Star}
        label="Rating personal"
        value="4.8"
        tone="bg-warning/20 text-warning-foreground"
      />
      <StatCard
        icon={Award}
        label="Servicio destacado"
        value="Color"
        tone="bg-chart-5/10 text-chart-5"
      />
    </div>
  );
}
function ClientStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={Calendar}
        label="Próxima cita"
        value="Sáb 10:00"
        tone="bg-primary/10 text-primary"
      />
      <StatCard icon={Clock} label="Visitas totales" value="14" tone="bg-chart-2/10 text-chart-2" />
      <StatCard
        icon={Sparkles}
        label="Servicio favorito"
        value="Corte"
        tone="bg-chart-5/10 text-chart-5"
      />
      <StatCard
        icon={Star}
        label="Puntos fidelidad"
        value="240"
        tone="bg-warning/20 text-warning-foreground"
      />
    </div>
  );
}
