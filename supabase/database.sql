-- ============================================================================
-- Citaflex — Esquema completo de la base de datos + datos de demostracion
-- ============================================================================
-- Como usarlo:
--   1. Crea un proyecto en https://supabase.com
--   2. Abre el SQL Editor del dashboard
--   3. Pega TODO este archivo y ejecutalo (presiona "Run")
--   4. Copia "Project URL" y "anon key" (Settings > API) a tu archivo .env
--
-- Usuarios creados (contraseña: test1234):
--   admin@salonbella.co  (rol admin)
--   staff@salonbella.co  (rol staff)
--   client@salonbella.co (rol client)
--
-- Datos de demostracion:
--   - 8 clientes con historial, preferencias y alertas.
--   - Citas historicas generadas para los ultimos 365 dias (~1.800 registros,
--     deterministas e idempotentes) para que Dashboard, Agenda, Estadisticas y
--     Reportes tengan datos reales desde el primer dia.
--   - Configuracion de negocio (horarios, equipo, notificaciones, marca).
--
-- Nota: el script es idempotente (se puede re-ejecutar sin romper nada).
--
-- Si el SQL Editor reporta "deadlock detected (40P01)": la app desplegada esta
-- consultando la misma base mientras el script corre. Vuelve a ejecutarlo;
-- el reintento es rapido porque los DDL ya estan aplicados (IF NOT EXISTS).
-- ============================================================================

-- ============================================================================
-- 1) TABLAS
-- ============================================================================

-- Usuarios de la app. Login directo con email + password (sin Supabase Auth);
-- la contrasena se guarda en texto plano porque es una demo de un solo negocio.
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null default '',
  role          text not null default 'client' check (role in ('admin', 'staff', 'client')),
  business_name text,
  created_at    timestamptz not null default now()
);

-- Perfil publico de cada usuario (nombre, telefono, org, cargo)
create table if not exists public.profiles (
  user_id    uuid primary key references public.users (id) on delete cascade,
  name       text,
  phone      text,
  org        text,
  title      text,
  bio        text,
  location   text default 'Barranquilla, Colombia',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Negocio registrado en la plataforma
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references public.users (id) on delete set null,
  name        text not null,
  category    text default 'belleza',
  phone       text,
  email       text,
  address     text,
  city        text default 'Barranquilla',
  country     text default 'Colombia',
  currency    text default 'COP',
  description text,
  logo_url    text,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Horarios de atencion del negocio (dias de la semana)
create table if not exists public.business_hours (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  day         text not null check (day in ('mon','tue','wed','thu','fri','sat','sun')),
  enabled     boolean not null default true,
  open_time   time not null default '08:00',
  close_time  time not null default '19:00',
  unique (business_id, day)
);

-- Personal / staff del negocio
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  role        text default 'Estilista',
  rating      numeric(2,1) default 5.0,
  color       text,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Servicios ofrecidos por el negocio
create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  name        text not null,
  category    text not null default 'Cabello',
  duration    integer not null default 60,   -- minutos
  price       integer not null default 0,    -- COP
  description text,
  status      text not null default 'Activo' check (status in ('Activo', 'Inactivo')),
  created_at  timestamptz not null default now()
);

-- Relacion servicio <-> personal (quien puede atender que)
create table if not exists public.service_staff (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  staff_id   uuid not null references public.staff (id) on delete cascade,
  unique (service_id, staff_id)
);

-- Clientes del negocio
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  user_id     uuid references public.users (id) on delete cascade,
  name        text not null,
  phone       text,
  email       text,
  address     text,
  birthday    date,
  tag         text not null default 'Nuevo' check (tag in ('VIP','Frecuente','Nuevo','Inactivo')),
  allergies   text,
  preferences text,
  referral    text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Citas agendadas
create table if not exists public.appointments (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  date        date not null,
  time        time not null,
  client_id   uuid not null references public.clients (id) on delete cascade,
  service_id  uuid not null references public.services (id) on delete cascade,
  staff_id    uuid not null references public.staff (id) on delete cascade,
  status      text not null default 'Pendiente'
              check (status in ('Pendiente','Confirmada','Completada','Cancelada')),
  notes       text,
  created_at  timestamptz not null default now()
);

-- Notificaciones por usuario
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  title       text not null,
  description text,
  tone        text not null default 'primary',  -- primary | success | warning
  icon        text not null default 'Calendar', -- Calendar|UserPlus|Star|Clock|AlertCircle|CheckCircle2
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Compatibilidad con ejecuciones anteriores del script:
-- las columnas nuevas deben existir ANTES de crear los indices que las usan
alter table if exists public.clients add column if not exists user_id uuid references public.users (id) on delete cascade;
alter table if exists public.profiles add column if not exists location text default 'Barranquilla, Colombia';
alter table if exists public.businesses add column if not exists category text default 'belleza';
alter table if exists public.businesses add column if not exists email text;
alter table if exists public.businesses add column if not exists description text;
alter table if exists public.businesses add column if not exists logo_url text;
alter table if exists public.businesses add column if not exists settings jsonb default '{}'::jsonb;
alter table if exists public.clients add column if not exists allergies text;
alter table if exists public.clients add column if not exists preferences text;
alter table if exists public.clients add column if not exists referral text;
alter table if exists public.services add column if not exists color text;

-- updated_at para las tablas que la app mantiene (sync/realtime/auditoria).
-- Debe estar antes de los triggers e indices que lo usan.
alter table if exists public.users          add column if not exists updated_at timestamptz not null default now();
alter table if exists public.profiles       add column if not exists updated_at timestamptz not null default now();
alter table if exists public.businesses     add column if not exists updated_at timestamptz not null default now();
alter table if exists public.business_hours add column if not exists updated_at timestamptz not null default now();
alter table if exists public.staff          add column if not exists updated_at timestamptz not null default now();
alter table if exists public.services       add column if not exists updated_at timestamptz not null default now();
alter table if exists public.clients        add column if not exists updated_at timestamptz not null default now();
alter table if exists public.appointments   add column if not exists updated_at timestamptz not null default now();
alter table if exists public.notifications  add column if not exists updated_at timestamptz not null default now();

-- Antes la app usaba Supabase Auth y las FK apuntaban a auth.users. Ahora el
-- login es por consulta directa a public.users, asi que las FK se re-encadenan
-- a esa tabla (idempotente: se elimina y se vuelve a crear el mismo constraint).
alter table public.profiles      drop constraint if exists profiles_user_id_fkey;
alter table public.profiles      add constraint profiles_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade;
alter table public.clients       drop constraint if exists clients_user_id_fkey;
alter table public.clients       add constraint clients_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade;
alter table public.notifications drop constraint if exists notifications_user_id_fkey;
alter table public.notifications add constraint notifications_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade;

-- COMMIT tras las ALTER de compatibilidad: libera los bloqueos exclusivos
-- de las tablas antes de seguir. Evita "deadlock detected (40P01)" con las
-- consultas de la app desplegada mientras se re-ejecuta este script.
commit;

-- Indices para las consultas mas comunes.
-- Cada indice se confirma de inmediato para NO acumular bloqueos exclusivos
-- sobre varias tablas a la vez (un bloqueo largo + consultas de la app = deadlock).
create index if not exists appointments_date_idx      on public.appointments (date);
commit;
create index if not exists appointments_client_idx    on public.appointments (client_id);
commit;
create index if not exists appointments_status_idx    on public.appointments (status);
commit;
create index if not exists notifications_user_idx     on public.notifications (user_id, created_at desc);
commit;
create index if not exists service_staff_service_idx  on public.service_staff (service_id);
commit;
create index if not exists clients_tag_idx     on public.clients (tag);
commit;
create index if not exists clients_user_idx    on public.clients (user_id);
commit;

-- Horario valido: la apertura siempre debe ser anterior al cierre.
-- Idempotente (add constraint no soporta "if not exists").
do $$
begin
  begin
    alter table public.business_hours add constraint business_hours_open_before_close
      check (open_time < close_time);
  exception when duplicate_object then null;
  end;
end $$;
commit;

-- Moneda del negocio: la app solo soporta COP y USD (AGENTS.md); el check evita
-- valores invalidos al insertar/editar.
do $$
begin
  begin
    alter table public.businesses add constraint businesses_currency_valid
      check (currency in ('COP', 'USD'));
  exception when duplicate_object then null;
  end;
end $$;
commit;

-- Indices para las FK mas consultadas (faltaban: la agenda filtra por
-- business_id/fecha/staff; el ledger agrupa por negocio y staff).
create index if not exists appointments_business_idx on public.appointments (business_id);
commit;
create index if not exists appointments_staff_idx    on public.appointments (staff_id);
commit;
create index if not exists appointments_service_idx   on public.appointments (service_id);
commit;
create index if not exists services_business_idx      on public.services (business_id);
commit;
create index if not exists staff_business_idx         on public.staff (business_id);
commit;
create index if not exists business_hours_business_idx on public.business_hours (business_id);
commit;
create index if not exists businesses_owner_idx       on public.businesses (owner_id);
commit;
create index if not exists clients_business_idx       on public.clients (business_id);
commit;

-- updated_at se mantiene solo (null si nunca se modifico). La funcion es
-- idempotente; los triggers se eliminan y recrean por tabla con su propio
-- COMMIT para no acumular bloqueos exclusivos (misma razon que los indices).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
commit;

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();
commit;

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
commit;

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at before update on public.services
  for each row execute function public.set_updated_at();
commit;

drop trigger if exists trg_staff_updated_at on public.staff;
create trigger trg_staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();
commit;

drop trigger if exists trg_businesses_updated_at on public.businesses;
create trigger trg_businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
commit;

drop trigger if exists trg_business_hours_updated_at on public.business_hours;
create trigger trg_business_hours_updated_at before update on public.business_hours
  for each row execute function public.set_updated_at();
commit;

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();
commit;

-- ============================================================================
-- 2) PERMISOS (rol anon)
-- ============================================================================
-- Sin Supabase Auth, la app consulta SIEMPRE como rol "anon" (no hay sesion
-- JWT en la base). Por eso anon tiene acceso completo a tablas y sequences.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ============================================================================
-- 3) SIN ROW LEVEL SECURITY
-- ============================================================================
-- El login es una consulta directa a public.users (email + password) y la
-- sesion vive en localStorage del navegador, sin JWT de Supabase Auth. Por eso
-- la app entera consulta como rol "anon" y RLS no podria distinguir usuarios:
-- se desactiva en TODAS las tablas (demo de un solo negocio). El filtro por
-- usuario de las notificaciones lo hace la propia app
-- (WHERE user_id = <id de la sesion guardada en localStorage>).

alter table public.users         disable row level security;
alter table public.businesses    disable row level security;
alter table public.business_hours disable row level security;
alter table public.staff         disable row level security;
alter table public.services      disable row level security;
alter table public.service_staff disable row level security;
alter table public.clients       disable row level security;
alter table public.appointments  disable row level security;
alter table public.profiles      disable row level security;
alter table public.notifications disable row level security;

-- Politicas anteriores (referian auth.uid(), que ya no existe): se eliminan
-- para no dar falsas expectativas de aislamiento entre usuarios.
drop policy if exists "users_select_own"  on public.users;
drop policy if exists "users_insert_own"  on public.users;
drop policy if exists "users_update_own"  on public.users;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "notifications_all_own" on public.notifications;
drop policy if exists "biz_all_authenticated" on public.businesses;
drop policy if exists "biz_read_anon"         on public.businesses;
drop policy if exists "hours_all_authenticated" on public.business_hours;
drop policy if exists "hours_read_anon"         on public.business_hours;
drop policy if exists "staff_all_authenticated" on public.staff;
drop policy if exists "staff_read_anon"         on public.staff;
drop policy if exists "services_all_authenticated" on public.services;
drop policy if exists "services_read_anon"         on public.services;
drop policy if exists "junc_all_authenticated" on public.service_staff;
drop policy if exists "junc_read_anon"         on public.service_staff;
drop policy if exists "clients_all_authenticated" on public.clients;
drop policy if exists "appointments_all_authenticated" on public.appointments;
drop policy if exists "clients_insert_anon" on public.clients;
drop policy if exists "appointments_read_anon" on public.appointments;
drop policy if exists "appointments_insert_anon" on public.appointments;

-- ============================================================================
-- 3.9) NOTIFICACIONES
-- ============================================================================

-- Vinculo opcional notificacion -> cita (click en la campana navega a la cita).
-- DEBE ir ANTES de las funciones que insertan en notifications (referencian la
-- columna); si el script falla en el create function, la columna no existe.
alter table public.notifications add column if not exists appointment_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_appointment_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_appointment_id_fkey
      foreign key (appointment_id) references public.appointments(id) on delete cascade;
  end if;
end $$;
commit;

-- Funciones para crear notificaciones: se ejecutan como dueno de las tablas
-- (security definer), asi cualquier flujo (reserva publica, registro, citas
-- del panel) puede notificar a otros usuarios sin INSERT global en la app.
-- appointment_id es opcional: cuando la notificacion se refiere a una cita,
-- el frontend la usa para navegar a la cita al hacer click.
create or replace function public.create_notification(
  user_id uuid,
  title text,
  description text,
  tone text default 'primary',
  icon text default 'Calendar',
  appointment_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, description, tone, icon, appointment_id)
  values (user_id, title, description, tone, icon, appointment_id);
$$;

create or replace function public.notify_roles(
  roles text[],
  title text,
  description text,
  tone text default 'primary',
  icon text default 'Calendar',
  appointment_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, description, tone, icon, appointment_id)
  select u.id, title, description, tone, icon, appointment_id
  from public.users u
  where u.role = any(roles);
$$;

revoke all on function public.create_notification(uuid, text, text, text, text, uuid) from public;
grant execute on function public.create_notification(uuid, text, text, text, text, uuid) to anon, authenticated;
revoke all on function public.notify_roles(text[], text, text, text, text, uuid) from public;
grant execute on function public.notify_roles(text[], text, text, text, text, uuid) to anon, authenticated;

-- Notificaciones en tiempo real: la campanita se actualiza sin recargar.
-- La app filtra por user_id al suscribirse, asi solo llegan las suyas.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
commit;

-- ============================================================================
-- 4) DATOS DE DEMOSTRACION
-- ============================================================================

-- --- 4.1 + 4.2 Usuarios de la app y perfiles ---
-- Sin Supabase Auth: las cuentas se crean directo en public.users con la
-- contrasena en texto plano (demo). Re-ejecutar el script SIEMPRE restaura
-- la contrasena de prueba (test1234) y el rol de las cuentas demo, aunque
-- existan filas creadas por ejecuciones anteriores (on conflict (email)).
do $$
declare
  v_admin uuid;
  v_staff uuid;
  v_client uuid;
begin
  insert into public.users (id, email, password_hash, role, business_name) values
    ('00000000-0000-4000-8000-000000000001', 'admin@salonbella.co',  'test1234', 'admin',  'Salon Bella Barranquilla'),
    ('00000000-0000-4000-8000-000000000002', 'staff@salonbella.co',  'test1234', 'staff',  null),
    ('00000000-0000-4000-8000-000000000003', 'client@salonbella.co', 'test1234', 'client', null)
  on conflict (email) do update
    set password_hash = excluded.password_hash,
        role          = excluded.role,
        business_name = excluded.business_name;

  -- IDs reales de las cuentas demo (pueden no ser los fijos si existian antes)
  select id into v_admin from public.users where email = 'admin@salonbella.co';
  select id into v_staff from public.users where email = 'staff@salonbella.co';
  select id into v_client from public.users where email = 'client@salonbella.co';

  insert into public.profiles (user_id, name, phone, org, title) values
    (v_admin,  'Maria Rodriguez', '+57 300 555 0101', 'Salon Bella Barranquilla', 'Administradora'),
    (v_staff,  'Laura Restrepo',  '+57 300 555 0102', 'Salon Bella Barranquilla', 'Estilista Senior'),
    (v_client, 'Valentina Gomez', '+57 310 100 0001', 'Salon Bella Barranquilla', 'Cliente')
  on conflict (user_id) do nothing;
end $$;

-- --- 4.3 Negocio y horarios ---
insert into public.businesses (id, owner_id, name, phone, address, city, country, currency) values
  ('10000000-0000-4000-8000-000000000001',
   (select id from public.users where email = 'admin@salonbella.co'),
   'Salon Bella Barranquilla', '+57 300 555 0100', 'Cra. 53 # 74-120, Barranquilla', 'Barranquilla', 'Colombia', 'COP')
on conflict (id) do nothing;

insert into public.business_hours (id, business_id, day, enabled, open_time, close_time) values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'mon', true, '08:00', '19:00'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'tue', true, '08:00', '19:00'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'wed', true, '08:00', '19:00'),
  ('80000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'thu', true, '08:00', '19:00'),
  ('80000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'fri', true, '08:00', '20:00'),
  ('80000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'sat', true, '09:00', '18:00'),
  ('80000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'sun', false, '09:00', '15:00')
on conflict (business_id, day) do nothing;

-- --- 4.4 Personal ---
insert into public.staff (id, business_id, name, email, phone, role, rating) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Maria Gonzalez', 'maria@salonbella.co',  '+57 300 111 2233', 'Estilista Senior', 4.9),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Laura Restrepo', 'laura@salonbella.co',  '+57 300 444 5566', 'Estilista Senior', 4.8),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Camilo Vargas',  'camilo@salonbella.co', '+57 300 777 8899', 'Barbero',        4.7),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Sara Lopez',     'sara@salonbella.co',   '+57 300 222 3344', 'Manicurista',    4.9)
on conflict (id) do nothing;

-- --- 4.5 Servicios ---
insert into public.services (id, business_id, name, category, duration, price, description, status) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Corte + Peinado',     'Cabello',     45,  40000, 'Corte profesional con lavado y peinado.',        'Activo'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Coloracion',          'Cabello',     90,  95000, 'Coloracion completa con productos premium.',     'Activo'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Manicure',            'Uñas',        60,  30000, 'Manicure clasica con esmaltado.',                 'Activo'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Tratamiento capilar', 'Cabello',     60,  70000, 'Hidratacion profunda y reparacion.',             'Activo'),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Maquillaje',          'Maquillaje',  60,  80000, 'Maquillaje social o de evento.',                  'Activo')
on conflict (id) do nothing;

-- Colores de marca por servicio (la columna ya existe; este UPDATE ademas aplica
-- a bases pre-existentes que los creo sin color).
update public.services s set color = v.color
from (values
  ('30000000-0000-4000-8000-000000000001', '#6366f1'),
  ('30000000-0000-4000-8000-000000000002', '#ec4899'),
  ('30000000-0000-4000-8000-000000000003', '#f43f5e'),
  ('30000000-0000-4000-8000-000000000004', '#14b8a6'),
  ('30000000-0000-4000-8000-000000000005', '#f59e0b')
) as v(id, color)
where s.id = v.id::uuid;

-- --- 4.6 Servicios disponibles por personal ---
insert into public.service_staff (id, service_id, staff_id) values
  ('70000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002'),
  ('70000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003'),
  ('70000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002'),
  ('70000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004'),
  ('70000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002'),
  ('70000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004')
on conflict (service_id, staff_id) do nothing;

-- --- 4.7 Clientes ---
insert into public.clients (id, business_id, name, phone, email, address, birthday, tag, notes) values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Valentina Gomez', '+57 310 100 0001', 'valentina.gomez@gmail.com', 'Cra. 59 # 72-110', '1995-03-14', 'VIP',      'Cliente muy frecuente. Prefiere a Maria.'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Carlos Mendez',   '+57 310 100 0002', 'carlos.mendez@yahoo.com',   'Calle 84 # 48-33',  '1988-07-22', 'Frecuente','Viene cada dos semanas para corte.'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Ana Sofia Rios',  '+57 310 100 0003', 'anasofia.rios@gmail.com',   'Cra. 53 # 98-40',   '1999-01-09', 'VIP',      'Se hace color cada mes.'),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Jorge Pena',      '+57 310 100 0004', 'jorge.pena@hotmail.com',    'Calle 76 # 40-22',  '1992-11-30', 'Frecuente','Cliente de barberia, prefiere a Camilo.'),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Daniela Guzman',  '+57 310 100 0005', 'dani.guzman@gmail.com',     'Cra. 43 # 82-15',   '2001-05-18', 'Nuevo',    'Se registro para tratamiento capilar.'),
  ('40000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Felipe Castro',   '+57 310 100 0006', 'felipe.castro@gmail.com',   'Calle 55 # 35-80',  '1985-09-02', 'Frecuente','Cliente antiguo de manicure.'),
  ('40000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'Laura Jimenez',   '+57 310 100 0007', 'laura.jimenez@gmail.com',   'Cra. 33 # 70-90',   '1997-12-25', 'Nuevo',    'Nueva en el salion, interesada en maquillaje.'),
  ('40000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'Andres Mora',     '+57 310 100 0008', 'andres.mora@gmail.com',     'Calle 90 # 52-10',  '1990-04-04', 'Inactivo', 'No asiste desde hace 6 meses.')
on conflict (id) do nothing;

-- --- 4.8 Citas (fechas relativas a hoy para que el dashboard muestre datos) ---
insert into public.appointments
  (id, business_id, date, time, client_id, service_id, staff_id, status, notes) values
  -- Hoy
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', current_date,          '09:30', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Confirmada',  null),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', current_date,          '11:00', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'Confirmada',  null),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', current_date,          '14:30', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Pendiente',   null),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', current_date,          '16:00', '40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Pendiente',   null),
  -- Pasadas (historial / ingresos del mes)
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', current_date - 1,      '10:00', '40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Completada',  'Cliente muy satisfecha.'),
  ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', current_date - 1,      '15:00', '40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'Completada',  null),
  ('50000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', current_date - 3,      '09:30', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Completada',  null),
  ('50000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', current_date - 3,      '12:00', '40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'Completada',  null),
  ('50000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', current_date - 5,      '10:00', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', 'Completada',  null),
  ('50000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', current_date - 5,      '16:30', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'Cancelada',   'La cliente cancelo por viaje.'),
  ('50000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', current_date - 8,      '11:00', '40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Completada',  null),
  ('50000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', current_date - 8,      '15:30', '40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Completada',  null),
  -- Proximas
  ('50000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', current_date + 1,      '10:00', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'Pendiente',   null),
  ('50000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', current_date + 1,      '15:00', '40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Pendiente',   null),
  ('50000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000001', current_date + 2,      '09:30', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Pendiente',   null),
  ('50000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000001', current_date + 2,      '17:00', '40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Pendiente',   null),
  ('50000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000001', current_date + 3,      '11:30', '40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'Pendiente',   null),
  ('50000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000001', current_date + 3,      '14:00', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Pendiente',   null),
  ('50000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000001', current_date + 5,      '10:00', '40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', 'Pendiente',   null),
  ('50000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000001', current_date + 5,      '16:00', '40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Pendiente',   null)
on conflict (id) do nothing;

-- Vincula la cuenta de prueba client@salonbella.co con la clienta "Valentina Gomez"
-- (asi "Mis citas" e "Historial" del usuario cliente muestran datos reales)
update public.clients
set user_id = (select id from public.users where email = 'client@salonbella.co')
where id = '40000000-0000-4000-8000-000000000001';

-- --- 4.9 Notificaciones (para el usuario admin) ---
insert into public.notifications (id, user_id, title, description, tone, icon, read) values
  ('60000000-0000-4000-8000-000000000001', (select id from public.users where email = 'admin@salonbella.co'), 'Bienvenida a Citaflex',        'Tu negocio esta listo. Empieza a agendar citas y gestiona tus clientes.', 'primary', 'Star',         true),
  ('60000000-0000-4000-8000-000000000002', (select id from public.users where email = 'admin@salonbella.co'), 'Nueva cita creada',            'Valentina Gomez · Corte + Peinado hoy a las 09:30.',                    'primary', 'Calendar',     false),
  ('60000000-0000-4000-8000-000000000003', (select id from public.users where email = 'admin@salonbella.co'), 'Nuevo cliente registrado',     'Daniela Guzman se agrego a tu base de clientes.',                       'success', 'UserPlus',     false),
  ('60000000-0000-4000-8000-000000000004', (select id from public.users where email = 'admin@salonbella.co'), 'Cita cancelada',               'Ana Sofia Rios cancelo su manicure.',                                   'warning', 'AlertCircle',  false),
  ('60000000-0000-4000-8000-000000000005', (select id from public.users where email = 'admin@salonbella.co'), 'Cita completada',              'Daniela Guzman · Tratamiento capilar completado.',                      'success', 'CheckCircle2', true)
on conflict (id) do nothing;

-- Citas adicionales para la clienta de prueba (Valentina Gomez)
-- para que "Mis citas" e "Historial" del usuario client@salonbella.co tengan contenido.
insert into public.appointments
  (id, business_id, date, time, client_id, service_id, staff_id, status, notes) values
  ('50000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000001', current_date - 2,     '16:00', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', 'Completada',  'Maquillaje para evento.'),
  ('50000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000001', current_date - 12,    '14:00', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Completada',  'Retoque de color, excelente resultado.'),
  ('50000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000001', current_date + 4,     '11:00', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Pendiente',   null)
on conflict (id) do nothing;

-- ============================================================================
-- 4.10 Citas historicas generadas (deterministas e idempotentes)
-- Genera ~1800 citas distribuidas en los ultimos 365 dias usando hash por
-- fecha+slot. Es seguro re-ejecutar: los IDs derivan de md5 y se insertan con
-- "on conflict do nothing".
-- ============================================================================
do $$
declare
  d date;
  slot int;
  v_slots int;
  v_id uuid;
  v_client uuid;
  v_service uuid;
  v_staff uuid;
  v_status text;
  v_hour int;
  v_idx int;
begin
  for d in select generate_series(current_date - 365, current_date - 1, interval '1 day')::date loop
    -- Domingo: el negocio cierra (ver business_hours.sun = false)
    continue when extract(isodow from d) = 7;
    -- De 4 a 8 citas por dia, determinista por fecha
    v_slots := 4 + abs(hashtext(d::text)) % 5;
    for slot in 1..v_slots loop
      v_id := ('50000000-0000-4000-8000-' || substr(md5(d::text || ':' || slot::text), 1, 12))::uuid;
      -- Cliente 1..8, servicio 1..5, staff 1..4 (IDs fijos del seed anterior)
      v_idx := 1 + abs(hashtext(md5(d::text || ':' || slot::text || ':c'))) % 8;
      v_client := ('40000000-0000-4000-8000-' || lpad(v_idx::text, 12, '0'))::uuid;
      v_idx := 1 + abs(hashtext(md5(d::text || ':' || slot::text || ':s'))) % 5;
      v_service := ('30000000-0000-4000-8000-' || lpad(v_idx::text, 12, '0'))::uuid;
      v_idx := 1 + abs(hashtext(md5(d::text || ':' || slot::text || ':t'))) % 4;
      v_staff := ('20000000-0000-4000-8000-' || lpad(v_idx::text, 12, '0'))::uuid;
      -- Estado: ~85% Completada, ~10% Cancelada, ~5% Pendiente/Confirmada
      v_status := case
        when abs(hashtext(md5(d::text || slot::text))) % 100 < 10 then 'Cancelada'
        when abs(hashtext(md5(d::text || slot::text))) % 100 < 15 then 'Pendiente'
        else 'Completada'
      end;
      v_hour := 8 + abs(hashtext(md5(d::text || slot::text || ':h'))) % 11;
      insert into public.appointments
        (id, business_id, date, time, client_id, service_id, staff_id, status, notes)
      values (
        v_id,
        '10000000-0000-4000-8000-000000000001',
        d,
        (v_hour::text || ':' || lpad(((abs(hashtext(md5(d::text || slot::text || ':m'))) % 4) * 15)::text, 2, '0'))::time,
        v_client,
        v_service,
        v_staff,
        v_status,
        null
      )
      on conflict (id) do nothing;
    end loop;
  end loop;
end $$;

-- ============================================================================
-- Listo. Pega este archivo en el SQL Editor de Supabase y presiona Run.
-- Luego copia Project URL + anon key a tu .env (ver .env.example).
-- ============================================================================