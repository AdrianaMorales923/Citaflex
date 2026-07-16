import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from "lucide-react";

import { AuthLayout } from "@/components/auth-layout";
import { Field, validateEmail } from "@/components/auth-fields";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 600);
  }

  return (
    <AuthLayout
      title={sent ? "Revisa tu correo" : "Recuperar contraseña"}
      subtitle={
        sent
          ? "Te enviamos un enlace para restablecer tu contraseña."
          : "Ingresa tu correo y te enviaremos un enlace para crear una nueva."
      }
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-foreground">
            Enviamos instrucciones a <span className="font-semibold">{email}</span>.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ¿No lo recibes? Revisa tu carpeta de spam o{" "}
            <button onClick={() => setSent(false)} className="font-medium text-primary hover:underline">
              prueba con otro correo
            </button>
            .
          </p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          <Field
            label="Correo electrónico"
            icon={<Mail />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tu@correo.com"
            autoComplete="email"
            error={error}
          />
          <button
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
          >
            {loading ? "Enviando..." : "Enviar enlace"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
