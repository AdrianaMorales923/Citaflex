import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth-layout";
import { Field, usePasswordStrength, validateEmail } from "@/components/auth-fields";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPassword });

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = usePasswordStrength(password);

  function onSend(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    // Demo: el correo no se envía; el código se genera en el frontend.
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setDemoCode(randomCode());
      setCode("");
      setStep("reset");
    }, 500);
  }

  function onReset(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim() !== demoCode) {
      setError("El código no es válido. Verifica el código mostrado.");
      return;
    }
    if (strength.score < 2) {
      setError("Crea una contraseña más segura");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setError(undefined);
    setLoading(true);
    // Demo: la actualización es simulada (el correo, y por tanto un enlace
    // real, nunca se envía en este modo de prueba). La cuenta en public.users
    // no cambia; es consistente con la demo de un solo negocio.
    setTimeout(() => {
      setLoading(false);
      toast.success("Contraseña actualizada. Inicia sesión con tu nueva contraseña.");
      navigate({ to: "/login" });
    }, 600);
  }

  return (
    <AuthLayout
      title={step === "email" ? "Recuperar contraseña" : "Nueva contraseña"}
      subtitle={
        step === "email"
          ? "Ingresa tu correo y te enviaremos un código para crear una nueva contraseña."
          : "Ingresa el código y define tu nueva contraseña."
      }
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
        </Link>
      }
    >
      {step === "email" ? (
        <form className="space-y-5" onSubmit={onSend} noValidate>
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
            disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
          >
            {sending ? "Enviando..." : "Enviar código"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={onReset} noValidate>
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
            <p className="font-semibold text-warning-foreground">Función de prueba</p>
            <p className="mt-1 text-xs text-muted-foreground">
              El correo no se envía. El código generado es{" "}
              <span className="rounded bg-background px-1.5 py-0.5 font-mono text-sm font-bold tracking-widest text-foreground">
                {demoCode}
              </span>
            </p>
          </div>

          <Field
            label="Código de verificación"
            icon={<KeyRound />}
            value={code}
            onChange={setCode}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />

          <Field
            label="Nueva contraseña"
            icon={<Lock />}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />

          <Field
            label="Confirmar contraseña"
            icon={<Lock />}
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
          />

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
          >
            {loading ? "Restableciendo..." : "Restablecer contraseña"}{" "}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
