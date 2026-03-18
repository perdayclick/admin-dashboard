import { useState } from 'react'
import './Modal.css'

const BLOCK_MESSAGE_MAX = 100

/**
 * Modal when blocking a user: optional message (max 100 chars) shown on login / protected routes (same field as inactive message on User).
 */
export default function BlockMessageModal({
  title = 'Block',
  entityLabel,
  onSubmit,
  onCancel,
  submitting,
  error,
}) {
  const [blockMessage, setBlockMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      blockMessage: blockMessage.trim().slice(0, BLOCK_MESSAGE_MAX),
    })
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box modal-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <p className="modal-message">
            They can still log in with phone and OTP but cannot use the app. The message below is shown when they try to use protected features (max {BLOCK_MESSAGE_MAX} characters, optional).
          </p>
          {entityLabel && (
            <p className="modal-hint" style={{ marginBottom: '0.75rem' }}>
              <strong>Account:</strong> {entityLabel}
            </p>
          )}
          {error && <div className="modal-error" role="alert">{error}</div>}
          <label className="modal-label">
            Block message (optional)
            <textarea
              value={blockMessage}
              onChange={(e) => setBlockMessage(e.target.value.slice(0, BLOCK_MESSAGE_MAX))}
              className="modal-input"
              rows={3}
              placeholder="e.g. Account suspended. Contact support."
              maxLength={BLOCK_MESSAGE_MAX}
            />
            <span className="modal-hint">{blockMessage.length}/{BLOCK_MESSAGE_MAX}</span>
          </label>
          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="modal-btn primary" style={{ background: 'var(--mgmt-danger, #b91c1c)' }} disabled={submitting}>
              {submitting ? 'Please wait…' : 'Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
