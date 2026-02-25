/** Match backend config/constants for Job schema */

export const JOB_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  LIVE: 'LIVE',
  HIRED: 'HIRED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  INACTIVE_PENDING_PAYMENT: 'INACTIVE_PENDING_PAYMENT',
  CLOSED: 'CLOSED',
}

/** Admin actions: Approve/Reject set status to APPROVED or REJECTED; then only LIVE or CLOSED allowed */
export const JOB_ACTION = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  GO_LIVE: 'GO_LIVE',
  CLOSE: 'CLOSE',
}

/** Statuses that represent "active" job (after approval, only LIVE or CLOSED are end states) */
export const JOB_STATUS_ACTIVE = [JOB_STATUS.LIVE]
export const JOB_STATUS_FINAL = [JOB_STATUS.LIVE, JOB_STATUS.CLOSED]

export const JOB_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: JOB_STATUS.PENDING, label: 'Pending' },
  { value: JOB_STATUS.APPROVED, label: 'Approved' },
  { value: JOB_STATUS.REJECTED, label: 'Rejected' },
  { value: JOB_STATUS.LIVE, label: 'Live' },
  { value: JOB_STATUS.HIRED, label: 'Booked' },
  { value: JOB_STATUS.COMPLETED, label: 'Completed' },
  { value: JOB_STATUS.CANCELLED, label: 'Cancelled' },
  { value: JOB_STATUS.INACTIVE_PENDING_PAYMENT, label: 'Inactive (unpaid)' },
  { value: JOB_STATUS.CLOSED, label: 'Closed' },
]

export const WORK_TYPE = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  TASK: 'TASK',
  PER_DAY: 'PER_DAY',
}

export const WORK_TYPE_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: WORK_TYPE.FULL_TIME, label: 'Full time' },
  { value: WORK_TYPE.PART_TIME, label: 'Part time' },
  { value: WORK_TYPE.TASK, label: 'Task' },
  { value: WORK_TYPE.PER_DAY, label: 'Per day' },
]

export const PAYOUT_TYPE = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  TASK_BASED: 'TASK_BASED',
}

export const PAYOUT_TYPE_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: PAYOUT_TYPE.DAILY, label: 'Daily' },
  { value: PAYOUT_TYPE.WEEKLY, label: 'Weekly' },
  { value: PAYOUT_TYPE.MONTHLY, label: 'Monthly' },
  { value: PAYOUT_TYPE.TASK_BASED, label: 'Task based' },
]

export const SHIFT_TYPE = {
  DAY: 'DAY',
  NIGHT: 'NIGHT',
  FLEXIBLE: 'FLEXIBLE',
}

export const SHIFT_TYPE_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: SHIFT_TYPE.DAY, label: 'Day' },
  { value: SHIFT_TYPE.NIGHT, label: 'Night' },
  { value: SHIFT_TYPE.FLEXIBLE, label: 'Flexible' },
]

export const CHECK_IN_METHOD = {
  GPS: 'GPS',
  QR: 'QR',
  MANUAL: 'MANUAL',
}

export const CHECK_IN_METHOD_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: CHECK_IN_METHOD.GPS, label: 'GPS' },
  { value: CHECK_IN_METHOD.QR, label: 'QR' },
  { value: CHECK_IN_METHOD.MANUAL, label: 'Manual' },
]

export const CANCELLATION_REASON = {
  NOT_FIT: 'NOT_FIT',
  CHANGED_PLAN: 'CHANGED_PLAN',
  DUPLICATE: 'DUPLICATE',
  OTHER: 'OTHER',
}

/** Status label for UI. HIRED = "Booked" (job has worker assigned). */
export function jobStatusLabel(s) {
  const map = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    LIVE: 'Live',
    HIRED: 'Booked',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    INACTIVE_PENDING_PAYMENT: 'Inactive (unpaid)',
    CLOSED: 'Closed',
    REJECTED: 'Rejected',
  }
  return map[s] || s || '—'
}

export function jobStatusBadgeClass(s) {
  if (s === 'LIVE') return 'badge-success'
  if (s === 'APPROVED' || s === 'HIRED') return 'badge-info'
  if (s === 'COMPLETED' || s === 'CLOSED') return 'badge-secondary'
  if (s === 'REJECTED' || s === 'CANCELLED' || s === 'INACTIVE_PENDING_PAYMENT') return 'badge-danger'
  return 'badge-warning'
}
