/** Utilidades para exportar reportes: descarga CSV y PDF vía ventana de impresión. */

export function downloadCSV(filename: string, lines: string[]) {
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(filename, URL.createObjectURL(blob));
}

function triggerDownload(filename: string, url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Abre una ventana con el reporte formateado listo para imprimir o
 * guardar como PDF desde el diálogo del navegador. Devuelve false si
 * el navegador bloqueó el popup.
 */
export function printReportPDF(opts: {
  title: string;
  subtitle: string;
  businessName: string;
  sections: { heading: string; headers: string[]; rows: string[][] }[];
}): boolean {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return false;

  const sectionHtml = opts.sections
    .map(
      (s) => `
      <h2>${escapeHtml(s.heading)}</h2>
      <table>
        <thead><tr>${s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>
          ${s.rows
            .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>`,
    )
    .join("");

  win.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #1a1a2e; padding: 40px; }
  header { border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
  header h1 { font-size: 22px; }
  header p { color: #666; font-size: 13px; margin-top: 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; color: #4338ca; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; background: #f1f1f8; padding: 7px 10px; border: 1px solid #ddd; }
  td { padding: 6px 10px; border: 1px solid #e5e5ef; }
  tr:nth-child(even) td { background: #fafafe; }
  footer { margin-top: 32px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px">
    <button onclick="window.print()" style="background:#6366f1;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:14px;cursor:pointer">
      Imprimir / Guardar como PDF
    </button>
  </div>
  <header>
    <h1>${escapeHtml(opts.businessName)} — ${escapeHtml(opts.title)}</h1>
    <p>${escapeHtml(opts.subtitle)} · Generado el ${new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</p>
  </header>
  ${sectionHtml}
  <footer>Citaflex — Gestión de citas para tu negocio</footer>
</body>
</html>`);
  win.document.close();
  return true;
}
