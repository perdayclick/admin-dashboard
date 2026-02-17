import { kycLabel as formatKycLabel, kycImageVerificationLabel, getKycImageVerificationBadgeClass } from '../utils/format'
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

export default function EmployerView({ employer, onClose, onApproveKyc }) {
  const u = employer?.userId || employer?.user
  const phone = u?.phone ?? employer?.phone ?? '—'
  const email = u?.email ?? employer?.email ?? '—'
  const kyc = employer?.kyc
  const addr = Array.isArray(employer?.address) && employer.address[0] ? employer.address[0] : null
  const wallet = employer?.wallet

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-view modal-view-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '90vh' }}>
        <div className="modal-header">
          <h2 className="modal-title">Employer details</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <section className="view-section">
            <h3 className="view-section-title">User &amp; business</h3>
            <div className="view-row">
              <span className="view-label">Full name</span>
              <span className="view-value">{employer?.fullName || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Gender</span>
              <span className="view-value">{employer?.gender || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Business name</span>
              <span className="view-value">{employer?.businessName || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Company name</span>
              <span className="view-value">{employer?.companyName || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">GST number</span>
              <span className="view-value">{employer?.gstNumber || '—'}</span>
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
              <span className="view-label">Date of birth</span>
              <span className="view-value">{formatDate(employer?.dob)}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Verification type</span>
              <span className="view-value">{employer?.verificationType || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Availability</span>
              <span className="view-value">{employer?.availabilityStatus || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Profile completion %</span>
              <span className="view-value">{employer?.profileCompletionPercent ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Rating average</span>
              <span className="view-value">{employer?.ratingAverage ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Total jobs posted</span>
              <span className="view-value">{employer?.totalJobsPosted ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Verified</span>
              <span className="view-value">{employer?.isVerified ? 'Yes' : 'No'}</span>
            </div>
          </section>
          <section className="view-section">
            <h3 className="view-section-title">Job categories</h3>
            <div className="view-row">
              <span className="view-label">Categories</span>
              <span className="view-value">{Array.isArray(employer?.jobCategories) && employer.jobCategories.length ? employer.jobCategories.join(', ') : '—'}</span>
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
            {kyc && (
              <div className="view-detail-kyc-header" style={{ marginBottom: '0.75rem' }}>
                <span className={`view-kyc-status-badge ${kyc?.status === 'APPROVED' ? 'verified' : kyc?.status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                  {formatKycLabel(kyc?.status)}
                </span>
                {kyc?.kycImageVerification ? (
                  <span className={getKycImageVerificationBadgeClass(kyc.kycImageVerification)}>
                    {kycImageVerificationLabel(kyc.kycImageVerification)}
                  </span>
                ) : null}
              </div>
            )}
            <div className="view-row">
              <span className="view-label">Status</span>
              <span className={`view-value ${kycClass(kyc?.status)}`}>{formatKycLabel(kyc?.status)}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Image verification</span>
              <span className="view-value">
                {kyc?.kycImageVerification ? (
                  <span className={getKycImageVerificationBadgeClass(kyc.kycImageVerification)}>
                    {kycImageVerificationLabel(kyc.kycImageVerification)}
                  </span>
                ) : (
                  '—'
                )}
              </span>
            </div>
            {kyc?.gstCertificate && (
              <div className="view-row">
                <span className="view-label">GST certificate</span>
                <span className="view-value">{kyc.gstCertificate}</span>
              </div>
            )}
            {kyc?.companyPan && (
              <div className="view-row">
                <span className="view-label">Company PAN</span>
                <span className="view-value">{kyc.companyPan}</span>
              </div>
            )}
            {(kyc?.aadhaarFrontImage || kyc?.aadhaarBackImage || kyc?.selfieImage) && (
              <div className="view-row">
                <span className="view-label">Documents &amp; photos</span>
                <span className="view-value">
                  <div className="view-kyc-images-grid">
                    {kyc.aadhaarFrontImage && (
                      <div className="view-kyc-image-item">
                        <img src={kyc.aadhaarFrontImage} alt="Aadhaar front" />
                        <div className="view-kyc-image-caption">Aadhaar front</div>
                      </div>
                    )}
                    {kyc.aadhaarBackImage && (
                      <div className="view-kyc-image-item">
                        <img src={kyc.aadhaarBackImage} alt="Aadhaar back" />
                        <div className="view-kyc-image-caption">Aadhaar back</div>
                      </div>
                    )}
                    {kyc.selfieImage && (
                      <div className="view-kyc-image-item">
                        <img src={kyc.selfieImage} alt="Selfie" />
                        <div className="view-kyc-image-caption">Selfie</div>
                      </div>
                    )}
                  </div>
                </span>
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
              {wallet.commission != null && (
                <div className="view-row">
                  <span className="view-label">Commission</span>
                  <span className="view-value">{wallet.commission}</span>
                </div>
              )}
            </section>
          )}
          <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 0, display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" className="modal-btn secondary" onClick={onClose}>Close</button>
            {onApproveKyc && kyc?.status !== 'APPROVED' && (
              <button type="button" className="modal-btn primary" onClick={onApproveKyc}>
                Approve KYC
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
