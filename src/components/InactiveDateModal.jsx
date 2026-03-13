import { useState } from 'react'
import './Modal.css'

/**
 * Modal to set inactive date range for a user. From/To dates required.
 */
export default function InactiveDateModal({ user, onSubmit, onCancel, submitting, error }) {
  const [inactiveFrom, setInactiveFrom] = useState('')
  const [inactiveTo, setInactiveTo] = useState('')
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
    onSubmit({ inactiveFrom: inactiveFrom, inactiveTo: inactiveTo })
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box modal-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Set user inactive</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <p className="modal-message">
            Choose the date range during which this user will be inactive. They can login but cannot perform any actions.
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
