import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  UserCircle2,
} from "lucide-react";

import { AuthLayout } from "@/components/auth-layout";
import { Field, usePasswordStrength, validateEmail } from "@/components/auth-fields";
import { useAuth } from "@/lib/auth-context";
import { notifyRoles } from "@/lib/use-notifications";
import supabase from "@/lib/supabase";

export const Route = createFileRoute("/register")({
  component: Register,
});

const ROLES = [
  {
    id: "admin",
    label: "Administrador",
    desc: "Soy dueño o gerente del negocio",
    icon: ShieldCheck,
  },
  {
    id: "staff",
    label: "Personal",
    desc: "Trabajo en un negocio existente",
    icon: Briefcase,
  },
  {
    id: "client",
    label: "Cliente",
    desc: "Quiero reservar mis propias citas",
    icon: UserCircle2,
  },
] as const;

type Role = (typeof ROLES)[number]["id"];

function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [role, setRole] = useState<Role>("admin");
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);

  const strength = usePasswordStrength(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {
      name: name.trim().length < 2 ? "Ingresa tu nombre" : undefined,
      business: role === "admin" && business.trim().length < 2 ? "Nombre del negocio" : undefined,
      email: validateEmail(email),
      password: strength.score < 2 ? "Crea una contraseña más segura" : undefined,
      accept: !accept ? "Debes aceptar los términos" : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    const err = await signUp(email, password);
    if (err) {
      setErrors({
        auth: err === "User already registered" ? "Este correo ya está registrado" : err,
      });
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (user) {
      await supabase.from("users").insert({
        id: user.id,
        email,
        password_hash: "managed_by_supabase_auth",
        role,
        business_name: role === "admin" ? business : null,
      });
      await supabase.from("profiles").insert({
        user_id: user.id,
        name,
      });

      await notifyRoles(
        {
          title: "Nueva cuenta creada",
          description: `${name.trim()} (${email}) se registró como ${ROLES.find((r) => r.id === role)?.label.toLowerCase()}.`,
          tone: "success",
          icon: "UserPlus",
        },
        ["admin"],
      );
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
      title="Crea tu cuenta gratis"
      subtitle="Empieza a gestionar citas, clientes y servicios en minutos."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <label className="text-sm font-medium">¿Cómo usarás Citaflex?</label>
          <div className="mt-2 space-y-2">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-input hover:border-primary/40 hover:bg-accent/40"
                  }`}
                >
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-md ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                  <span
                    className={`h-4 w-4 rounded-full border-2 ${
                      active ? "border-primary bg-primary" : "border-input"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <Field
          label="Nombre completo"
          icon={<User />}
          value={name}
          onChange={setName}
          placeholder="Juan Pérez"
          autoComplete="name"
          error={errors.name}
        />

        {role === "admin" && (
          <Field
            label="Nombre del negocio"
            icon={<Building2 />}
            value={business}
            onChange={setBusiness}
            placeholder="Barbería Central"
            autoComplete="organization"
            error={errors.business}
          />
        )}

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

        <div>
          <Field
            label="Contraseña"
            icon={<Lock />}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            error={errors.password}
          />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strength.score ? strength.color : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Seguridad: <span className="font-medium text-foreground">{strength.label}</span>
              </p>
            </div>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            Acepto los{" "}
            <Link to="/terms" className="font-medium text-primary hover:underline">
              Términos
            </Link>{" "}
            y la{" "}
            <Link to="/privacy" className="font-medium text-primary hover:underline">
              Política de privacidad
            </Link>
            .
          </span>
        </label>
        {errors.accept && (
          <p className="-mt-3 text-xs font-medium text-destructive">{errors.accept}</p>
        )}

        {errors.auth && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {errors.auth}
          </p>
        )}

        <button
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthLayout>
  );
}
