function slugifySegment(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "export";
}

export function buildSessionExportBaseName(sessionName: string) {
  return `session-${slugifySegment(sessionName)}`;
}

export function buildRawExportFileName(sessionName: string) {
  return `${buildSessionExportBaseName(sessionName)}-raw.xlsx`;
}

export function buildSummaryExportFileName(sessionName: string) {
  return `${buildSessionExportBaseName(sessionName)}-summary.xlsx`;
}

export function buildPdfExportFileName(sessionName: string) {
  return `${buildSessionExportBaseName(sessionName)}-report.pdf`;
}

export function buildQrDownloadFileName(sessionName: string) {
  return `${buildSessionExportBaseName(sessionName)}-qr.png`;
}
