import { kycLabel as formatKycLabel } from '../utils/format'
import './Modal.css'

function kycClass(s) {
  if (s === 'APPROVED') return 'view-kyc-verified'
  if (s === 'REJECTED') return 'view-kyc-rejected'
  return 'view-kyc-pending'
}

export default function WorkerView({ worker, onClose }) {
  const u = worker?.userId || worker?.user
  const phone = u?.phone ?? worker?.phone ?? '-'
  const email = u?.email ?? worker?.email ?? '-'
  const kyc = worker?.kyc?.status
  const addr = Array.isArray(worker?.address) && worker.address[0] ? worker.address[0] : null
  const location = addr ? ([addr.city, addr.state].filter(Boolean).join(', ') || addr.addressText || '-') : '-'
  const modalStyle = { maxWidth: '480px' }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-view" onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div className="modal-header">
          <h2 className="modal-title">Worker details</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <div className="view-row">
            <span className="view-label">Name</span>
            <span className="view-value">{worker?.fullName || '-'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Phone</span>
            <span className="view-value">{phone}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Email</span>
            <span className="view-value">{email}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Location</span>
            <span className="view-value">{location}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Verification (KYC)</span>
            <span className={`view-value ${kycClass(kyc)}`}>{formatKycLabel(kyc)}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Skills</span>
            <span className="view-value">{Array.isArray(worker?.skills) ? worker.skills.join(', ') : '-'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Experience</span>
            <span className="view-value">{worker?.experienceLevel || '-'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Daily expectation (₹)</span>
            <span className="view-value">{worker?.dailyEarningExpectation ?? '-'}</span>
          </div>
          {worker?.kyc?.remarks && (
            <div className="view-row">
              <span className="view-label">KYC remarks</span>
              <span className="view-value">{worker.kyc.remarks}</span>
            </div>
          )}
          <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
            <button type="button" className="modal-btn secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
