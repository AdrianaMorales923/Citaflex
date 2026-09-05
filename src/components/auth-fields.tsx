import { useMemo, useState, type ReactNode } from "react";
import { Check, Eye, EyeOff } from "lucide-react";

interface FieldProps {
  label: string;
  icon: ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  required?: boolean;
}

export function Field({
  label,
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  required,
}: FieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && show ? "text" : type;
  const valid = !error && value.length > 0;

  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div
        className={`mt-1.5 flex items-center rounded-lg border bg-card transition-shadow focus-within:ring-2 ${
          error
            ? "border-destructive focus-within:ring-destructive/30"
            : valid
              ? "border-primary/40 focus-within:ring-ring"
              : "border-input focus-within:ring-ring"
        }`}
      >
        <span className="ml-3 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="mr-2 grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent"
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : (
          valid && <Check className="mr-3 h-4 w-4 text-primary" />
        )}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

export function usePasswordStrength(pwd: string) {
  return useMemo(() => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const label = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Excelente"][score];
    const color = ["bg-destructive", "bg-destructive", "bg-chart-4", "bg-chart-2", "bg-primary"][
      score
    ];
    return { score, label, color };
  }, [pwd]);
}

export function validateEmail(email: string) {
  if (!email) return "El correo es obligatorio";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Ingresa un correo válido";
  return undefined;
}
