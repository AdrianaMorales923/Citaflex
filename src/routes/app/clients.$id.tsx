import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Scissors,
  User,
  Star,
  Heart,
  ClipboardList,
  Pencil,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Ban,
  Hash,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/clients/$id")({ component: ClientProfile });

type ClientTag = "VIP" | "Frecuente" | "Nuevo" | "Inactivo";
type ApptStatus = "Confirmada" | "Pendiente" | "Completada" | "Cancelada" | "No-show";

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
  allergies: string;
  referral: string;
}

const clientDb: Record<string, ClientDetail> = {
  "1": {
    id: "1", name: "María González", phone: "+57 300 123 4567", email: "maria@correo.com",
    address: "Calle 72 #45-12, Barranquilla", birthday: "15 Marzo", tag: "VIP",
    visits: 24, totalSpent: 2450000, registeredAt: "15 de enero, 2023",
    notes: "Cliente muy querida. Prefiere citas por la mañana. Tiene alergia a tintes con amoníaco. Siempre muy puntual y amable con todo el personal.",
    preferences: ["Mañana (8am-12pm)", "Productos orgánicos / sin amoníaco", "Profesional: Any"],
    allergies: "Amoníaco en tintes capilares. Piel sensible a ciertos productos químicos.",
    referral: "Google Maps",
  },
  "2": {
    id: "2", name: "Carlos Pérez", phone: "+57 310 555 8888", email: "carlos@correo.com",
    address: "Carrera 43 #75-90, Barranquilla", birthday: "8 Julio", tag: "Frecuente",
    visits: 12, totalSpent: 1200000, registeredAt: "3 de marzo, 2024",
    notes: "Paga siempre en efectivo. Le gusta conversar durante el servicio. Fanático del equipo Junior de Barranquilla.",
    preferences: ["Pago en efectivo", "Barbero: Juan", "Tarde (2pm-6pm)"],
    allergies: "",
    referral: "Referido por amigo",
  },
  "3": {
    id: "3", name: "Andrea López", phone: "+57 320 111 2222", email: "andrea@correo.com",
    address: "Av. Circunvalar #12-34, Barranquilla", birthday: "22 Noviembre", tag: "Frecuente",
    visits: 8, totalSpent: 850000, registeredAt: "10 de junio, 2024",
    notes: "Muy puntual. Siempre confirma la cita un día antes por WhatsApp.",
    preferences: ["Confirmación previa por WhatsApp", "Tarde (2pm-6pm)", "Servicios de uñas"],
    allergies: "",
    referral: "Instagram",
  },
  "4": {
    id: "4", name: "Jorge Mendoza", phone: "+57 305 333 4444", email: "jorge@correo.com",
    address: "Calle 84 #56-78, Barranquilla", birthday: "3 Enero", tag: "Nuevo",
    visits: 3, totalSpent: 280000, registeredAt: "28 de abril, 2025",
    notes: "Nuevo cliente, referido por María González. Interesado en tratamientos capilares.",
    preferences: ["Tratamientos capilares", "Mañana (8am-12pm)"],
    allergies: "",
    referral: "María González",
  },
  "5": {
    id: "5", name: "Lucía Vargas", phone: "+57 318 666 7777", email: "lucia@correo.com",
    address: "Carrera 52 #68-90, Barranquilla", birthday: "10 Mayo", tag: "VIP",
    visits: 18, totalSpent: 1950000, registeredAt: "5 de febrero, 2023",
    notes: "Cliente desde 2023. Siempre trae café para el equipo. Muy detallista y exigente con los diseños de uñas.",
    preferences: ["Uñas acrílicas", "Diseños elaborados", "Profesional: Valentina", "Sábados"],
    allergies: "Adhesivos de baja calidad",
    referral: "Facebook",
  },
  "6": {
    id: "6", name: "Ricardo Díaz", phone: "+57 312 999 0000", email: "ricardo@correo.com",
    address: "Av. Murillo #23-45, Barranquilla", birthday: "18 Agosto", tag: "Nuevo",
    visits: 1, totalSpent: 95000, registeredAt: "28 de marzo, 2025",
    notes: "Primera visita. Interesado en paquete mensual de barbería.",
    preferences: ["Evaluando paquete mensual"],
    allergies: "",
    referral: "Promoción Instagram",
  },
  "7": {
    id: "7", name: "Daniela Ríos", phone: "+57 315 444 3333", email: "daniela@correo.com",
    address: "Calle 93 #41-22, Barranquilla", birthday: "5 Septiembre", tag: "VIP",
    visits: 32, totalSpent: 3200000, registeredAt: "20 de noviembre, 2022",
    notes: "Cliente más antigua. Conoce a todo el personal. Celebra su cumpleaños con nosotros cada año.",
    preferences: ["Sábados", "Profesional: María", "Tratamientos faciales"],
    allergies: "",
    referral: "Volante",
  },
  "8": {
    id: "8", name: "Fernando Castro", phone: "+57 301 777 8888", email: "fernando@correo.com",
    address: "Carrera 38 #72-15, Barranquilla", birthday: "12 Abril", tag: "Frecuente",
    visits: 5, totalSpent: 450000, registeredAt: "15 de agosto, 2024",
    notes: "Trabaja por las tardes. Solo puede sábados por la mañana. Muy formal.",
    preferences: ["Sábados mañana", "Corte clásico"],
    allergies: "",
    referral: "Google Maps",
  },
  "9": {
    id: "9", name: "Sofía Martínez", phone: "+57 304 222 1111", email: "sofia@correo.com",
    address: "Calle 68 #48-30, Barranquilla", birthday: "30 Junio", tag: "Nuevo",
    visits: 2, totalSpent: 180000, registeredAt: "27 de marzo, 2025",
    notes: "Vino por promoción de Instagram. Le encantó el ambiente.",
    preferences: ["Promociones"],
    allergies: "",
    referral: "Instagram",
  },
  "10": {
    id: "10", name: "Alejandro Torres", phone: "+57 317 555 6666", email: "alejandro@correo.com",
    address: "Av. Boyacá #15-60, Barranquilla", birthday: "14 Febrero", tag: "Frecuente",
    visits: 15, totalSpent: 980000, registeredAt: "1 de febrero, 2024",
    notes: "Siempre llega 10 minutos tarde. Reservar con margen de tiempo.",
    preferences: ["Flexibilidad horaria", "Barba + Corte"],
    allergies: "",
    referral: "Amigo",
  },
  "11": {
    id: "11", name: "Camila Herrera", phone: "+57 319 888 9999", email: "camila@correo.com",
    address: "Carrera 46 #80-12, Barranquilla", birthday: "7 Octubre", tag: "Inactivo",
    visits: 0, totalSpent: 0, registeredAt: "10 de enero, 2025",
    notes: "Registrada pero nunca ha agendado. Seguimiento pendiente. Mandar promoción de bienvenida.",
    preferences: [],
    allergies: "",
    referral: "Web",
  },
  "12": {
    id: "12", name: "Mateo Gil", phone: "+57 313 111 2222", email: "mateo@correo.com",
    address: "Calle 76 #55-44, Barranquilla", birthday: "19 Diciembre", tag: "Frecuente",
    visits: 6, totalSpent: 520000, registeredAt: "12 de mayo, 2024",
    notes: "Prefiere servicios rápidos. No le gusta esperar. Muy directo.",
    preferences: ["Rapidez", "Corte express"],
    allergies: "",
    referral: "Google Maps",
  },
};

const appointmentHistory: Record<string, Appointment[]> = {
  "1": [
    { id: "a1", date: "25 May 2026", time: "10:00 AM", service: "Coloración y corte", staff: "Valentina", status: "Completada", price: 180000, notes: "Color cobrizo, corte en capas" },
    { id: "a2", date: "18 May 2026", time: "9:30 AM", service: "Tratamiento hidratante", staff: "María", status: "Completada", price: 120000, notes: "Mascarilla de keratina" },
    { id: "a3", date: "10 May 2026", time: "11:00 AM", service: "Corte y peinado", staff: "Valentina", status: "Completada", price: 95000, notes: "" },
    { id: "a4", date: "2 May 2026", time: "10:30 AM", service: "Coloración raíz", staff: "María", status: "Completada", price: 85000, notes: "Retoque de raíz" },
    { id: "a5", date: "25 Abr 2026", time: "9:00 AM", service: "Corte", staff: "Valentina", status: "Completada", price: 60000, notes: "" },
    { id: "a6", date: "18 Abr 2026", time: "10:00 AM", service: "Manicure y pedicure", staff: "Carla", status: "Cancelada", price: 70000, notes: "Canceló por enfermedad" },
    { id: "a7", date: "10 Abr 2026", time: "11:30 AM", service: "Coloración completa", staff: "María", status: "Completada", price: 150000, notes: "Rubio dorado" },
  ],
  "2": [
    { id: "b1", date: "21 May 2026", time: "4:00 PM", service: "Corte clásico + barba", staff: "Juan", status: "Completada", price: 45000, notes: "" },
    { id: "b2", date: "14 May 2026", time: "3:30 PM", service: "Corte clásico", staff: "Juan", status: "Completada", price: 35000, notes: "" },
    { id: "b3", date: "7 May 2026", time: "5:00 PM", service: "Corte + barba + cejas", staff: "Juan", status: "Completada", price: 55000, notes: "" },
  ],
  "3": [
    { id: "c1", date: "14 May 2026", time: "2:00 PM", service: "Uñas acrílicas", staff: "Valentina", status: "Completada", price: 95000, notes: "Diseño floral" },
    { id: "c2", date: "7 May 2026", time: "3:00 PM", service: "Pedicure spa", staff: "Carla", status: "Completada", price: 55000, notes: "" },
  ],
  "5": [
    { id: "d1", date: "27 May 2026", time: "11:00 AM", service: "Uñas acrílicas diseño", staff: "Valentina", status: "Completada", price: 120000, notes: "Diseño 3D con pedrería" },
    { id: "d2", date: "20 May 2026", time: "10:00 AM", service: "Relleno acrílico", staff: "Valentina", status: "Completada", price: 85000, notes: "" },
    { id: "d3", date: "13 May 2026", time: "11:30 AM", service: "Manicure permanente", staff: "Carla", status: "Completada", price: 65000, notes: "Rojo vino" },
  ],
  "7": [
    { id: "e1", date: "23 May 2026", time: "10:00 AM", service: "Facial rejuvenecedor", staff: "María", status: "Completada", price: 180000, notes: "" },
    { id: "e2", date: "16 May 2026", time: "9:30 AM", service: "Tratamiento capilar", staff: "Valentina", status: "Completada", price: 140000, notes: "Botox capilar" },
  ],
  "8": [
    { id: "f1", date: "7 May 2026", time: "9:00 AM", service: "Corte clásico", staff: "Juan", status: "Completada", price: 35000, notes: "" },
  ],
  "10": [
    { id: "g1", date: "13 May 2026", time: "5:00 PM", service: "Corte + barba", staff: "Juan", status: "Completada", price: 45000, notes: "Llegó 10 min tarde" },
    { id: "g2", date: "6 May 2026", time: "4:30 PM", service: "Corte", staff: "Juan", status: "Completada", price: 35000, notes: "" },
  ],
  "12": [
    { id: "h1", date: "30 Abr 2026", time: "2:00 PM", service: "Corte express", staff: "Juan", status: "Completada", price: 30000, notes: "" },
  ],
};

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
  "No-show": "bg-muted text-muted-foreground border-muted",
};

const statusIcon: Record<ApptStatus, typeof CheckCircle2> = {
  Confirmada: CheckCircle2,
  Pendiente: Clock,
  Completada: CheckCircle2,
  Cancelada: Ban,
  "No-show": AlertCircle,
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

function ClientProfile() {
  const { id } = Route.useParams();
  const client = clientDb[id] || clientDb["1"];
  const appointments = appointmentHistory[id] || [];
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const completed = appointments.filter((a) => a.status === "Completada");
  const canceled = appointments.filter((a) => a.status === "Cancelada");
  const totalApptValue = appointments.reduce((s, a) => s + a.price, 0);

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/clients"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a clientes
        </Link>
        <button
          onClick={() => setEditOpen(true)}
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
            <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider ${tagStyles[client.tag]}`}>
              {client.tag}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cliente desde {client.registeredAt} · {client.visits} visitas
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{client.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate max-w-[200px]">{client.email}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[240px]">{client.address}</span>
            </div>
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
            <p className="text-xs text-muted-foreground">Citas totales</p>
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
          <TabsTrigger value="info" className="rounded-lg text-sm">Información</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-sm">Historial de citas</TabsTrigger>
          <TabsTrigger value="notes" className="rounded-lg text-sm">Notas y preferencias</TabsTrigger>
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
                  <span className="font-medium">{client.phone}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{client.email}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Dirección</span>
                  <span className="font-medium text-right max-w-[60%]">{client.address}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Cumpleaños</span>
                  <span className="font-medium">{client.birthday}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Registrado</span>
                  <span className="font-medium">{client.registeredAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referido por</span>
                  <span className="font-medium">{client.referral || "—"}</span>
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
                    <span key={pref} className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
                      <Star className="h-3 w-3" /> {pref}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay preferencias registradas.</p>
              )}

              <h3 className="mb-3 mt-6 flex items-center gap-2 font-display font-semibold">
                <AlertCircle className="h-4 w-4 text-destructive" /> Alergias y advertencias
              </h3>
              {client.allergies ? (
                <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3 text-sm text-destructive">
                  {client.allergies}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin alergias registradas.</p>
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
                          <tr key={a.id} className="border-b border-border transition-colors hover:bg-muted/40">
                            <td className="px-4 py-3">
                              <div className="font-medium">{a.date}</div>
                              <div className="text-xs text-muted-foreground">{a.time}</div>
                            </td>
                            <td className="px-4 py-3 font-medium">{a.service}</td>
                            <td className="px-4 py-3 text-muted-foreground">{a.staff}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`gap-1 text-[10px] font-semibold uppercase ${statusStyles[a.status]}`}>
                                <StatusIcon className="h-3 w-3" /> {a.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{formatMoney(a.price)}</td>
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
                    <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-display font-semibold">{a.service}</p>
                          <p className="text-xs text-muted-foreground">{a.date} · {a.time}</p>
                        </div>
                        <Badge variant="outline" className={`gap-1 text-[10px] font-semibold uppercase ${statusStyles[a.status]}`}>
                          <StatusIcon className="h-3 w-3" /> {a.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{a.staff}</span>
                        <span className="font-semibold">{formatMoney(a.price)}</span>
                      </div>
                      {a.notes && (
                        <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">{a.notes}</p>
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
            <div className="rounded-lg bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
              {client.notes}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
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

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                <AlertCircle className="h-4 w-4 text-destructive" /> Alergias y advertencias
              </h3>
              {client.allergies ? (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{client.allergies}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin alergias ni advertencias registradas.</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Editar cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre completo</label>
              <input defaultValue={client.name} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teléfono</label>
                <input defaultValue={client.phone} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <input defaultValue={client.email} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dirección</label>
              <input defaultValue={client.address} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cumpleaños</label>
                <input defaultValue={client.birthday} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Etiqueta</label>
                <select defaultValue={client.tag} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option>VIP</option>
                  <option>Frecuente</option>
                  <option>Nuevo</option>
                  <option>Inactivo</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Alergias / Advertencias</label>
              <input defaultValue={client.allergies} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Ej. Alergia a tintes con amoníaco" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas</label>
              <textarea defaultValue={client.notes} className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditOpen(false)} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
            <button onClick={() => setEditOpen(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Save className="h-4 w-4" /> Guardar cambios
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
