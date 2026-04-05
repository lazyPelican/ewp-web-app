// Input sanitization helpers
// React already escapes JSX output (no innerHTML), so XSS via rendering is not a risk.
// These helpers protect against excessively long strings, control characters,
// and bad data reaching the database.

// Strip control characters and trim
export const sanitizeText = (str, maxLen = 500) =>
  String(str ?? "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, maxLen)

// Sanitize an email address
export const sanitizeEmail = (str) =>
  String(str ?? "").toLowerCase().trim().slice(0, 254)

// Sanitize a numeric string — only digits, dot, and minus
export const sanitizeNumeric = (str) =>
  String(str ?? "").replace(/[^0-9.\-]/g, "").slice(0, 20)

// Sanitize a short label / name (no HTML-like characters)
export const sanitizeName = (str, maxLen = 120) =>
  sanitizeText(str, maxLen).replace(/[<>'"]/g, "")

// Validate email format
export const isValidEmail = (str) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str ?? "").trim())

// Sanitize an entire project object before saving
export const sanitizeProject = (p) => ({
  ...p,
  name:            sanitizeName(p.name, 120),
  address:         sanitizeText(p.address, 200),
  contactName:     sanitizeName(p.contactName, 80),
  contactPhone:    sanitizeText(p.contactPhone, 30),
  email:           sanitizeEmail(p.email),
  contractorName:  sanitizeName(p.contractorName, 80),
  contractorContact: sanitizeText(p.contractorContact, 80),
  deliveryNotes:   sanitizeText(p.deliveryNotes, 300),
  deliveryAmount:  sanitizeNumeric(p.deliveryAmount),
  taxRate:         sanitizeNumeric(p.taxRate),
})
