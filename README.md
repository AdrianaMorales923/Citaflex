# Citaflex

Plataforma SaaS para gestionar citas, clientes y servicios, disenada para profesionales independientes y pequenos negocios en Barranquilla, Colombia (barberias, salones de belleza, medicos, fotografos, entrenadores, etc.).

## Stack

### Frontend

| Tecnologia           | Uso                     |
| -------------------- | ----------------------- |
| React 19             | UI library              |
| TypeScript 5.8       | Lenguaje                |
| Vite 7               | Build tool y dev server |
| TanStack Router      | Client-side routing     |
| Tailwind CSS 4       | Estilos utilitarios     |
| shadcn/ui + Radix UI | Componentes UI          |
| Recharts             | Graficas                |
| Lucide React         | Iconos                  |

### Backend

| Tecnologia            | Uso                                  |
| --------------------- | ------------------------------------ |
| Supabase              | PostgreSQL + autenticacion + storage |
| @supabase/supabase-js | Cliente JS para Supabase             |

## Funcionalidades

- **Autenticacion por roles:** Admin, Staff y Cliente con permisos diferenciados.
- **Dashboard:** KPIs (citas del dia, ingresos, clientes activos, ocupacion), proximas citas y resumen semanal.
- **Gestion de clientes:** CRUD completo, busqueda, filtros por etiqueta (VIP, Frecuente, Nuevo, Inactivo), historial y preferencias.
- **Gestion de servicios:** CRUD con categorias, duracion, precio, personal asignado y estado.
- **Gestion de personal:** CRUD de estilistas, barberos, manicuristas con conteo de citas.
- **Agenda de citas:** Creacion, edicion y cancelacion de citas con notificaciones.
- **Notificaciones:** Se crean automaticamente al agendar o cancelar citas y al registrar o eliminar clientes.
- **100% responsive:** Movil, tablet y escritorio.
- **En espanol:** Interfaz completa con moneda COP.

> Estado de implementacion abajo en [Estado de implementacion](#estado-de-implementacion):
> el detalle de cliente (`/app/clients/$id`) todavia usa datos de demostracion
> hardcodeados; el resto de vistas esta conectado a Supabase.

## Inicio rapido

```bash
npm install
cp .env.example .env
# Edita .env con tus credenciales de Supabase
npm run dev
```

## Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve al **SQL Editor** del dashboard
3. Copia y ejecuta el contenido de `supabase/database.sql`
4. Copia tu **Project URL** y **anon key** (Settings > API) al archivo `.env`

### Credenciales de prueba

| Rol     | Email                | Contrasena |
| ------- | -------------------- | ---------- |
| Admin   | admin@salonbella.co  | test1234   |
| Staff   | staff@salonbella.co  | test1234   |
| Cliente | client@salonbella.co | test1234   |

> La cuenta de cliente esta vinculada a la clienta "Valentina Gomez", que tiene
> citas pasadas y futuras, para que "Mis citas" e "Historial" tengan datos.

Estos usuarios (y toda la data de negocio, clientes, citas, horarios y
notificaciones) se crean al ejecutar `supabase/database.sql`. Las citas se generan
con fechas relativas a hoy (ademas de ~1800 citas historicas deterministas de los
ultimos 365 dias) para que el dashboard y los reportes muestren datos de inmediato.

### Estado de implementacion

| Vista                                   | Estado                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Dashboard (`/app`)                      | Conectado a Supabase                                                    |
| Citas `/app/appointments`               | Conectado (CRUD + notificaciones)                                       |
| Clientes `/app/clients`                 | Conectado (CRUD + historial)                                            |
| Servicios `/app/services`               | Conectado (CRUD + asignacion de personal)                               |
| Personal `/app/staff`                   | Conectado (listado + conteo de citas)                                   |
| Login / Registro / Recuperar contrasena | Conectado a Supabase Auth                                               |
| Reserva publica `/book`                 | Conectado (lee la BD real y crea citas)                                 |
| Estadisticas `/app/statistics`          | Conectado a Supabase (con filtros y exportacion CSV/PDF)                |
| Reportes `/app/reports`                 | Conectado a Supabase (5 fuentes + exportacion)                          |
| Configuracion `/app/settings`           | Conectado (perfil, horarios, equipo, notificaciones, marca)             |
| Mis citas `/app/my-appointments`        | Conectado (citas del cliente logueado + cancelacion)                    |
| Historial `/app/history`                | Conectado (visitas pasadas del cliente logueado)                        |
| Mi perfil `/app/profile`                | Conectado (perfil real editable, foto de perfil y cambio de contrasena) |
| Detalle de cliente `/app/clients/$id`   | **Demo**                                                                |

### Tablas

| Tabla           | Descripcion                              |
| --------------- | ---------------------------------------- |
| `users`         | Usuarios de autenticacion                |
| `profiles`      | Nombre, telefono, ubicacion, bio, avatar |
| `businesses`    | Negocios registrados                     |
| `staff`         | Personal asignado a un negocio           |
| `services`      | Servicios ofrecidos                      |
| `service_staff` | Relacion servicio <-> personal           |
| `clients`       | Clientes del negocio                     |
| `appointments`  | Citas agendadas                          |
| `notifications` | Notificaciones del sistema               |

## Despliegue en Vercel

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Autenticar
vercel login

# 3. Desplegar (desde la raiz del proyecto)
vercel --prod
```

O ver la guia completa en [DEPLOY.md](./DEPLOY.md).

## Scripts

| Comando           | Descripcion            |
| ----------------- | ---------------------- |
| `npm run dev`     | Servidor de desarrollo |
| `npm run build`   | Build de produccion    |
| `npm run preview` | Vista previa del build |
| `npm run lint`    | Ejecutar ESLint        |
