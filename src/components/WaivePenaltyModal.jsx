import './Modal.css'

export default function WaivePenaltyModal({ onConfirm, onCancel, loading, note, onNoteChange }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2 className="modal-title">Waive penalty</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <p className="modal-message" style={{ marginBottom: '1rem' }}>
            This records the row as waived and clears pay-before-unlock where applicable. Optional note is stored on the penalty.
          </p>
          <label className="modal-label">
            Note (optional)
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              className="modal-input"
              rows={3}
              placeholder="Reason for waiver…"
              style={{ resize: 'vertical', width: '100%' }}
            />
          </label>
          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="modal-btn secondary" onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="button" className="modal-btn primary" onClick={onConfirm} disabled={loading}>
              {loading ? 'Saving…' : 'Waive penalty'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
