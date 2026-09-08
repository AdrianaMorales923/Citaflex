import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin } from "lucide-react";
import { SimplePage } from "@/components/simple-page";

export const Route = createFileRoute("/contact")({ component: Contact });

function Contact() {
  return (
    <SimplePage title="Contacto" updated="1 de septiembre de 2026">
      <p>
        ¿Tienes dudas, sugerencias o necesitas ayuda con tu cuenta? Escríbenos y te responderemos lo
        antes posible.
      </p>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">Por correo</h2>
            <p className="mt-1 text-sm">
              Escríbenos a{" "}
              <a
                href="mailto:soporte@citaglex.com"
                className="font-semibold text-primary hover:underline"
              >
                soporte@citaglex.com
              </a>{" "}
              y un miembro del equipo te atenderá a la brevedad.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">Oficina</h2>
            <p className="mt-1 text-sm">Barranquilla, Atlántico · Colombia</p>
          </div>
        </div>
      </section>
    </SimplePage>
  );
}
