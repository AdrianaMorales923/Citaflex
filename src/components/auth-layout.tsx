import { Link } from "@tanstack/react-router";
import { CalendarCheck2, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  quote?: { text: string; author: string };
}

export function AuthLayout({ title, subtitle, children, footer, quote }: AuthLayoutProps) {
  const defaultQuote = quote ?? {
    text: "Reduje las cancelaciones un 40% y ahora mis clientes agendan solos desde el celular.",
    author: "Daniela R., Salón de belleza · Barranquilla",
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <CalendarCheck2 className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold">Citaflex</span>
          </Link>

          <h1 className="mt-8 font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>

      {/* Side panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-chart-5 to-chart-3 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_white_0%,_transparent_55%)] opacity-15" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 backdrop-blur">
              <CalendarCheck2 className="h-4 w-4" />
            </div>
            <span className="font-display font-semibold">Citaflex</span>
          </div>

          <div className="space-y-8">
            <div className="grid gap-3">
              <FeatureRow icon={<Sparkles className="h-4 w-4" />} text="Agenda inteligente con recordatorios automáticos" />
              <FeatureRow icon={<Users className="h-4 w-4" />} text="Tus clientes reservan en segundos, sin llamadas" />
              <FeatureRow icon={<ShieldCheck className="h-4 w-4" />} text="Datos seguros y cumplimiento desde el día uno" />
            </div>

            <blockquote className="border-l-2 border-white/30 pl-4">
              <p className="font-display text-xl font-semibold leading-snug">"{defaultQuote.text}"</p>
              <footer className="mt-3 text-sm opacity-80">— {defaultQuote.author}</footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-md bg-white/15 backdrop-blur">{icon}</div>
      <span className="opacity-90">{text}</span>
    </div>
  );
}
