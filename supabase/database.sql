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

-- PostGIS no; solo necesitamos funciones criptograficas para las contrasenas
create extension if not exists pgcrypto;

-- ============================================================================
-- 1) TABLAS
-- ============================================================================

-- Usuarios de la app. El id == auth.users.id (uid de Supabase Auth).
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null default 'managed_by_supabase_auth',
  role          text not null default 'client' check (role in ('admin', 'staff', 'client')),
  business_name text,
  created_at    timestamptz not null default now()
);

-- Perfil publico de cada usuario (nombre, telefono, org, cargo)
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
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
  user_id     uuid references auth.users (id) on delete cascade,
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
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  tone        text not null default 'primary',  -- primary | success | warning
  icon        text not null default 'Calendar', -- Calendar|UserPlus|Star|Clock|AlertCircle|CheckCircle2
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Compatibilidad con ejecuciones anteriores del script:
-- las columnas nuevas deben existir ANTES de crear los indices que las usan
alter table if exists public.clients add column if not exists user_id uuid references auth.users (id) on delete cascade;
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

-- ============================================================================
-- 2) PERMISOS (roles anon/authenticated)
-- ============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to anon;
grant select on all sequences in schema public to anon;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Reserva publica (/book): el usuario anonimo puede CREAR clientes y citas,
-- y leer solo lo necesario para ver disponibilidad (nunca datos personales
-- como client_id, notes, telefono, etc.).
revoke all on public.appointments from anon;
grant insert (id, business_id, date, time, client_id, service_id, staff_id, status, notes) on public.appointments to anon;
grant select (date, time, staff_id, service_id, status) on public.appointments to anon;
revoke all on public.clients from anon;
grant insert (id, business_id, name, phone, email, user_id, tag, notes) on public.clients to anon;

-- ============================================================================
-- 3) ROW LEVEL SECURITY
-- ============================================================================
-- Demo: las tablas de negocio son accesibles por cualquier usuario autenticado
-- (la app todavia no filtra por business_id). Las tablas de cuenta solo por su dueno.

alter table public.users         enable row level security;
alter table public.profiles      enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "users_select_own"  on public.users;
drop policy if exists "users_insert_own"  on public.users;
drop policy if exists "users_update_own"  on public.users;
create policy "users_select_own" on public.users for select to authenticated using (id = auth.uid());
create policy "users_insert_own" on public.users for insert to authenticated with check (id = auth.uid());
create policy "users_update_own" on public.users for update to authenticated using (id = auth.uid());

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_all_own" on public.notifications;
create policy "notifications_all_own" on public.notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Funciones seguras para crear notificaciones: se ejecutan como el dueno de
-- las tablas (security definer), asi cualquier flujo (reserva publica anonima,
-- registro de cuentas, citas del panel) puede notificar sin conceder INSERT
-- global en notifications ni SELECT global en users.
create or replace function public.create_notification(
  user_id uuid,
  title text,
  description text,
  tone text default 'primary',
  icon text default 'Calendar'
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, description, tone, icon)
  values (user_id, title, description, tone, icon);
$$;

create or replace function public.notify_roles(
  roles text[],
  title text,
  description text,
  tone text default 'primary',
  icon text default 'Calendar'
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, description, tone, icon)
  select u.id, title, description, tone, icon
  from public.users u
  where u.role = any(roles);
$$;

revoke all on function public.create_notification(uuid, text, text, text, text) from public;
grant execute on function public.create_notification(uuid, text, text, text, text) to anon, authenticated;
revoke all on function public.notify_roles(text[], text, text, text, text) from public;
grant execute on function public.notify_roles(text[], text, text, text, text) to anon, authenticated;

-- Notificaciones en tiempo real: la campanita se actualiza sin recargar.
-- RLS mantiene que cada usuario solo reciba sus propias filas.
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

-- Publico no autenticado: puede ver el catalogo (servicios/personal), no datos privados.
alter table public.businesses    enable row level security;
alter table public.business_hours enable row level security;
alter table public.staff         enable row level security;
alter table public.services      enable row level security;
alter table public.service_staff enable row level security;

drop policy if exists "biz_all_authenticated" on public.businesses;
drop policy if exists "biz_read_anon"         on public.businesses;
create policy "biz_all_authenticated" on public.businesses for all to authenticated using (true) with check (true);
create policy "biz_read_anon"         on public.businesses for select to anon using (true);

drop policy if exists "hours_all_authenticated" on public.business_hours;
drop policy if exists "hours_read_anon"         on public.business_hours;
create policy "hours_all_authenticated" on public.business_hours for all to authenticated using (true) with check (true);
create policy "hours_read_anon"         on public.business_hours for select to anon using (true);

drop policy if exists "staff_all_authenticated" on public.staff;
drop policy if exists "staff_read_anon"         on public.staff;
create policy "staff_all_authenticated" on public.staff for all to authenticated using (true) with check (true);
create policy "staff_read_anon"         on public.staff for select to anon using (true);

drop policy if exists "services_all_authenticated" on public.services;
drop policy if exists "services_read_anon"         on public.services;
create policy "services_all_authenticated" on public.services for all to authenticated using (true) with check (true);
create policy "services_read_anon"         on public.services for select to anon using (true);

drop policy if exists "junc_all_authenticated" on public.service_staff;
drop policy if exists "junc_read_anon"         on public.service_staff;
create policy "junc_all_authenticated" on public.service_staff for all to authenticated using (true) with check (true);
create policy "junc_read_anon"         on public.service_staff for select to anon using (true);

-- Datos privados de operacion: solo autenticados
alter table public.clients      enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "clients_all_authenticated" on public.clients;
create policy "clients_all_authenticated" on public.clients for all to authenticated using (true) with check (true);

drop policy if exists "appointments_all_authenticated" on public.appointments;
create policy "appointments_all_authenticated" on public.appointments for all to authenticated using (true) with check (true);

-- Reserva publica sin sesion (/book): anonimo puede insertar citas y clientes,
-- y consultar unicamente fecha/hora/personal/servicio/estado para disponibilidad
-- (los permisos de columna de la seccion 2 limitan lo que puede leer).
drop policy if exists "clients_insert_anon" on public.clients;
create policy "clients_insert_anon" on public.clients for insert to anon with check (true);
drop policy if exists "appointments_read_anon" on public.appointments;
create policy "appointments_read_anon" on public.appointments for select to anon using (true);
drop policy if exists "appointments_insert_anon" on public.appointments;
create policy "appointments_insert_anon" on public.appointments for insert to anon with check (true);

-- COMMIT: libera los bloqueos de RLS/policies antes de cargar los datos.
commit;

-- ============================================================================
-- 4) DATOS DE DEMOSTRACION
-- ============================================================================

-- --- 4.1 + 4.2 Usuarios de Supabase Auth, identidades, usuarios de la app y perfiles ---
-- Los usuarios de prueba pueden ya existir con un id generado por Supabase Auth
-- (p.ej. registrados desde la app). Por eso se resuelve el id REAL por email y
-- todo lo demas (identidades, public.users, profiles) referencia ese id real.
do $$
declare
  v_instance uuid;
  v_admin uuid;
  v_staff uuid;
  v_client uuid;
begin
  select coalesce(instance_id, '00000000-0000-0000-0000-000000000000') into v_instance
  from auth.users limit 1;

  -- Asegurar que los usuarios de prueba existen (contrasena: test1234)
  insert into auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
     last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
     confirmation_token, email_change, email_change_token_new, recovery_token)
  values
    (v_instance, '00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
     'admin@salonbella.co',  crypt('test1234', gen_salt('bf')), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
    (v_instance, '00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
     'staff@salonbella.co',  crypt('test1234', gen_salt('bf')), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
    (v_instance, '00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
     'client@salonbella.co', crypt('test1234', gen_salt('bf')), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '')
  -- Sin target: en Supabase el unique de email es un indice parcial
  -- (WHERE deleted_at IS NULL), que ON CONFLICT (email) no puede inferir.
  on conflict do nothing;

  -- IDs reales (los fijos o los ya existentes en el proyecto)
  select id into v_admin from auth.users where email = 'admin@salonbella.co';
  select id into v_staff from auth.users where email = 'staff@salonbella.co';
  select id into v_client from auth.users where email = 'client@salonbella.co';

  -- Identidades (necesarias para login por email)
  insert into auth.identities
    (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), 'admin@salonbella.co',  v_admin,
     jsonb_build_object('sub', v_admin, 'email', 'admin@salonbella.co'),
     'email', now(), now(), now()),
    (gen_random_uuid(), 'staff@salonbella.co',  v_staff,
     jsonb_build_object('sub', v_staff, 'email', 'staff@salonbella.co'),
     'email', now(), now(), now()),
    (gen_random_uuid(), 'client@salonbella.co', v_client,
     jsonb_build_object('sub', v_client, 'email', 'client@salonbella.co'),
     'email', now(), now(), now())
  on conflict do nothing;

  -- Usuarios de la app (public.users) y perfiles con el id real
  insert into public.users (id, email, password_hash, role, business_name) values
    (v_admin,  'admin@salonbella.co',  'managed_by_supabase_auth', 'admin',  'Salon Bella Barranquilla'),
    (v_staff,  'staff@salonbella.co',  'managed_by_supabase_auth', 'staff',  null),
    (v_client, 'client@salonbella.co', 'managed_by_supabase_auth', 'client', null)
  on conflict (id) do nothing;

  insert into public.profiles (user_id, name, phone, org, title) values
    (v_admin,  'Maria Rodriguez', '+57 300 555 0101', 'Salon Bella Barranquilla', 'Administradora'),
    (v_staff,  'Laura Restrepo',  '+57 300 555 0102', 'Salon Bella Barranquilla', 'Estilista Senior'),
    (v_client, 'Valentina Gomez', '+57 310 100 0001', 'Salon Bella Barranquilla', 'Cliente')
  on conflict (user_id) do nothing;
end $$;

-- --- 4.3 Negocio y horarios ---
insert into public.businesses (id, owner_id, name, phone, address, city, country, currency) values
  ('10000000-0000-4000-8000-000000000001',
   (select id from auth.users where email = 'admin@salonbella.co'),
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
set user_id = (select id from auth.users where email = 'client@salonbella.co')
where id = '40000000-0000-4000-8000-000000000001';

-- --- 4.9 Notificaciones (para el usuario admin) ---
insert into public.notifications (id, user_id, title, description, tone, icon, read) values
  ('60000000-0000-4000-8000-000000000001', (select id from auth.users where email = 'admin@salonbella.co'), 'Bienvenida a Citaflex',        'Tu negocio esta listo. Empieza a agendar citas y gestiona tus clientes.', 'primary', 'Star',         true),
  ('60000000-0000-4000-8000-000000000002', (select id from auth.users where email = 'admin@salonbella.co'), 'Nueva cita creada',            'Valentina Gomez · Corte + Peinado hoy a las 09:30.',                    'primary', 'Calendar',     false),
  ('60000000-0000-4000-8000-000000000003', (select id from auth.users where email = 'admin@salonbella.co'), 'Nuevo cliente registrado',     'Daniela Guzman se agrego a tu base de clientes.',                       'success', 'UserPlus',     false),
  ('60000000-0000-4000-8000-000000000004', (select id from auth.users where email = 'admin@salonbella.co'), 'Cita cancelada',               'Ana Sofia Rios cancelo su manicure.',                                   'warning', 'AlertCircle',  false),
  ('60000000-0000-4000-8000-000000000005', (select id from auth.users where email = 'admin@salonbella.co'), 'Cita completada',              'Daniela Guzman · Tratamiento capilar completado.',                      'success', 'CheckCircle2', true)
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