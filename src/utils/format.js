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

/**
 * Parse API error for display message.
 * @param {Error} err
 * @param {string} [defaultMsg='Request failed']
 * @returns {string}
 */
export function getErrorMessage(err, defaultMsg = 'Request failed') {
  const msg = err?.body?.message ?? err?.body?.error ?? err?.message
  return typeof msg === 'string' ? msg : defaultMsg
}
