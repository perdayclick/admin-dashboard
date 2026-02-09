import './Modal.css'

export default function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, loading, variant = 'primary' }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box modal-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">&times;</button>
        </div>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button type="button" className="modal-btn secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button type="button" className={`modal-btn ${variant === 'danger' ? 'danger' : 'primary'}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
