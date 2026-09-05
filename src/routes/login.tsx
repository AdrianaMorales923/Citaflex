import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Briefcase, Lock, Mail, ShieldCheck, UserCircle2 } from "lucide-react";

import { AuthLayout } from "@/components/auth-layout";
import { Field, validateEmail } from "@/components/auth-fields";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  component: Login,
});

const ROLES = [
  { id: "admin", label: "Administrador", desc: "Dueño del negocio", icon: ShieldCheck },
  { id: "staff", label: "Personal", desc: "Equipo o asistente", icon: Briefcase },
  { id: "client", label: "Cliente", desc: "Reservar mis citas", icon: UserCircle2 },
] as const;

function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [role, setRole] = useState<(typeof ROLES)[number]["id"]>("admin");
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
      setErrors({
        auth: err === "Invalid login credentials" ? "Correo o contraseña incorrectos" : err,
      });
      setLoading(false);
      return;
    }
    try {
      window.localStorage.setItem("citaflex.role", role);
    } catch {
      /* noop */
    }
    const dest = role === "client" ? "/app/my-appointments" : "/app";
    navigate({ to: dest });
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
        <div>
          <label className="text-sm font-medium">Ingresar como</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`group flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-input hover:border-primary/40 hover:bg-accent/40"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span className="text-xs font-semibold leading-tight">{r.label}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">{r.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

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
