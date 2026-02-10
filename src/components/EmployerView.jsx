import { kycLabel as formatKycLabel } from '../utils/format'
import './Modal.css'

function kycClass(s) {
  if (s === 'APPROVED') return 'view-kyc-verified'
  if (s === 'REJECTED') return 'view-kyc-rejected'
  return 'view-kyc-pending'
}

export default function EmployerView({ employer, onClose }) {
  const u = employer?.userId || employer?.user
  const phone = u?.phone ?? employer?.phone ?? '—'
  const email = u?.email ?? employer?.email ?? '—'
  const kyc = employer?.kyc?.status
  const addr = Array.isArray(employer?.address) && employer.address[0] ? employer.address[0] : null
  const location = addr ? [addr.city, addr.state].filter(Boolean).join(', ') || addr.addressText : '—'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-view" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Employer details</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <div className="view-row">
            <span className="view-label">Business</span>
            <span className="view-value">{employer?.businessName || '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Company</span>
            <span className="view-value">{employer?.companyName || '—'}</span>
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
            <span className="view-label">Contact person</span>
            <span className="view-value">{employer?.contactPersonName || '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Location</span>
            <span className="view-value">{location || '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Verification (KYC)</span>
            <span className={`view-value ${kycClass(kyc)}`}>{formatKycLabel(kyc)}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Job categories</span>
            <span className="view-value">{Array.isArray(employer?.jobCategories) ? employer.jobCategories.join(', ') : '—'}</span>
          </div>
          {employer?.kyc?.remarks && (
            <div className="view-row">
              <span className="view-label">KYC remarks</span>
              <span className="view-value">{employer.kyc.remarks}</span>
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
