// ── PDF Export wrappers ───────────────────────────────────────────────────────
// These thin wrappers inject the calc functions and PRICING into the
// underlying PDF template functions from PDFTemplates.jsx.
import {
  exportPDFInternal as _exportPDFInternal,
  exportPDFCustomer as _exportPDFCustomer,
  buildInternalPDFBlob as _buildInternalPDFBlob,
  buildCustomerPDFBlob as _buildCustomerPDFBlob,
} from "./PDFTemplates.jsx"
import { PRICING, calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall } from "./appUtils.js"

export function exportPDFInternal(project, rooms, preparedBy, onStatus) {
  _exportPDFInternal(project, rooms, {
    calcCabinetry,
    calcUpgrades,
    calcCountertops,
    calcFinishing,
    calcInstall,
    pricing: PRICING,
    preparedBy,
  }, onStatus);
}

export function exportPDFCustomer(project, rooms, preparedBy, onStatus) {
  _exportPDFCustomer(project, rooms, {
    calcCabinetry,
    calcUpgrades,
    calcCountertops,
    calcFinishing,
    calcInstall,
    preparedBy,
  }, onStatus);
}

export function buildCustomerPDFBlob(project, rooms, preparedBy) {
  return _buildCustomerPDFBlob(project, rooms, {
    calcCabinetry,
    calcUpgrades,
    calcCountertops,
    calcFinishing,
    calcInstall,
    preparedBy,
  });
}

// Preview helpers — generate blob and open in new browser tab
export async function previewPDFInternal(project, rooms, preparedBy, onStatus) {
  onStatus('generating');
  try {
    const blob = await _buildInternalPDFBlob(project, rooms, {
      calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall,
      pricing: PRICING, preparedBy,
    });
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
    const blob = await _buildCustomerPDFBlob(project, rooms, {
      calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall,
      preparedBy,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    onStatus('done');
  } catch (err) {
    console.error('PDF preview error (customer):', err);
    onStatus('error', err?.message || 'Preview failed.');
  }
}
