import { kycLabel as formatKycLabel, kycImageVerificationLabel, getKycImageVerificationBadgeClass } from '../utils/format'
import { hasAnyKycImages, getAllKycImageItems } from '../utils/kycImages'
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

export default function WorkerView({ worker, onClose, onApproveKyc }) {
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
            <p className="view-detail-section-subtitle">Contact</p>
            <div className="view-row">
              <span className="view-label">Full name</span>
              <span className="view-value">{worker?.fullName || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Phone</span>
              <span className="view-value">{phone}</span>
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
            <p className="view-detail-section-subtitle">Profile</p>
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
            <div className="view-row view-row-full">
              <span className="view-label">Skills</span>
              <span className="view-value">
                {Array.isArray(worker?.skills) && worker.skills.length > 0 ? (
                  <div className="view-tags">
                    {worker.skills.map((skill, i) => (
                      <span key={i} className="view-tag">{skill}</span>
                    ))}
                  </div>
                ) : (
                  '—'
                )}
              </span>
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
            {addr && (addr.addressText || addr.city || addr.state || addr.pincode || addr.country) ? (
              <>
                {addr.addressText && (
                  <div className="view-row">
                    <span className="view-label">Address line</span>
                    <span className="view-value">{addr.addressText}</span>
                  </div>
                )}
                <div className="view-row">
                  <span className="view-label">City</span>
                  <span className="view-value">{addr.city || '—'}</span>
                </div>
                <div className="view-row">
                  <span className="view-label">State</span>
                  <span className="view-value">{addr.state || '—'}</span>
                </div>
                <div className="view-row">
                  <span className="view-label">Pincode</span>
                  <span className="view-value">{addr.pincode || '—'}</span>
                </div>
                <div className="view-row">
                  <span className="view-label">Country</span>
                  <span className="view-value">{addr.country || '—'}</span>
                </div>
              </>
            ) : (
              <div className="view-row">
                <span className="view-label">Address</span>
                <span className="view-value">—</span>
              </div>
            )}
          </section>
          <section className="view-section view-section-kyc">
            <h3 className="view-section-title">KYC</h3>
            {kyc && (
              <>
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
              </>
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
            {kyc?.aadhaarReference && (
              <div className="view-row">
                <span className="view-label">Aadhaar reference</span>
                <span className="view-value">{kyc.aadhaarReference}</span>
              </div>
            )}
            {hasAnyKycImages(kyc) && (
              <div className="view-row">
                <span className="view-label">Documents &amp; photos</span>
                <span className="view-value">
                  <div className="view-kyc-images-grid">
                    {getAllKycImageItems(kyc).map((item, index) => (
                      <div key={`${item.imageUrl}-${index}`} className="view-kyc-image-item">
                        <img src={item.imageUrl} alt={item.label} />
                        <div className="view-kyc-image-caption">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </span>
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
            {kyc?.status === 'REJECTED' && (kyc?.rejectedImages?.length > 0 || kyc?.rejectedImageType || kyc?.kycRejectedReason) && (
              <>
                {(kyc.rejectedImages?.length > 0 || kyc.rejectedImageType) && (
                  <div className="view-row">
                    <span className="view-label">Rejected image(s)</span>
                    <span className="view-value">
                      {kyc.rejectedImages?.length > 0
                        ? kyc.rejectedImages.map((e, i) => (
                            <span key={i}>
                              {e.imageType === 'FRONT' ? 'Aadhaar front' : e.imageType === 'BACK' ? 'Aadhaar back' : 'Profile image'}
                              {kyc.rejectedImages.length > 1 && i < kyc.rejectedImages.length - 1 ? ', ' : ''}
                            </span>
                          ))
                        : kyc.rejectedImageType === 'FRONT' ? 'Aadhaar front' : kyc.rejectedImageType === 'BACK' ? 'Aadhaar back' : kyc.rejectedImageType === 'SELFIE' ? 'Profile image' : kyc.rejectedImageType}
                    </span>
                  </div>
                )}
                {kyc.kycRejectedReason && (
                  <div className="view-row">
                    <span className="view-label">KYC rejected reason</span>
                    <span className="view-value">{kyc.kycRejectedReason}</span>
                  </div>
                )}
              </>
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
