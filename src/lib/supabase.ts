import { createClient } from "@supabase/supabase-js";

// Sin Supabase Auth: la sesion la gestiona la app (localStorage) con consultas
// directas a public.users. Se desactivan la persistencia y el refresh de tokens.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export default supabase;
