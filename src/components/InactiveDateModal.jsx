import { useState } from 'react'
import './Modal.css'

const INACTIVE_MESSAGE_MAX = 100

/**
 * Modal to set inactive date range and optional message for a user. From/To dates required.
 * Message (max 100 chars) is shown to the user when they login.
 */
export default function InactiveDateModal({ user, onSubmit, onCancel, submitting, error }) {
  const [inactiveFrom, setInactiveFrom] = useState('')
  const [inactiveTo, setInactiveTo] = useState('')
  const [inactiveMessage, setInactiveMessage] = useState('')
  const [dateError, setDateError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setDateError('')
    if (!inactiveFrom || !inactiveTo) return
    const from = new Date(inactiveFrom)
    const to = new Date(inactiveTo)
    if (from > to) {
      setDateError('From date must be on or before To date.')
      return
    }
    onSubmit({
      inactiveFrom,
      inactiveTo,
      inactiveMessage: inactiveMessage.trim().slice(0, INACTIVE_MESSAGE_MAX),
    })
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box modal-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Set inactive</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <p className="modal-message">
            Choose the date range during which they will be inactive. They can log in but cannot use the app until the period ends. After the <strong>To</strong> date (end of that calendar day, UTC), they become <strong>active again automatically</strong>. The message below is shown while they are inactive.
          </p>
          {(error || dateError) && <div className="modal-error" role="alert">{dateError || error}</div>}
          <label className="modal-label">
            From date
            <input
              type="date"
              value={inactiveFrom}
              onChange={(e) => setInactiveFrom(e.target.value)}
              className="modal-input"
              required
            />
          </label>
          <label className="modal-label">
            To date
            <input
              type="date"
              value={inactiveTo}
              onChange={(e) => setInactiveTo(e.target.value)}
              className="modal-input"
              required
            />
          </label>
          <label className="modal-label">
            Message to show on login (optional, max {INACTIVE_MESSAGE_MAX} characters)
            <textarea
              value={inactiveMessage}
              onChange={(e) => setInactiveMessage(e.target.value.slice(0, INACTIVE_MESSAGE_MAX))}
              className="modal-input"
              rows={3}
              placeholder="e.g. Your account is temporarily inactive. Contact support."
              maxLength={INACTIVE_MESSAGE_MAX}
            />
            <span className="modal-hint">{inactiveMessage.length}/{INACTIVE_MESSAGE_MAX}</span>
          </label>
          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
            <button type="submit" className="modal-btn primary" disabled={submitting || !inactiveFrom || !inactiveTo}>
              {submitting ? 'Please wait…' : 'Set inactive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
