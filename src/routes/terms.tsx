import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return (
    <SimplePage title="Términos del servicio" updated="1 de septiembre de 2026">
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          1. Aceptación de los términos
        </h2>
        <p>
          Al acceder y usar Citaflex aceptas estos términos. Si no estás de acuerdo, por favor no
          utilices la plataforma.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">2. Uso del servicio</h2>
        <p>
          Citaflex es una herramienta de gestión de citas, clientes y servicios para negocios
          locales. Te comprometes a usar la plataforma únicamente para fines legales y a no intentar
          vulnerar su seguridad ni la de otros usuarios.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">3. Cuentas</h2>
        <p>
          Eres responsable de mantener la confidencialidad de tus credenciales y de todas las
          actividades que ocurran bajo tu cuenta. Debes proporcionar información veraz al
          registrarte.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          4. Disponibilidad del servicio
        </h2>
        <p>
          Este es un proyecto de demostración. El servicio se ofrece «tal cual», sin garantías de
          disponibilidad continua, y puede modificarse o suspenderse en cualquier momento sin previo
          aviso.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">5. Contacto</h2>
        <p>
          Para dudas sobre estos términos escríbenos a{" "}
          <a
            href="mailto:soporte@citaglex.com"
            className="font-medium text-primary hover:underline"
          >
            soporte@citaglex.com
          </a>
          .
        </p>
      </section>
    </SimplePage>
  );
}
