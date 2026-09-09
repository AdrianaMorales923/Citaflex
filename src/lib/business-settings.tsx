import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import supabase from "./supabase";
import { setMoneyLocale } from "./money";

export type Currency = "COP" | "USD";
export type Language = "es-CO" | "es-ES" | "en-US";

export type NotificationSettings = {
  channels: { whatsapp: boolean; email: boolean; sms: boolean };
  events: {
    booking: boolean;
    reminder24h: boolean;
    reminder2h: boolean;
    cancelled: boolean;
    birthday: boolean;
  };
  template: string;
};

export type BookingSettings = {
  online: boolean;
  manualConfirm: boolean;
  showPrices: boolean;
  clientCancel: boolean;
};

export type BusinessSettings = {
  slotMinutes: number;
  brandColor: string; // "" = color por defecto del tema
  language: Language;
  currency: Currency;
  booking: BookingSettings;
  notifications: NotificationSettings;
};

export type Business = {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  description: string;
  logo_url: string;
};

const DEFAULT_TEMPLATE =
  "Hola {nombre}, te recordamos tu cita de {servicio} en {negocio} el {fecha} a las {hora}. ¡Te esperamos!";

const DEFAULT_SETTINGS: BusinessSettings = {
  slotMinutes: 30,
  brandColor: "",
  language: "es-CO",
  currency: "COP",
  booking: { online: true, manualConfirm: false, showPrices: true, clientCancel: true },
  notifications: {
    channels: { whatsapp: true, email: true, sms: false },
    events: {
      booking: true,
      reminder24h: true,
      reminder2h: true,
      cancelled: true,
      birthday: false,
    },
    template: DEFAULT_TEMPLATE,
  },
};

function mergeSettings(raw: unknown): BusinessSettings {
  const s = (raw ?? {}) as Partial<BusinessSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    booking: { ...DEFAULT_SETTINGS.booking, ...(s.booking ?? {}) },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...(s.notifications ?? {}),
      channels: {
        ...DEFAULT_SETTINGS.notifications.channels,
        ...(s.notifications?.channels ?? {}),
      },
      events: { ...DEFAULT_SETTINGS.notifications.events, ...(s.notifications?.events ?? {}) },
    },
  };
}

type BusinessContextValue = {
  business: Business | null;
  settings: BusinessSettings;
  loading: boolean;
  saving: boolean;
  saveBusiness: (patch: Partial<Omit<Business, "id">>) => Promise<boolean>;
  saveSettings: (patch: Partial<BusinessSettings>) => Promise<boolean>;
  formatMoney: (n: number) => string;
  locale: string;
  refresh: () => Promise<void>;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

/** Aplica el color de marca como variables CSS en toda la app. */
function applyBrandColor(color: string) {
  const root = document.documentElement;
  if (!color) {
    for (const v of ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring", "--chart-1"]) {
      root.style.removeProperty(v);
    }
    return;
  }
  root.style.setProperty("--primary", color);
  root.style.setProperty("--ring", color);
  root.style.setProperty("--sidebar-primary", color);
  root.style.setProperty("--sidebar-ring", color);
  root.style.setProperty("--chart-1", color);
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, name, category, phone, email, address, city, country, description, logo_url, settings",
      )
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      setBusiness({
        id: data.id,
        name: data.name ?? "",
        category: data.category ?? "belleza",
        phone: data.phone ?? "",
        email: data.email ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        country: data.country ?? "",
        description: data.description ?? "",
        logo_url: data.logo_url ?? "",
      });
      setSettings(mergeSettings(data.settings));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Color de marca y atributo lang, aplicados globalmente
  useEffect(() => {
    applyBrandColor(settings.brandColor);
    document.documentElement.lang = settings.language;
    setMoneyLocale(settings.language, settings.currency);
  }, [settings.brandColor, settings.language, settings.currency]);

  const saveBusiness = useCallback(
    async (patch: Partial<Omit<Business, "id">>): Promise<boolean> => {
      setSaving(true);
      let ok = true;
      if (business) {
        const { error } = await supabase.from("businesses").update(patch).eq("id", business.id);
        if (error) ok = false;
      } else {
        const { data, error } = await supabase
          .from("businesses")
          .insert({ name: patch.name ?? "Mi negocio", ...patch })
          .select("id")
          .single();
        if (!error && data) {
          setBusiness(
            (b) =>
              ({
                id: data.id,
                name: "",
                category: "belleza",
                phone: "",
                email: "",
                address: "",
                city: "",
                country: "",
                description: "",
                logo_url: "",
                ...b,
                ...patch,
              }) as Business,
          );
        } else {
          ok = false;
        }
      }
      setSaving(false);
      if (ok && business) setBusiness((b) => (b ? { ...b, ...patch } : b));
      return ok;
    },
    [business],
  );

  const saveSettings = useCallback(
    async (patch: Partial<BusinessSettings>): Promise<boolean> => {
      const next = mergeSettings({ ...settings, ...patch });
      setSettings(next);
      if (!business) return true; // sin negocio aún: solo local
      setSaving(true);
      const { error } = await supabase
        .from("businesses")
        .update({ settings: next })
        .eq("id", business.id);
      setSaving(false);
      return !error;
    },
    [business, settings],
  );

  const formatMoney = useCallback(
    (n: number) =>
      new Intl.NumberFormat(settings.language, {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: settings.currency === "COP" ? 0 : 2,
      }).format(n),
    [settings.language, settings.currency],
  );

  const value = useMemo<BusinessContextValue>(
    () => ({
      business,
      settings,
      loading,
      saving,
      saveBusiness,
      saveSettings,
      formatMoney,
      locale: settings.language,
      refresh: load,
    }),
    [business, settings, loading, saving, saveBusiness, saveSettings, formatMoney, load],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used inside BusinessProvider");
  return ctx;
}
