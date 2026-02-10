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
 * Parse API error for display message.
 * @param {Error} err
 * @param {string} [defaultMsg='Request failed']
 * @returns {string}
 */
export function getErrorMessage(err, defaultMsg = 'Request failed') {
  const msg = err?.body?.message ?? err?.body?.error ?? err?.message
  return typeof msg === 'string' ? msg : defaultMsg
}
