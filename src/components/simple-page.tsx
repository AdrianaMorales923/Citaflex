import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarCheck2 } from "lucide-react";
import type { ReactNode } from "react";

export function SimplePage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <CalendarCheck2 className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold">Citaflex</span>
          </Link>
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
          Última actualización: {updated}
        </p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {children}
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© 2026 Citaflex · Barranquilla, Colombia</span>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-foreground">
              Términos
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacidad
            </Link>
            <Link to="/contact" className="hover:text-foreground">
              Contacto
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
