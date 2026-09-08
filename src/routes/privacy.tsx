import { createFileRoute } from "@tanstack/react-router";
import { SimplePage } from "@/components/simple-page";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <SimplePage title="Política de privacidad" updated="1 de septiembre de 2026">
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          1. Información que recopilamos
        </h2>
        <p>
          Recopilamos los datos que nos proporcionas al registrarte (nombre, correo, rol y, en el
          caso de los negocios, datos del mismo) y la información que generas al usar la plataforma,
          como citas, clientes y servicios.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          2. Uso de la información
        </h2>
        <p>
          Usamos tus datos para operar la plataforma: gestionar tu cuenta, mostrar tu agenda y darle
          sentido a la información de tu negocio. No vendemos tus datos a terceros.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">3. Almacenamiento</h2>
        <p>
          La información se almacena en servicios seguros en la nube. Tomamos medidas razonables
          para protegerla, aunque ningún sistema es completamente infalible.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">4. Tus derechos</h2>
        <p>
          Puedes solicitar el acceso, corrección o eliminación de tus datos personales
          escribiéndonos al correo de contacto indicado abajo. También puedes eliminar tus datos
          desde las opciones de tu cuenta.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">5. Contacto</h2>
        <p>
          Para cualquier solicitud de privacidad escríbenos a{" "}
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
