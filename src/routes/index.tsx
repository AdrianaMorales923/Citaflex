import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck2, Users, Scissors, Stethoscope, Camera, Dumbbell, Sparkles, ArrowRight, Check, BarChart3, Clock, Smartphone } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const businesses = [
  { icon: Scissors, label: "Barberías" },
  { icon: Sparkles, label: "Salones de belleza" },
  { icon: Stethoscope, label: "Médicos" },
  { icon: Camera, label: "Fotógrafos" },
  { icon: Dumbbell, label: "Entrenadores" },
  { icon: Users, label: "Consultores" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <CalendarCheck2 className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold">Citaflex</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Funciones</a>
            <a href="#sectores" className="hover:text-foreground">Sectores</a>
            <a href="#precios" className="hover:text-foreground">Precios</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-block">
              Entrar
            </Link>
            <Link to="/app" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
              Probar gratis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--accent)_0%,_transparent_60%)] opacity-60" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Hecho en Barranquilla 🇨🇴
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
              Gestiona tus citas, clientes y servicios <span className="bg-gradient-to-r from-primary to-chart-5 bg-clip-text text-transparent">sin complicaciones</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Citaflex es la plataforma todo en uno para barberías, salones, profesionales de la salud y cualquier negocio que trabaje con citas.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/app" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 sm:w-auto">
                Empezar gratis <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-accent sm:w-auto">
                Ver cómo funciona
              </a>
            </div>
          </div>

          {/* Mock dashboard preview */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4">
                <div className="hidden flex-col gap-1 border-r border-border bg-sidebar p-4 sm:flex">
                  {["Dashboard","Citas","Clientes","Servicios","Estadísticas"].map((l,i)=>(
                    <div key={l} className={`rounded-md px-3 py-2 text-xs font-medium ${i===0?"bg-sidebar-accent text-sidebar-accent-foreground":"text-sidebar-foreground/70"}`}>{l}</div>
                  ))}
                </div>
                <div className="col-span-3 p-6">
                  <div className="grid grid-cols-3 gap-4">
                    {[{l:"Citas hoy",v:"24",c:"text-primary"},{l:"Ingresos",v:"$1.2M",c:"text-success"},{l:"Clientes",v:"148",c:"text-chart-5"}].map(s=>(
                      <div key={s.l} className="rounded-xl border border-border bg-background p-4">
                        <div className="text-xs text-muted-foreground">{s.l}</div>
                        <div className={`mt-1 font-display text-2xl font-bold ${s.c}`}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-32 rounded-xl border border-border bg-gradient-to-br from-accent/40 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section id="sectores" className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">Hecho para tu tipo de negocio</h2>
          <p className="mt-2 text-center text-muted-foreground">Configurable para cualquier profesional independiente o pequeño negocio.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {businesses.map(b => (
              <div key={b.label} className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition hover:border-primary/40 hover:shadow-md">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <b.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Todo lo que necesitas en un solo lugar</h2>
            <p className="mt-3 text-muted-foreground">Diseñado para ser simple incluso si nunca has usado software de gestión.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: CalendarCheck2, t: "Agenda inteligente", d: "Visualiza, agenda y reprograma citas desde cualquier dispositivo." },
              { icon: Users, t: "Clientes organizados", d: "Historial completo, notas y preferencias de cada cliente." },
              { icon: Sparkles, t: "Servicios personalizados", d: "Configura precios, duración y staff para cada servicio." },
              { icon: BarChart3, t: "Estadísticas claras", d: "Entiende tu negocio: ingresos, ocupación y clientes frecuentes." },
              { icon: Clock, t: "Horarios flexibles", d: "Define tu disponibilidad por día, profesional o sucursal." },
              { icon: Smartphone, t: "100% responsive", d: "Funciona perfecto en tu celular, tablet o computador." },
            ].map(f => (
              <div key={f.t} className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-lg">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="precios" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Empieza gratis hoy</h2>
          <p className="mt-3 text-muted-foreground">Sin tarjeta de crédito. Configura tu negocio en menos de 5 minutos.</p>
          <ul className="mx-auto mt-8 grid max-w-md gap-3 text-left">
            {["Citas y clientes ilimitados","Personalización de servicios","Soporte en español","Acceso desde cualquier dispositivo"].map(t => (
              <li key={t} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <Check className="h-4 w-4 text-success" /> <span className="text-sm">{t}</span>
              </li>
            ))}
          </ul>
          <Link to="/app" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
            Ir al panel <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
              <CalendarCheck2 className="h-3 w-3" />
            </div>
            <span>© 2026 Citaflex · Barranquilla, Colombia</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Términos</a>
            <a href="#" className="hover:text-foreground">Privacidad</a>
            <a href="#" className="hover:text-foreground">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
