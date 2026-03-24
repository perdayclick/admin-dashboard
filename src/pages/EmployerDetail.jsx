import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { employersApi, jobsApi } from '../services/api'
import { jobStatusLabel, jobCompletedSummary } from '../utils/jobStatusLabels'
import {
  kycLabel,
  kycImageVerificationLabel,
  getKycImageVerificationBadgeClass,
  getErrorMessage,
  formatAdminDate,
} from '../utils/format'
import { hasAnyKycImages, getAllKycImageItems } from '../utils/kycImages'
import { PageHeader, Alert, Button } from '../components/ui'
import KycImageVerificationModal from '../components/KycImageVerificationModal'
import '../styles/ManagementPage.css'

export default function EmployerDetail() {
  const { employerId } = useParams()
  const navigate = useNavigate()
  const [employer, setEmployer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kycImageModalOpen, setKycImageModalOpen] = useState(false)
  const [kycImageSubmitting, setKycImageSubmitting] = useState(false)
  const [postedJobs, setPostedJobs] = useState([])
  const [postedJobsLoading, setPostedJobsLoading] = useState(false)
  const [postedJobsTotal, setPostedJobsTotal] = useState(0)
  const [postedJobsError, setPostedJobsError] = useState('')

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

  useEffect(() => {
    if (!employerId) return
    let cancelled = false
    setPostedJobsLoading(true)
    setPostedJobsError('')
    jobsApi
      .listByEmployer(employerId, { limit: 100, page: 1 })
      .then((res) => {
        if (cancelled) return
        const d = res.data || res
        const jobs = Array.isArray(d.jobs) ? d.jobs : []
        setPostedJobs(jobs)
        setPostedJobsTotal(d.pagination?.total ?? jobs.length)
      })
      .catch((err) => {
        if (!cancelled) {
          setPostedJobs([])
          setPostedJobsTotal(0)
          setPostedJobsError(
            getErrorMessage(err, 'Could not load jobs for this employer.'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setPostedJobsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [employerId])

  /** Modal Approve: sets both kycImageVerification and kycStatus to approved. */
  const handleKycImageApprove = async () => {
    if (!employer) return
    setKycImageSubmitting(true)
    try {
      const res = await employersApi.update(employer._id, {
        kycImageVerification: 'VERIFIED',
        kycStatus: 'APPROVED',
      })
      setEmployer(res.data || res)
      setKycImageModalOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve KYC'))
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
  const displayName = employer?.businessName || employer?.companyName || employer?.fullName || 'Employer'
  const isLocked = employer?.isLocked === true
  const serviceChargeDue = employer?.serviceChargeDue ?? 0
  const displayUniqueEmployerId = employer?.uniqueEmployerId || (employer?._id ? 'E' + String(employer._id).slice(-8).toUpperCase() : '—')

  return (
    <div className="mgmt-page job-detail-page">
      <PageHeader
        title="Employer details"
        subtitle="Review employer profile and KYC"
        primaryAction={<Button variant="secondary" onClick={() => navigate('/jobs?employerId=' + encodeURIComponent(employer._id))}>View jobs</Button>}
        secondaryAction={<Button onClick={() => navigate('/employers')}>← Back to Employers</Button>}
      />

      {error && employer && <Alert variant="error" className="mgmt-alert">{error}</Alert>}

      <div className="job-view-hero">
        <div className="job-view-hero-main">
          <h2 className="job-view-title">{displayName}</h2>
          {employer?.isVerified && <span className="mgmt-badge badge-success">Verified</span>}
          {isLocked && <span className="mgmt-badge badge-warning">Locked (unpaid service charge)</span>}
        </div>
        {(phone !== '—' || displayUniqueEmployerId !== '—') && (
          <p className="job-view-posted">
            {phone !== '—' && <span>{phone}</span>}
            {displayUniqueEmployerId !== '—' && <span>{phone !== '—' ? ' · ' : ''}ID: {displayUniqueEmployerId}</span>}
          </p>
        )}
      </div>

      <div className="job-view-stats">
        <div className="job-view-stat">
          <span className="job-view-stat-value">
            {postedJobsLoading ? '…' : postedJobsError ? '—' : postedJobsTotal}
          </span>
          <span className="job-view-stat-label">Active job listings</span>
        </div>
        <div className="job-view-stat">
          <span className="job-view-stat-value">{employer?.profileCompletionPercent ?? 0}%</span>
          <span className="job-view-stat-label">Profile completion</span>
        </div>
        <div className="job-view-stat">
          <span className="job-view-stat-value">{kyc?.status === 'APPROVED' ? 'Verified' : kyc?.status || '—'}</span>
          <span className="job-view-stat-label">KYC status</span>
        </div>
        {serviceChargeDue > 0 && (
          <div className="job-view-stat">
            <span className="job-view-stat-value">₹{serviceChargeDue}</span>
            <span className="job-view-stat-label">Service charge due</span>
          </div>
        )}
      </div>

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

              {/* Aadhaar & business details below image verification */}
              <p className="view-detail-section-subtitle view-detail-kyc-subtitle">Identity &amp; business details</p>
              {kyc?.aadhaarReference && (
                <div className="view-row">
                  <span className="view-label">Aadhaar reference</span>
                  <span className="view-value">{kyc.aadhaarReference}</span>
                </div>
              )}
              {(employer?.gstNumber || kyc?.gstCertificate) && (
                <div className="view-row">
                  <span className="view-label">GSTIN / GST number</span>
                  <span className="view-value">{employer?.gstNumber || kyc?.gstCertificate || '—'}</span>
                </div>
              )}
              {kyc?.companyPan && (
                <div className="view-row">
                  <span className="view-label">Company PAN</span>
                  <span className="view-value">{kyc.companyPan}</span>
                </div>
              )}
              {kyc?.gstCertificate && employer?.gstNumber !== kyc?.gstCertificate && (
                <div className="view-row">
                  <span className="view-label">GST certificate</span>
                  <span className="view-value">{kyc.gstCertificate}</span>
                </div>
              )}
              {(employer?.businessName || employer?.companyName) && (
                <>
                  {employer?.businessName && (
                    <div className="view-row">
                      <span className="view-label">Business name</span>
                      <span className="view-value">{employer.businessName}</span>
                    </div>
                  )}
                  {employer?.companyName && (
                    <div className="view-row">
                      <span className="view-label">Company name</span>
                      <span className="view-value">{employer.companyName}</span>
                    </div>
                  )}
                </>
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
                  <span className="view-value">{formatAdminDate(kyc.verifiedAt)}</span>
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
          <div className="view-row"><span className="view-label">Unique employer ID</span><span className="view-value">{displayUniqueEmployerId}</span></div>
          <div className="view-row"><span className="view-label">Gender</span><span className="view-value">{employer?.gender || '—'}</span></div>
          <div className="view-row"><span className="view-label">Date of birth</span><span className="view-value">{formatAdminDate(employer?.dob)}</span></div>
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

        <section className="job-view-card detail-page-jobs-section employer-detail-jobs-bottom">
          <h3 className="view-section-title">Jobs posted ({postedJobsLoading ? '…' : postedJobsTotal})</h3>
          <p className="view-detail-section-subtitle" style={{ marginTop: 0 }}>
            Non-deleted listings for this employer. <strong>Total jobs posted</strong> in profile may include removed jobs.
            Status shows workflow; <strong>Completed</strong> means finished successfully.
          </p>
          {postedJobsError && (
            <Alert variant="error" className="mgmt-alert" style={{ marginBottom: '0.75rem' }}>
              {postedJobsError}
            </Alert>
          )}
          {postedJobsLoading ? (
            <p className="view-detail-empty-kyc">Loading jobs…</p>
          ) : postedJobs.length === 0 && !postedJobsError ? (
            <p className="view-detail-empty-kyc">No active job listings (deleted jobs are hidden).</p>
          ) : postedJobs.length > 0 ? (
            <div className="detail-jobs-table-wrap">
              <table className="mgmt-table detail-jobs-table">
                <thead>
                  <tr>
                    <th>Job title</th>
                    <th>Status</th>
                    <th>Completed?</th>
                    <th aria-label="Open job" />
                  </tr>
                </thead>
                <tbody>
                  {postedJobs.map((j) => {
                    const out = jobCompletedSummary(j.status)
                    return (
                      <tr key={j._id}>
                        <td>{j.jobTitle || '—'}</td>
                        <td>
                          <span className="mgmt-badge mgmt-status-availability">{jobStatusLabel(j.status)}</span>
                        </td>
                        <td>{out.text}</td>
                        <td>
                          <button
                            type="button"
                            className="mgmt-link"
                            onClick={() => navigate(`/jobs/${j._id}`)}
                          >
                            Open job →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>

      <KycImageVerificationModal
        open={kycImageModalOpen}
        onClose={() => setKycImageModalOpen(false)}
        allImageItems={getAllKycImageItems(kyc)}
        aadhaarNumber={(kyc?.aadhaarNumber || kyc?.aadhaarReference || '').trim()}
        onApprove={handleKycImageApprove}
        onReject={handleKycImageReject}
        loading={kycImageSubmitting}
      />
    </div>
  )
}
