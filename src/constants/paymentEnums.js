/** Match backend Payment model enums */

export const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All payment statuses' },
  { value: 'initiated', label: 'Initiated' },
  { value: 'pending', label: 'Pending' },
  { value: 'captured', label: 'Captured' },
  { value: 'failed', label: 'Failed' },
  { value: 'expired', label: 'Expired' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'underpaid', label: 'Underpaid' },
]

export const PAYOUT_STATUS_OPTIONS = [
  { value: '', label: 'All payout statuses' },
  { value: 'not_applicable', label: 'Not applicable' },
  { value: 'pending', label: 'Pending' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'disputed', label: 'Disputed' },
]

export function paymentStatusLabel(s) {
  if (!s) return '—'
  const map = {
    initiated: 'Initiated',
    pending: 'Pending',
    captured: 'Captured',
    failed: 'Failed',
    expired: 'Expired',
    refunded: 'Refunded',
    underpaid: 'Underpaid',
  }
  return map[s] || s
}

export function payoutStatusLabel(s) {
  if (!s) return '—'
  const map = {
    not_applicable: 'N/A',
    pending: 'Pending',
    on_hold: 'On hold',
    processing: 'Processing',
    paid: 'Paid',
    failed: 'Failed',
    disputed: 'Disputed',
  }
  return map[s] || s
}

export function paymentStatusBadgeClass(s) {
  if (s === 'captured') return 'badge-success'
  if (s === 'failed' || s === 'expired' || s === 'refunded') return 'badge-secondary'
  if (s === 'underpaid') return 'badge-warning'
  if (s === 'pending' || s === 'initiated') return 'badge-warning'
  return 'badge-secondary'
}

export function payoutStatusBadgeClass(s) {
  if (s === 'paid') return 'badge-success'
  if (s === 'failed' || s === 'disputed') return 'badge-secondary'
  if (s === 'pending' || s === 'processing' || s === 'on_hold') return 'badge-warning'
  return 'badge-secondary'
}

export function disputeStatusLabel(d) {
  if (!d || d.status === 'none' || d.status == null) return '—'
  const map = {
    open: 'Open',
    resolved_worker: 'Resolved (worker)',
    resolved_employer: 'Resolved (employer)',
    auto_released: 'Auto-released',
  }
  return map[d.status] || d.status
}
