/** Formateo de moneda global, sincronizado con la configuracion del negocio. */
let locale = "es-CO";
let currency: "COP" | "USD" = "COP";

export function setMoneyLocale(lang: string, cur: "COP" | "USD") {
  locale = lang;
  currency = cur;
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(n);
}
