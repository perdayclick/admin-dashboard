import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { employersApi } from '../services/api'
import { kycLabel, kycImageVerificationLabel, getKycImageVerificationBadgeClass, getErrorMessage } from '../utils/format'
import { hasAnyKycImages, getAllKycImageItems } from '../utils/kycImages'
import { PageHeader, Alert, Button } from '../components/ui'
import KycImageVerificationModal from '../components/KycImageVerificationModal'
import '../styles/ManagementPage.css'

function formatDate(v) {
  if (!v) return '—'
  if (typeof v === 'string') return v.slice(0, 10)
  if (v.toISOString) return v.toISOString().slice(0, 10)
  return '—'
}

export default function EmployerDetail() {
  const { employerId } = useParams()
  const navigate = useNavigate()
  const [employer, setEmployer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [kycImageModalOpen, setKycImageModalOpen] = useState(false)
  const [kycImageSubmitting, setKycImageSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    employersApi.get(employerId)
      .then((res) => {
        if (!cancelled) setEmployer(res.data || res)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load employer'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [employerId])

  const handleApproveKyc = async () => {
    if (!employer) return
    setSubmitting(true)
    try {
      const res = await employersApi.update(employer._id, { kycStatus: 'APPROVED' })
      setEmployer(res.data || res)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve KYC'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleKycImageApprove = async () => {
    if (!employer) return
    setKycImageSubmitting(true)
    try {
      const res = await employersApi.update(employer._id, { kycImageVerification: 'VERIFIED' })
      setEmployer(res.data || res)
      setKycImageModalOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update image verification'))
    } finally {
      setKycImageSubmitting(false)
    }
  }

  const handleKycImageReject = async (rejectedImages, kycRejectedReason) => {
    if (!employer) return
    setKycImageSubmitting(true)
    try {
      const res = await employersApi.update(employer._id, {
        kycStatus: 'REJECTED',
        kycImageVerification: 'FAILED',
        rejectedImages: Array.isArray(rejectedImages) ? rejectedImages : [],
        kycRejectedReason: (kycRejectedReason || '').trim(),
      })
      setEmployer(res.data || res)
      setKycImageModalOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reject KYC'))
    } finally {
      setKycImageSubmitting(false)
    }
  }

  if (loading) return <div className="mgmt-page"><div className="mgmt-loading">Loading employer…</div></div>
  if (error && !employer) {
    return (
      <div className="mgmt-page">
        <Alert variant="error">{error}</Alert>
        <Button onClick={() => navigate('/employers')}>Back to Employers</Button>
      </div>
    )
  }

  const u = employer?.userId || employer?.user
  const phone = u?.phone ?? employer?.phone ?? '—'
  const email = u?.email ?? employer?.email ?? '—'
  const kyc = employer?.kyc
  const addr = Array.isArray(employer?.address) && employer.address[0] ? employer.address[0] : null
  const wallet = employer?.wallet

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Employer details"
        subtitle="Review employer profile and KYC"
        primaryAction={kyc?.status !== 'APPROVED' && (
          <Button variant="primary" onClick={handleApproveKyc} disabled={submitting}>
            Approve KYC
          </Button>
        )}
        secondaryAction={<Button onClick={() => navigate('/employers')}>← Back to Employers</Button>}
      />

      {error && employer && <Alert variant="error" className="mgmt-alert">{error}</Alert>}

      <div className="job-view-grid detail-view">
        {/* KYC first – full width */}
        <section className="job-view-card kyc-card-first detail-view-kyc-first">
          <h3 className="view-section-title">KYC</h3>
          {!kyc ? (
            <p className="view-detail-empty-kyc">No KYC submitted yet.</p>
          ) : (
            <>
              <div className="view-detail-kyc-header">
                <span className={`view-kyc-status-badge ${kyc?.status === 'APPROVED' ? 'verified' : kyc?.status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                  {kycLabel(kyc?.status)}
                </span>
                {kyc?.kycImageVerification ? (
                  <span className={getKycImageVerificationBadgeClass(kyc.kycImageVerification)}>
                    Image verification: {kycImageVerificationLabel(kyc.kycImageVerification)}
                  </span>
                ) : null}
              </div>
              {hasAnyKycImages(kyc) && (
                <div className="view-row view-row-full" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
                  <span className="view-label">Verify images</span>
                  <span className="view-value">
                    <Button variant="secondary" onClick={() => setKycImageModalOpen(true)}>
                      Verify KYC images
                    </Button>
                  </span>
                </div>
              )}
              <div className="view-row">
                <span className="view-label">Status</span>
                <span className="view-value">{kycLabel(kyc?.status)}</span>
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
              {hasAnyKycImages(kyc) && (
                <div className="view-row view-row-full">
                  <span className="view-label">Documents &amp; photos</span>
                  <span className="view-value view-value-full">
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
            </>
          )}
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">User &amp; business</h3>
          <p className="view-detail-section-subtitle">Contact</p>
          <div className="view-row"><span className="view-label">Full name</span><span className="view-value">{employer?.fullName || '—'}</span></div>
          <div className="view-row"><span className="view-label">Phone</span><span className="view-value">{phone}</span></div>
          <div className="view-row"><span className="view-label">Email</span><span className="view-value">{email}</span></div>
          <div className="view-row"><span className="view-label">Contact person</span><span className="view-value">{employer?.contactPersonName || '—'}</span></div>
          <div className="view-row"><span className="view-label">Gender</span><span className="view-value">{employer?.gender || '—'}</span></div>
          <div className="view-row"><span className="view-label">Date of birth</span><span className="view-value">{formatDate(employer?.dob)}</span></div>
          <p className="view-detail-section-subtitle">Business</p>
          <div className="view-row"><span className="view-label">Business name</span><span className="view-value">{employer?.businessName || '—'}</span></div>
          <div className="view-row"><span className="view-label">Company name</span><span className="view-value">{employer?.companyName || '—'}</span></div>
          <div className="view-row"><span className="view-label">GST number</span><span className="view-value">{employer?.gstNumber || '—'}</span></div>
          <div className="view-row"><span className="view-label">Verification type</span><span className="view-value">{employer?.verificationType || '—'}</span></div>
          <div className="view-row"><span className="view-label">Availability</span><span className="view-value">{employer?.availabilityStatus || '—'}</span></div>
          <div className="view-row"><span className="view-label">Profile completion %</span><span className="view-value">{employer?.profileCompletionPercent ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Rating average</span><span className="view-value">{employer?.ratingAverage ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Total jobs posted</span><span className="view-value">{employer?.totalJobsPosted ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Verified</span><span className="view-value">{employer?.isVerified ? 'Yes' : 'No'}</span></div>
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Job categories</h3>
          <div className="view-row view-row-full">
            <span className="view-label">Categories</span>
            <span className="view-value">
              {Array.isArray(employer?.jobCategories) && employer.jobCategories.length > 0 ? (
                <div className="view-tags">
                  {employer.jobCategories.map((cat, i) => (
                    <span key={i} className="view-tag">{cat}</span>
                  ))}
                </div>
              ) : (
                '—'
              )}
            </span>
          </div>
        </section>

        <section className="job-view-card">
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

        {wallet && (wallet.balance != null || wallet.amountCredit != null || wallet.amountDebit != null) && (
          <section className="job-view-card">
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
      </div>

      <KycImageVerificationModal
        open={kycImageModalOpen}
        onClose={() => setKycImageModalOpen(false)}
        allImageItems={getAllKycImageItems(kyc)}
        onApprove={handleKycImageApprove}
        onReject={handleKycImageReject}
        loading={kycImageSubmitting}
      />
    </div>
  )
}
