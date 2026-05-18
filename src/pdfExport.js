// ── PDF Export wrappers ───────────────────────────────────────────────────────
// These thin wrappers inject the calc functions and PRICING into the
// underlying PDF template functions from PDFTemplates.jsx.
import {
  exportPDFInternal as _exportPDFInternal,
  exportPDFCustomer as _exportPDFCustomer,
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
