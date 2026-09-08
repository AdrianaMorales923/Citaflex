import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Info, Lock, Mail } from "lucide-react";

import { AuthLayout } from "@/components/auth-layout";
import { Field, validateEmail } from "@/components/auth-fields";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; auth?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {
      email: validateEmail(email),
      password: password.length < 6 ? "Mínimo 6 caracteres" : undefined,
    };
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    const err = await signIn(email, password);
    if (err) {
      setErrors({ auth: err });
      setLoading(false);
      return;
    }
    // El layout /app redirige a los clientes a "Mis citas" por su rol.
    navigate({ to: "/app" });
  }

  return (
    <AuthLayout
      title="Bienvenido de nuevo"
      subtitle="Ingresa a tu panel para gestionar tu negocio."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Crea una gratis
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <Field
          label="Correo electrónico"
          icon={<Mail />}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="tu@correo.com"
          autoComplete="email"
          error={errors.email}
        />
        <Field
          label="Contraseña"
          icon={<Lock />}
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-input" /> Recordarme
          </label>
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Olvidé mi contraseña
          </Link>
        </div>

        {errors.auth && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {errors.auth}
          </p>
        )}

        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            <Info className="h-3.5 w-3.5 text-primary" /> Cuentas de prueba
          </p>
          <ul className="mt-1.5 space-y-1">
            <li>admin@salonbella.co — Administrador</li>
            <li>staff@salonbella.co — Personal</li>
            <li>client@salonbella.co — Cliente</li>
          </ul>
          <p className="mt-1.5">
            Contraseña para todas: <span className="font-mono font-semibold">test1234</span>
          </p>
        </div>

        <button
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
        >
          {loading ? "Ingresando..." : "Entrar"} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthLayout>
  );
}
