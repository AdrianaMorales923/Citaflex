# Despliegue en Vercel

Guia para publicar Citaflex (frontend + Supabase) en Vercel.

## Requisitos

- Cuenta en [vercel.com](https://vercel.com)
- Proyecto de Supabase ya creado y `supabase/database.sql` ejecutado (ve el README)
- El proyecto compila localmente: `npm run build`

## Opcion A: CLI (recomendada)

```bash
npm i -g vercel
vercel login
vercel --prod
```

La primera vez Vercel te preguntara por el framework (elegir **Vite / React**),
build command (`npm run build`), y output directory (`dist`).

## Opcion B: Dashboard

1. Sube el repositorio a GitHub (o usa la importacion de Vercel).
2. En Vercel: **Add New > Project** y selecciona el repo.
3. Framework preset: **Vite**.
4. Build: `npm run build` · Output: `dist` · Install: `npm install`.

## Variables de entorno

En el dashboard del proyecto: **Settings > Environment Variables**, agrega:

| Nombre                   | Valor                                    |
| ------------------------ | ---------------------------------------- |
| `VITE_SUPABASE_URL`      | Project URL de Supabase (Settings > API) |
| `VITE_SUPABASE_ANON_KEY` | anon key de Supabase (Settings > API)    |

Sin estas dos variables la app no arranca (`src/lib/supabase.ts`).

Despues de guardarlas, vuelve a desplegar (**Redeploy**).

## Verificar

- `vercel logs` muestra el output del build sin errores de TypeScript.
- Abre la URL de produccion e inicia sesion con `admin@salonbella.co / test1234`.

## Notas

- La "autenticacion" es una demo por consulta directa a `public.users` (no hay
  Supabase Auth ni correo de confirmacion): la sesion vive en el localStorage
  del navegador. Tras un deploy sobre una base nueva, vuelve a ejecutar
  `supabase/database.sql` o las cuentas demo no existiran.
- Si cambias rutas, regenera el arbol de rutas antes de desplegar:
  `npx @tanstack/router-cli generate` (el repo no usa el plugin de Vite).
