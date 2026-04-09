/** Human-readable job lifecycle status (employer’s job). */
export function jobStatusLabel(status) {
  const map = {
    PENDING: 'Pending approval',
    APPROVED: 'Approved',
    LIVE: 'Open — accepting applications',
    HIRED: 'In progress (worker hired)',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    INACTIVE_PENDING_PAYMENT: 'Cancelled — service charge due',
    CLOSED: 'Closed',
    REJECTED: 'Rejected (admin)',
    LISTING_EXPIRED: 'Listing expired (not visible in nearby)',
  }
  return map[status] || status || '—'
}

/** Whether the job posting is finished successfully from employer perspective */
export function jobCompletedSummary(status) {
  if (status === 'COMPLETED') return { text: 'Yes — completed', variant: 'success' }
  if (status === 'CANCELLED' || status === 'INACTIVE_PENDING_PAYMENT') return { text: 'No — cancelled', variant: 'warning' }
  if (status === 'CLOSED' || status === 'REJECTED') return { text: 'No — closed/rejected', variant: 'muted' }
  if (status === 'LIVE' || status === 'PENDING' || status === 'APPROVED') return { text: 'In progress (not finished)', variant: 'info' }
  if (status === 'HIRED') return { text: 'In progress (hired)', variant: 'info' }
  if (status === 'LISTING_EXPIRED') return { text: 'No — listing expired (no hires)', variant: 'muted' }
  return { text: '—', variant: 'muted' }
}

/** Worker’s application / hire row status */
export function workerApplicationLabel(appStatus, jobStatus) {
  const map = {
    PENDING: 'Applied — awaiting employer',
    HIRED: 'Hired — on the job',
    COMPLETED: 'Work completed',
    REJECTED: 'Application rejected',
    WITHDRAWN: 'Withdrawn by worker',
  }
  if (appStatus === 'HIRED' && jobStatus === 'COMPLETED') return 'Hired — job completed'
  if (appStatus === 'HIRED' && (jobStatus === 'CANCELLED' || jobStatus === 'INACTIVE_PENDING_PAYMENT'))
    return 'Hire cancelled / job cancelled'
  return map[appStatus] || appStatus || '—'
}
