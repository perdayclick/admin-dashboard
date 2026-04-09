/**
 * Helpers for job listing end (`listingEndsAt`) — matches backend:
 * - `YYYY-MM-DD` only → end of that calendar day 23:59:59.999 IST (+05:30)
 * - `YYYY-MM-DDTHH:mm:00+05:30` → exact instant
 */

export const LISTING_ENDS_HELP_TEXT =
  'Date only: listing ends at end of that day (11:59:59 PM IST). If you set a time, that exact moment is used (IST).'

export function effectiveWorkerTarget(job) {
  if (job?.workersCommitted != null && Number.isFinite(Number(job.workersCommitted))) {
    return Math.max(1, Math.floor(Number(job.workersCommitted)))
  }
  return Math.max(1, Number(job?.workersRequired) || 1)
}

/** @returns {{ date: string, time: string }} for <input type="date"> and <input type="time"> */
export function listingEndsAtToFormParts(iso) {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d)
    const g = (t) => parts.find((p) => p.type === t)?.value || ''
    const y = g('year')
    const m = g('month')
    const day = g('day')
    const date = y && m && day ? `${y}-${m}-${day}` : ''
    const hour = g('hour')
    const minute = g('minute')
    const time = hour !== '' && minute !== '' ? `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}` : ''
    return { date, time }
  } catch {
    return { date: d.toISOString().slice(0, 10), time: '' }
  }
}

/** @returns {string|undefined} ISO fragment for API */
export function buildListingEndsAtPayload(dateStr, timeStr) {
  if (!dateStr || !String(dateStr).trim()) return undefined
  const d = String(dateStr).trim()
  const t = timeStr && String(timeStr).trim()
  if (!t) return d
  return `${d}T${t}:00+05:30`
}
