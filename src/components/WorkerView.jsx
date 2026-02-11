import { kycLabel as formatKycLabel } from '../utils/format'
import './Modal.css'

function kycClass(s) {
  if (s === 'APPROVED') return 'view-kyc-verified'
  if (s === 'REJECTED') return 'view-kyc-rejected'
  return 'view-kyc-pending'
}

function formatDate(v) {
  if (!v) return '—'
  if (typeof v === 'string') return v.slice(0, 10)
  if (v.toISOString) return v.toISOString().slice(0, 10)
  return '—'
}

function formatAddress(addr) {
  if (!addr || typeof addr !== 'object') return '—'
  const parts = [addr.addressText, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}

export default function WorkerView({ worker, onClose }) {
  const u = worker?.userId || worker?.user
  const phone = u?.phone ?? worker?.phone ?? '—'
  const email = u?.email ?? worker?.email ?? '—'
  const kyc = worker?.kyc
  const addr = Array.isArray(worker?.address) && worker.address[0] ? worker.address[0] : null
  const wallet = worker?.wallet

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-view modal-view-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '90vh' }}>
        <div className="modal-header">
          <h2 className="modal-title">Worker details</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <section className="view-section">
            <h3 className="view-section-title">User &amp; profile</h3>
            <div className="view-row">
              <span className="view-label">Full name</span>
              <span className="view-value">{worker?.fullName || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Phone</span>
              <span className="view-value">{phone}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Phone number (worker)</span>
              <span className="view-value">{worker?.phoneNumber || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">WhatsApp</span>
              <span className="view-value">{worker?.whatsappNumber || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Email</span>
              <span className="view-value">{email}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Gender</span>
              <span className="view-value">{worker?.gender || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Age</span>
              <span className="view-value">{worker?.age ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Date of birth</span>
              <span className="view-value">{formatDate(worker?.dob)}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Worker level</span>
              <span className="view-value">{worker?.workerLevel || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Availability</span>
              <span className="view-value">{worker?.availabilityStatus || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Profile score</span>
              <span className="view-value">{worker?.profileScore ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Rating average</span>
              <span className="view-value">{worker?.ratingAverage ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Unique worker ID</span>
              <span className="view-value">{worker?.uniqueWorkerId || '—'}</span>
            </div>
          </section>
          <section className="view-section">
            <h3 className="view-section-title">Skills &amp; work</h3>
            <div className="view-row">
              <span className="view-label">Skills</span>
              <span className="view-value">{Array.isArray(worker?.skills) && worker.skills.length ? worker.skills.join(', ') : '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Experience level</span>
              <span className="view-value">{worker?.experienceLevel || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Daily earning expectation (₹)</span>
              <span className="view-value">{worker?.dailyEarningExpectation ?? '—'}</span>
            </div>
          </section>
          <section className="view-section">
            <h3 className="view-section-title">Address</h3>
            <div className="view-row">
              <span className="view-label">Address</span>
              <span className="view-value">{formatAddress(addr)}</span>
            </div>
          </section>
          <section className="view-section">
            <h3 className="view-section-title">KYC</h3>
            <div className="view-row">
              <span className="view-label">Status</span>
              <span className={`view-value ${kycClass(kyc?.status)}`}>{formatKycLabel(kyc?.status)}</span>
            </div>
            {kyc?.aadhaarReference && (
              <div className="view-row">
                <span className="view-label">Aadhaar reference</span>
                <span className="view-value">{kyc.aadhaarReference}</span>
              </div>
            )}
            {kyc?.bankAccountNumber && (
              <div className="view-row">
                <span className="view-label">Bank account</span>
                <span className="view-value">{kyc.bankAccountNumber}</span>
              </div>
            )}
            {kyc?.ifscCode && (
              <div className="view-row">
                <span className="view-label">IFSC</span>
                <span className="view-value">{kyc.ifscCode}</span>
              </div>
            )}
            {kyc?.upiId && (
              <div className="view-row">
                <span className="view-label">UPI ID</span>
                <span className="view-value">{kyc.upiId}</span>
              </div>
            )}
            {kyc?.verifiedAt && (
              <div className="view-row">
                <span className="view-label">Verified at</span>
                <span className="view-value">{formatDate(kyc.verifiedAt)}</span>
              </div>
            )}
            {kyc?.remarks && (
              <div className="view-row">
                <span className="view-label">Remarks</span>
                <span className="view-value">{kyc.remarks}</span>
              </div>
            )}
          </section>
          {wallet && (wallet.balance != null || wallet.amountCredit != null || wallet.amountDebit != null) && (
            <section className="view-section">
              <h3 className="view-section-title">Wallet</h3>
              <div className="view-row">
                <span className="view-label">Balance (₹)</span>
                <span className="view-value">{wallet.balance ?? '—'}</span>
              </div>
              <div className="view-row">
                <span className="view-label">Credit</span>
                <span className="view-value">{wallet.amountCredit ?? '—'}</span>
              </div>
              <div className="view-row">
                <span className="view-label">Debit</span>
                <span className="view-value">{wallet.amountDebit ?? '—'}</span>
              </div>
            </section>
          )}
          <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
            <button type="button" className="modal-btn secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
