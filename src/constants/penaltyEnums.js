/** Match backend PENALTY_* constants */

export const PENALTY_STATUS = {
  PENDING: 'PENDING',
  DUE: 'DUE',
  PAID: 'PAID',
  WAIVED: 'WAIVED',
}

export const PENALTY_PAYER_TYPE = {
  WORKER: 'WORKER',
  EMPLOYER: 'EMPLOYER',
}

export const PENALTY_REASON = {
  WORKER_WITHDRAW_AFTER_HIRE: 'WORKER_WITHDRAW_AFTER_HIRE',
  EMPLOYER_REMOVE_WORKER: 'EMPLOYER_REMOVE_WORKER',
  EMPLOYER_DISABLE_JOB: 'EMPLOYER_DISABLE_JOB',
}

export const PENALTY_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: PENALTY_STATUS.PENDING, label: 'Pending' },
  { value: PENALTY_STATUS.DUE, label: 'Due' },
  { value: PENALTY_STATUS.PAID, label: 'Paid' },
  { value: PENALTY_STATUS.WAIVED, label: 'Waived' },
]

export function penaltyStatusLabel(s) {
  const map = {
    PENDING: 'Pending',
    DUE: 'Due',
    PAID: 'Paid',
    WAIVED: 'Waived',
  }
  return map[s] || s || '—'
}

export function penaltyStatusBadgeClass(s) {
  if (s === 'PAID' || s === 'WAIVED') return 'badge-success'
  if (s === 'DUE') return 'badge-warning'
  if (s === 'PENDING') return 'badge-warning'
  return 'badge-secondary'
}

export function penaltyReasonLabel(r) {
  const map = {
    WORKER_WITHDRAW_AFTER_HIRE: 'Worker withdrew after hire',
    EMPLOYER_REMOVE_WORKER: 'Employer removed worker',
    EMPLOYER_DISABLE_JOB: 'Employer disabled job (after hire)',
  }
  return map[r] || r || '—'
}

export function penaltyPayerLabel(p) {
  if (p === 'WORKER') return 'Worker'
  if (p === 'EMPLOYER') return 'Employer'
  return p || '—'
}
