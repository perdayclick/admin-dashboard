/**
 * Get initials from a name or email (e.g. "John Doe" -> "JD", "john@mail.com" -> "JM").
 * @param {string} [nameOrEmail]
 * @param {string} [fallback='-']
 * @returns {string}
 */
export function initials(nameOrEmail, fallback = '-') {
  if (!nameOrEmail) return fallback
  const s = String(nameOrEmail).trim()
  const parts = s.split(/[\s@.]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

/**
 * Human-readable KYC status label.
 * @param {string} [status]
 * @param {string} [fallback='-']
 * @returns {string}
 */
export function kycLabel(status, fallback = '-') {
  if (!status) return fallback
  const map = { APPROVED: 'Verified', PENDING: 'Pending', REJECTED: 'Rejected' }
  return map[status] ?? status
}

/**
 * CSS class(es) for KYC badge. Use with a base class prefix (e.g. 'mgmt-badge').
 * @param {string} [status]
 * @param {string} baseClass - e.g. 'mgmt-badge'
 * @returns {string}
 */
export function getKycBadgeClass(status, baseClass = 'mgmt-badge') {
  if (status === 'APPROVED') return `${baseClass} mgmt-kyc-verified`
  if (status === 'REJECTED') return `${baseClass} mgmt-kyc-rejected`
  return `${baseClass} mgmt-kyc-pending`
}

/**
 * Human-readable KYC image verification label (e.g. VERIFIED -> "Verified").
 * @param {string} [value]
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function kycImageVerificationLabel(value, fallback = '—') {
  if (!value || typeof value !== 'string') return fallback
  const v = value.trim().toUpperCase()
  const map = { VERIFIED: 'Verified', PENDING: 'Pending', FAILED: 'Failed', APPROVED: 'Verified', REJECTED: 'Failed' }
  return map[v] ?? value
}

/**
 * CSS class for KYC image verification badge.
 * @param {string} [value]
 * @returns {string}
 */
export function getKycImageVerificationBadgeClass(value) {
  if (!value) return 'view-badge view-badge-muted'
  const v = String(value).trim().toUpperCase()
  if (v === 'VERIFIED' || v === 'APPROVED') return 'view-badge view-badge-success'
  if (v === 'FAILED' || v === 'REJECTED') return 'view-badge view-badge-danger'
  return 'view-badge view-badge-warning'
}

/** Default timezone for admin-facing dates (India). */
const ADMIN_TIME_ZONE = 'Asia/Kolkata'

function toValidDate(value) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Date and time for admin lists (e.g. Payments, Penalties). Uses IST unless overridden.
 * @param {string|number|Date} [value]
 * @param {{ timeZone?: string }} [opts]
 */
export function formatAdminDateTime(value, opts = {}) {
  const d = toValidDate(value)
  if (!d) return '—'
  const timeZone = opts.timeZone ?? ADMIN_TIME_ZONE
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(d)
}

/**
 * Calendar date only (no time), IST by default.
 * @param {string|number|Date} [value]
 * @param {{ timeZone?: string }} [opts]
 */
export function formatAdminDate(value, opts = {}) {
  const d = toValidDate(value)
  if (!d) return '—'
  const timeZone = opts.timeZone ?? ADMIN_TIME_ZONE
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(d)
}

/**
 * Parse API error for display message.
 * @param {Error} err
 * @param {string} [defaultMsg='Request failed']
 * @returns {string}
 */
export function getErrorMessage(err, defaultMsg = 'Request failed') {
  let body = err?.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      /* keep string */
    }
  }
  const fromBody =
    body && typeof body === 'object' ? body.message ?? body.error : null
  const raw = (typeof fromBody === 'string' ? fromBody : null) ?? err?.message
  const msg = typeof raw === 'string' ? raw.trim() : ''

  if (!msg) return defaultMsg

  if (/^route not found$/i.test(msg)) {
    return 'API route not found. Restart the backend with the latest code (penalties live at GET /api/job/ledger/penalties).'
  }
  if (
    /failed to fetch|networkerror|load failed|network request failed/i.test(msg) ||
    err?.status === 0
  ) {
    return 'Cannot reach the server. Start the backend (npm run dev in the backend folder) and set VITE_API_URL to that host (e.g. http://localhost:5000).'
  }

  return typeof raw === 'string' ? raw : defaultMsg
}
