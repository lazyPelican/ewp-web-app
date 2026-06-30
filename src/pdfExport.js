// ── PDF Export wrappers ───────────────────────────────────────────────────────
// These thin wrappers lazy-load PDFTemplates.jsx (and its heavy @react-pdf
// dependency) only when the user actually generates a PDF.  This keeps the
// initial bundle small and dramatically improves LCP / TBT.
import { PRICING, calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall } from "./appUtils.js"

const opts = (preparedBy, withPricing) => ({
  calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall,
  preparedBy,
  ...(withPricing ? { pricing: PRICING } : {}),
});

let _pdfMod = null;
const getPDF = () => {
  if (!_pdfMod) _pdfMod = import("./PDFTemplates.jsx");
  return _pdfMod;
};

export async function exportPDFInternal(project, rooms, preparedBy, onStatus) {
  const mod = await getPDF();
  mod.exportPDFInternal(project, rooms, opts(preparedBy, true), onStatus);
}

export async function exportPDFCustomer(project, rooms, preparedBy, onStatus) {
  const mod = await getPDF();
  mod.exportPDFCustomer(project, rooms, opts(preparedBy, false), onStatus);
}

export async function buildCustomerPDFBlob(project, rooms, preparedBy) {
  const mod = await getPDF();
  return mod.buildCustomerPDFBlob(project, rooms, opts(preparedBy, false));
}

export async function exportPDFSummary(project, rooms, preparedBy, onStatus) {
  const mod = await getPDF();
  mod.exportPDFSummary(project, rooms, opts(preparedBy, false), onStatus);
}

export async function buildSummaryPDFBlob(project, rooms, preparedBy) {
  const mod = await getPDF();
  return mod.buildSummaryPDFBlob(project, rooms, opts(preparedBy, false));
}

export async function buildInternalPDFBlob(project, rooms, preparedBy) {
  const mod = await getPDF();
  return mod.buildInternalPDFBlob(project, rooms, opts(preparedBy, true));
}

// Preview helpers — generate blob and open in new browser tab
export async function previewPDFInternal(project, rooms, preparedBy, onStatus) {
  onStatus('generating');
  try {
    const mod = await getPDF();
    const blob = await mod.buildInternalPDFBlob(project, rooms, opts(preparedBy, true));
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    onStatus('done');
  } catch (err) {
    console.error('PDF preview error (internal):', err);
    onStatus('error', err?.message || 'Preview failed.');
  }
}

export async function previewPDFCustomer(project, rooms, preparedBy, onStatus) {
  onStatus('generating');
  try {
    const mod = await getPDF();
    const blob = await mod.buildCustomerPDFBlob(project, rooms, opts(preparedBy, false));
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    onStatus('done');
  } catch (err) {
    console.error('PDF preview error (customer):', err);
    onStatus('error', err?.message || 'Preview failed.');
  }
}

export async function previewPDFSummary(project, rooms, preparedBy, onStatus) {
  onStatus('generating');
  try {
    const mod = await getPDF();
    const blob = await mod.buildSummaryPDFBlob(project, rooms, opts(preparedBy, false));
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    onStatus('done');
  } catch (err) {
    console.error('PDF preview error (summary):', err);
    onStatus('error', err?.message || 'Preview failed.');
  }
}
