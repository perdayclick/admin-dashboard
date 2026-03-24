import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { jobsApi, skillsApi, workersApi, paymentApi, penaltiesApi } from '../services/api'
import { jobStatusLabel, jobStatusBadgeClass, JOB_STATUS, CANCELLATION_REASON, SHIFT_SLOT_LABELS } from '../constants/jobEnums'
import {
  PENALTY_STATUS,
  penaltyStatusLabel,
  penaltyStatusBadgeClass,
  penaltyReasonLabel,
  penaltyPayerLabel,
} from '../constants/penaltyEnums'
import { getErrorMessage, formatAdminDate, formatAdminDateTime } from '../utils/format'
import { PageHeader, Alert, Button } from '../components/ui'
import JobForm from '../components/JobForm'
import ConfirmModal from '../components/ConfirmModal'
import WaivePenaltyModal from '../components/WaivePenaltyModal'
import '../styles/ManagementPage.css'
import '../components/Modal.css'

const CANCELLATION_REASON_LABELS = {
  [CANCELLATION_REASON.NOT_FIT]: 'Not fit for job',
  [CANCELLATION_REASON.CHANGED_PLAN]: 'Changed plan',
  [CANCELLATION_REASON.DUPLICATE]: 'Duplicate',
  [CANCELLATION_REASON.OTHER]: 'Other',
}

function AssignWorkerModal({ workers, workersLoading, selectedWorkerId, onSelectWorker, onSubmit, onCancel, assigning }) {
  const [search, setSearch] = useState('')
  const filtered = !search.trim()
    ? workers
    : workers.filter(
        (w) =>
          (w.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
          (w.phoneNumber || '').includes(search) ||
          (w._id || '').toLowerCase().includes(search.toLowerCase())
      )
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2 className="modal-title">Assign worker</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          {workersLoading ? (
            <p className="view-value" style={{ color: '#6b7280' }}>Loading workers…</p>
          ) : (
            <>
              <label className="modal-label">
                Search worker
                <input
                  type="search"
                  placeholder="Name, phone, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="modal-input"
                />
              </label>
              <label className="modal-label">
                Select worker
                <select
                  value={selectedWorkerId}
                  onChange={(e) => onSelectWorker(e.target.value)}
                  className="mgmt-select modal-input"
                  style={{ width: '100%' }}
                >
                  <option value="">Choose a worker</option>
                  {filtered.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.fullName || w.phoneNumber || w._id}
                    </option>
                  ))}
                </select>
              </label>
              {workers.length === 0 && <p className="view-value" style={{ color: '#6b7280', fontSize: '0.875rem' }}>No workers available or all are already assigned.</p>}
            </>
          )}
          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="modal-btn secondary" onClick={onCancel} disabled={assigning}>Cancel</button>
            <button type="button" className="modal-btn primary" onClick={onSubmit} disabled={!selectedWorkerId || assigning}>
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CancelJobModal({ reason, note, onReasonChange, onNoteChange, onSubmit, onCancel, loading }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2 className="modal-title">Cancel hired worker</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <p className="modal-message" style={{ marginBottom: '1rem' }}>Legacy bulk cancel flow: choose a reason and note. Prefer per-worker removal from assigned workers when using the new penalty-aware job flow.</p>
          <label className="modal-label">
            Reason
            <select value={reason} onChange={(e) => onReasonChange(e.target.value)} className="mgmt-select modal-input" style={{ width: '100%' }}>
              {Object.entries(CANCELLATION_REASON_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </label>
          <label className="modal-label">
            Note (optional)
            <textarea value={note} onChange={(e) => onNoteChange(e.target.value)} className="modal-input" rows={3} placeholder="Additional details..." style={{ resize: 'vertical', width: '100%' }} />
          </label>
          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="modal-btn secondary" onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="button" className="modal-btn danger" onClick={onSubmit} disabled={loading}>{loading ? 'Submitting…' : 'Confirm cancel'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = RAZORPAY_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'))
    document.body.appendChild(script)
  })
}

function formatPosted(createdAt) {
  if (!createdAt) return '—'
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString()
}

function formatCurrency(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—'
}

export default function JobDetail() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [skills, setSkills] = useState([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [workers, setWorkers] = useState([])
  const [workersLoading, setWorkersLoading] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [unassigningId, setUnassigningId] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [applicantsLoading, setApplicantsLoading] = useState(false)
  const [hireLoading, setHireLoading] = useState(false)
  const [rejectLoading, setRejectLoading] = useState(false)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASON.OTHER)
  const [cancelNote, setCancelNote] = useState('')
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [payScLoading, setPayScLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState({ paid: false, payment: null })
  const [paymentStatusLoading, setPaymentStatusLoading] = useState(false)
  const [payButtonLoading, setPayButtonLoading] = useState(false)
  const [penalties, setPenalties] = useState([])
  const [penaltiesLoading, setPenaltiesLoading] = useState(false)
  const [penaltiesError, setPenaltiesError] = useState('')
  const [penaltySettleTarget, setPenaltySettleTarget] = useState(null)
  const [penaltyWaiveTarget, setPenaltyWaiveTarget] = useState(null)
  const [penaltyWaiveNote, setPenaltyWaiveNote] = useState('')
  const [penaltyActionLoading, setPenaltyActionLoading] = useState(false)

  const loadPenalties = useCallback(() => {
    if (!jobId) return
    setPenaltiesLoading(true)
    setPenaltiesError('')
    penaltiesApi
      .list({ jobId, limit: 50 })
      .then((res) => {
        const payload = res?.data ?? res
        setPenalties(Array.isArray(payload?.penalties) ? payload.penalties : [])
        setPenaltiesError('')
      })
      .catch((err) => {
        setPenalties([])
        setPenaltiesError(getErrorMessage(err, 'Failed to load penalties'))
      })
      .finally(() => setPenaltiesLoading(false))
  }, [jobId])

  useEffect(() => {
    let cancelled = false
    jobsApi.get(jobId).then((res) => {
      if (!cancelled) {
        const payload = res?.data ?? res
        setJob(payload)
      }
    }).catch((err) => {
      if (!cancelled) setError(getErrorMessage(err, 'Failed to load job'))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [jobId])

  useEffect(() => {
    let cancelled = false
    skillsApi.list({ limit: 200 }).then((res) => {
      if (!cancelled) setSkills((res.data || res).skills || [])
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const fetchJobPaymentStatus = useCallback(() => {
    if (!jobId) return
    setPaymentStatusLoading(true)
    paymentApi.getJobPaymentStatus(jobId).then((res) => {
      const payment = res?.data ?? res
      const paid = !!(payment && payment.status === 'captured')
      setPaymentStatus({ paid, payment: payment || null })
    }).catch(() => {
      setPaymentStatus({ paid: false, payment: null })
    }).finally(() => setPaymentStatusLoading(false))
  }, [jobId])

  useEffect(() => {
    if (job?.status === JOB_STATUS.COMPLETED) fetchJobPaymentStatus()
    else setPaymentStatus({ paid: false, payment: null })
  }, [job?.status, jobId, fetchJobPaymentStatus])

  useEffect(() => {
    if (job?._id) loadPenalties()
  }, [job?._id, loadPenalties])

  const handleUpdate = async (values) => {
    setFormError('')
    setSubmitting(true)
    try {
      const res = await jobsApi.update(jobId, values)
      setJob(res?.data ?? res)
      setEditOpen(false)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Update failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setSubmitting(true)
    try {
      await jobsApi.delete(jobId)
      navigate('/jobs')
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetStatus = async (status) => {
    setStatusLoading(true)
    try {
      const res = await jobsApi.setStatus(jobId, status)
      setJob((res?.data ?? res) || job)
    } catch (err) {
      setError(getErrorMessage(err, 'Status update failed'))
    } finally {
      setStatusLoading(false)
    }
  }

  const loadWorkers = () => {
    setWorkersLoading(true)
    workersApi
      .list({ page: 1, limit: 100 })
      .then((res) => {
        const payload = res?.data ?? res
        setWorkers(Array.isArray(payload?.workers) ? payload.workers : [])
      })
      .catch((err) => {
        setWorkers([])
        setError(getErrorMessage(err, 'Failed to load workers for assignment'))
      })
      .finally(() => setWorkersLoading(false))
  }

  const employerId = job?.employerId?._id || job?.employerId

  const loadApplicants = () => {
    if (!employerId) return
    setApplicantsLoading(true)
    jobsApi.getApplicants(jobId, employerId).then((res) => {
      setApplicants(Array.isArray(res?.data?.applicants) ? res.data.applicants : [])
    }).catch(() => setApplicants([])).finally(() => setApplicantsLoading(false))
  }

  const handleAssignOpen = () => {
    setAssignOpen(true)
    setSelectedWorkerId('')
    setError('')
    loadWorkers()
  }

  const handleAssignSubmit = async () => {
    if (!selectedWorkerId) return
    setAssigning(true)
    try {
      const res = await jobsApi.assignWorker(jobId, selectedWorkerId)
      setJob((res?.data ?? res) || job)
      setAssignOpen(false)
      if (employerId) loadApplicants()
    } catch (err) {
      setError(getErrorMessage(err, 'Assign failed'))
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async (workerId) => {
    const emp = job?.employerId?._id || job?.employerId
    setUnassigningId(workerId)
    try {
      const res = await jobsApi.unassignWorker(jobId, workerId, emp || undefined)
      setJob((res?.data ?? res) || job)
      loadPenalties()
    } catch (err) {
      setError(getErrorMessage(err, 'Unassign failed'))
    } finally {
      setUnassigningId(null)
    }
  }

  const handlePenaltySettleConfirm = async () => {
    if (!penaltySettleTarget) return
    setPenaltyActionLoading(true)
    try {
      await jobsApi.settlePenalty(penaltySettleTarget._id)
      setPenaltySettleTarget(null)
      loadPenalties()
    } catch (err) {
      setError(getErrorMessage(err, 'Mark penalty paid failed'))
    } finally {
      setPenaltyActionLoading(false)
    }
  }

  const handlePenaltyWaiveConfirm = async () => {
    if (!penaltyWaiveTarget) return
    setPenaltyActionLoading(true)
    try {
      await penaltiesApi.waive(penaltyWaiveTarget._id, { messageNote: penaltyWaiveNote.trim() || undefined })
      setPenaltyWaiveTarget(null)
      setPenaltyWaiveNote('')
      loadPenalties()
    } catch (err) {
      setError(getErrorMessage(err, 'Waive penalty failed'))
    } finally {
      setPenaltyActionLoading(false)
    }
  }

  const assignedWorkers = Array.isArray(job?.assignedWorkers) ? job.assignedWorkers : []
  const assignedIds = assignedWorkers.map((w) => w._id || w)
  const workersToShow = workers.filter((w) => !assignedIds.includes(w._id))

  const handleHire = async (workerId) => {
    setHireLoading(true)
    try {
      const res = await jobsApi.hire(jobId, workerId, employerId)
      setJob((res?.data ?? res) || job)
      setApplicants((prev) => prev.filter((a) => (a.workerId?._id || a.workerId) !== workerId))
    } catch (err) {
      setError(getErrorMessage(err, 'Hire failed'))
    } finally {
      setHireLoading(false)
    }
  }

  const handleReject = async (workerId) => {
    setRejectLoading(true)
    try {
      await jobsApi.action(jobId, 'reject', { workerId, ...(employerId && { employerId }) })
      setApplicants((prev) => prev.filter((a) => (a.workerId?._id || a.workerId) !== workerId))
    } catch (err) {
      setError(getErrorMessage(err, 'Reject failed'))
    } finally {
      setRejectLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!employerId) return
    setCompleteLoading(true)
    try {
      const res = await jobsApi.complete(jobId, employerId)
      setJob((res?.data ?? res) || job)
    } catch (err) {
      setError(getErrorMessage(err, 'Complete failed'))
    } finally {
      setCompleteLoading(false)
    }
  }

  const handleCancelSubmit = async () => {
    setCancelSubmitting(true)
    try {
      const res = await jobsApi.cancel(jobId, {
        employerId,
        cancellationReason: cancelReason,
        cancellationNote: cancelNote,
      })
      setJob((res?.data ?? res) || job)
      setCancelOpen(false)
      setCancelReason(CANCELLATION_REASON.OTHER)
      setCancelNote('')
    } catch (err) {
      setError(getErrorMessage(err, 'Cancel failed'))
    } finally {
      setCancelSubmitting(false)
    }
  }

  const handlePayServiceCharge = async () => {
    if (!employerId) return
    setPayScLoading(true)
    try {
      const res = await jobsApi.payServiceCharge(jobId, employerId)
      setJob((res?.data ?? res) || job)
    } catch (err) {
      setError(getErrorMessage(err, 'Pay service charge failed'))
    } finally {
      setPayScLoading(false)
    }
  }

  const handlePayWithRazorpay = async () => {
    setPayButtonLoading(true)
    setError('')
    try {
      const orderRes = await paymentApi.createOrderForJob(jobId)
      const payload = orderRes?.data ?? orderRes
      const { orderId, keyId, amount, currency } = payload
      if (!orderId || !keyId) {
        throw new Error('Invalid response from server')
      }
      await loadRazorpayScript()
      const options = {
        key: keyId,
        amount: Number(amount),
        currency: currency || 'INR',
        order_id: orderId,
        name: 'Job Completion Payment',
        description: `Payment for completed job: ${job?.jobTitle || jobId}`,
        handler: async (response) => {
          try {
            await paymentApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            setPayButtonLoading(false)
            navigate(`/payment/success?jobId=${encodeURIComponent(jobId)}`)
          } catch (verifyErr) {
            setError(getErrorMessage(verifyErr, 'Payment verification failed'))
            setPayButtonLoading(false)
            navigate(`/payment/fail?jobId=${encodeURIComponent(jobId)}&reason=verify_failed`)
          }
        },
        modal: {
          ondismiss: () => {
            setPayButtonLoading(false)
            navigate(`/payment/fail?jobId=${encodeURIComponent(jobId)}&reason=cancelled`)
          },
        },
      }
      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', () => {
        setPayButtonLoading(false)
        navigate(`/payment/fail?jobId=${encodeURIComponent(jobId)}&reason=payment_failed`)
      })
      razorpay.open()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start payment'))
      setPayButtonLoading(false)
    }
  }

  if (loading) return <div className="mgmt-page"><div className="mgmt-loading">Loading job…</div></div>
  if (error && !job) return <div className="mgmt-page"><Alert variant="error">{error}</Alert><Button onClick={() => navigate('/jobs')}>Back to Jobs</Button></div>

  const employer = job?.employerId || job?.employer
  const employerName = employer?.fullName || '—'
  const skillsList = job?.skillsRequired || job?.skills || []
  const skillNames = Array.isArray(skillsList) ? skillsList.map((s) => s?.name || s?._id) : []

  const canApprove = job?.status === JOB_STATUS.PENDING || job?.status === JOB_STATUS.REJECTED
  const canReject = job?.status === JOB_STATUS.PENDING
  const canGoLive = job?.status === JOB_STATUS.APPROVED
  const canClose = job?.status === JOB_STATUS.APPROVED || job?.status === JOB_STATUS.LIVE
  const canEdit = true
  const isLive = job?.status === JOB_STATUS.LIVE
  const isHired = job?.status === 'HIRED'
  const isInactiveUnpaid = job?.status === 'INACTIVE_PENDING_PAYMENT'

  const salaryDisplay = job?.perDayPayout != null
    ? `₹${Number(job.perDayPayout).toLocaleString('en-IN')}/day`
    : job?.salaryOrPayout != null
      ? formatCurrency(job.salaryOrPayout)
      : '—'

  const loc = job?.location
  const hasLocation = loc && (loc.address || loc.locality || loc.landmark || (Array.isArray(loc.coordinates) && loc.coordinates.length === 2))

  return (
    <div className="mgmt-page job-detail-page">
      <PageHeader
        title="Job details"
        subtitle="View and manage this job posting"
        primaryAction={canEdit && <Button variant="primary" onClick={() => setEditOpen(true)}>Edit Job</Button>}
        secondaryAction={<Button onClick={() => navigate('/jobs')}>← Back to Jobs</Button>}
      />

      {error && <Alert variant="error" className="mgmt-alert">{error}</Alert>}

      {/* Hero: title + status + posted */}
      <div className="job-view-hero">
        <div className="job-view-hero-main">
          <h2 className="job-view-title">{job?.jobTitle.toUpperCase() || '—'}</h2>
          <span className={`mgmt-badge ${jobStatusBadgeClass(job?.status)}`}>{jobStatusLabel(job?.status)}</span>
        </div>
        <p className="job-view-posted">Posted {formatPosted(job?.createdAt)} - By {employerName}</p>
      </div>

      {/* Key stats row */}
      <div className="job-view-stats">
        <div className="job-view-stat">
          <span className="job-view-stat-value">{salaryDisplay}</span>
          <span className="job-view-stat-label">Salary</span>
        </div>
        <div className="job-view-stat">
          <span className="job-view-stat-value">{job?.workersRequired ?? '—'} / {job?.workersAssigned ?? 0}</span>
          <span className="job-view-stat-label">Workers required / assigned</span>
        </div>
        <div className="job-view-stat">
          <span className="job-view-stat-value">{job?.workType || '—'}</span>
          <span className="job-view-stat-label">Work type</span>
        </div>
      </div>

      {/* Action bar: Approve, Reject, Go Live, Close, Delete */}
      <div className="job-view-actions">
        {canApprove && <Button variant="primary" onClick={() => handleSetStatus(JOB_STATUS.APPROVED)} disabled={statusLoading}>Approve</Button>}
        {canReject && <Button variant="secondary" onClick={() => handleSetStatus(JOB_STATUS.REJECTED)} disabled={statusLoading}>Reject</Button>}
        {canGoLive && <Button variant="primary" onClick={() => handleSetStatus(JOB_STATUS.LIVE)} disabled={statusLoading}>Go Live</Button>}
        {canClose && <Button variant="secondary" onClick={() => handleSetStatus(JOB_STATUS.CLOSED)} disabled={statusLoading}>Close</Button>}
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
      </div>

      {/* Content: Requirements (compact) → Location → Overview → Pay & workers → Timing → … → Employer last */}
      <div className="job-view-grid detail-view">
        {/* Requirements – compact: skills as tags + all requirement meta as pills */}
        <section className="job-view-card job-view-card-full job-requirements-compact">
          <h3 className="view-section-title">Requirements</h3>
          {skillNames.length > 0 && (
            <div className="job-req-skills">
              <span className="job-req-meta-label">Skills</span>
              <div className="view-tags">
                {skillNames.map((name, i) => (
                  <span key={i} className="view-tag">{name}</span>
                ))}
              </div>
            </div>
          )}
          <div className="job-req-meta">
            {(job?.genderPreference || job?.experienceRequired || (job?.minimumAge != null || job?.maximumAge != null)) && (
              <div className="job-req-meta-row">
                {job?.genderPreference && <span className="job-req-pill">Gender: {job.genderPreference}</span>}
                {(job?.minimumAge != null || job?.maximumAge != null) && (
                  <span className="job-req-pill">Age: {job?.minimumAge ?? '—'} – {job?.maximumAge ?? '—'}</span>
                )}
                {job?.experienceRequired && <span className="job-req-pill">Exp: {job.experienceRequired}</span>}
              </div>
            )}
            {(job?.duration || job?.workersRequired != null || job?.dailyHours != null) && (
              <div className="job-req-meta-row">
                {job?.duration && <span className="job-req-pill">Duration: {job.duration}</span>}
                {job?.workersRequired != null && <span className="job-req-pill">Workers: {job.workersRequired}</span>}
                {job?.dailyHours != null && <span className="job-req-pill">Daily hours: {job.dailyHours}</span>}
              </div>
            )}
            {(job?.shiftType || job?.shiftSlot || job?.reportingTime || job?.workTimings) && (
              <div className="job-req-meta-row">
                {job?.shiftType && <span className="job-req-pill">Shift: {job.shiftType}</span>}
                {job?.shiftSlot && <span className="job-req-pill">{SHIFT_SLOT_LABELS[job.shiftSlot] || job.shiftSlot}</span>}
                {job?.reportingTime && <span className="job-req-pill">Report: {job.reportingTime}</span>}
                {job?.workTimings && <span className="job-req-pill">Timings: {job.workTimings}</span>}
              </div>
            )}
            {(job?.checkInMethod || job?.attendanceRequired != null || job?.isUrgent) && (
              <div className="job-req-meta-row">
                {job?.checkInMethod && <span className="job-req-pill">Check-in: {job.checkInMethod}</span>}
                {job?.attendanceRequired != null && <span className="job-req-pill">Attendance: {job.attendanceRequired ? 'Yes' : 'No'}</span>}
                {job?.isUrgent && <span className="job-req-pill job-req-pill-urgent">Urgent</span>}
              </div>
            )}
          </div>
          {!skillNames.length && !job?.genderPreference && !job?.experienceRequired && job?.minimumAge == null && job?.maximumAge == null && !job?.duration && job?.workersRequired == null && job?.dailyHours == null && !job?.shiftType && !job?.shiftSlot && !job?.reportingTime && !job?.workTimings && !job?.checkInMethod && job?.attendanceRequired == null && !job?.isUrgent && (
            <p className="view-value" style={{ color: '#6b7280', fontSize: '0.9375rem' }}>No requirements specified.</p>
          )}
        </section>

        {hasLocation && (
          <section className="job-view-card job-view-card-full">
            <h3 className="view-section-title">Location</h3>
            {loc?.address && (
              <div className="view-row">
                <span className="view-label">Address</span>
                <span className="view-value">{loc.address}</span>
              </div>
            )}
            {loc?.locality && (
              <div className="view-row">
                <span className="view-label">Locality</span>
                <span className="view-value">{loc.locality}</span>
              </div>
            )}
            {loc?.landmark && (
              <div className="view-row">
                <span className="view-label">Landmark</span>
                <span className="view-value">{loc.landmark}</span>
              </div>
            )}
            {loc?.coordinates && loc.coordinates.length === 2 && (
              <div className="view-row">
                <span className="view-label">Coordinates</span>
                <span className="view-value">{loc.coordinates[0]}, {loc.coordinates[1]} (lng, lat)</span>
              </div>
            )}
          </section>
        )}

        <section className="job-view-card">
          <h3 className="view-section-title">Job overview</h3>
          <div className="view-row">
            <span className="view-label">Status</span>
            <span className="view-value"><span className={`mgmt-badge ${jobStatusBadgeClass(job?.status)}`}>{jobStatusLabel(job?.status)}</span></span>
          </div>
          <div className="view-row">
            <span className="view-label">Work type</span>
            <span className="view-value">{job?.workType || '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Duration</span>
            <span className="view-value">{job?.duration || '—'}</span>
          </div>
          {(job?.applicationsCount != null && job.applicationsCount > 0) && (
            <div className="view-row">
              <span className="view-label">Applications</span>
              <span className="view-value">{job.applicationsCount}</span>
            </div>
          )}
          {job?.jobDescription && (
            <div className="view-row view-row-full">
              <span className="view-label">Description</span>
              <span className="view-value job-view-desc" style={{ whiteSpace: 'pre-wrap' }}>{job.jobDescription}</span>
            </div>
          )}
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Pay &amp; workers</h3>
          <div className="view-row">
            <span className="view-label">Salary / payout</span>
            <span className="view-value">{formatCurrency(job?.salaryOrPayout)}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Per day payout</span>
            <span className="view-value">{job?.perDayPayout != null ? formatCurrency(job.perDayPayout) + '/day' : '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Payout type</span>
            <span className="view-value">{job?.payoutType || '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Daily hours</span>
            <span className="view-value">{job?.dailyHours != null ? job.dailyHours : '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Workers required</span>
            <span className="view-value">{job?.workersRequired ?? '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Workers assigned</span>
            <span className="view-value">{job?.workersAssigned ?? '—'}</span>
          </div>
        </section>

        <section className="job-view-card job-view-card-full">
          <h3 className="view-section-title">Penalties (job flow)</h3>
          <p className="view-detail-section-subtitle" style={{ marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
            Ledger for this job: post-hire worker withdraw, employer remove hire, or disable after hire. High amounts (≥ ₹100) may require settlement before full unlock.
            {' '}
            <button type="button" className="mgmt-link" onClick={() => navigate(`/penalties?jobId=${encodeURIComponent(jobId)}`)}>
              Full list filtered to this job
            </button>
          </p>
          <div style={{ marginBottom: '0.75rem' }}>
            <Button variant="secondary" onClick={loadPenalties} disabled={penaltiesLoading}>
              {penaltiesLoading ? 'Refreshing…' : 'Refresh penalties'}
            </Button>
          </div>
          {penaltiesError && (
            <Alert variant="error" className="mgmt-alert" style={{ marginBottom: '0.75rem' }}>{penaltiesError}</Alert>
          )}
          {!penaltiesLoading && !penaltiesError && penalties.length === 0 ? (
            <p className="view-value" style={{ color: '#6b7280', fontSize: '0.9375rem' }}>No penalty present for this job.</p>
          ) : penalties.length > 0 ? (
            <div className="job-detail-table-wrap">
              <table className="mgmt-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Payer</th>
                    <th>Reason</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {penalties.map((p) => {
                    const w = p.workerId
                    const wid = w?._id || w
                    const name = w?.fullName || w?.phoneNumber || (wid ? String(wid).slice(-6) : '—')
                    const canAct = p.status === PENALTY_STATUS.DUE || p.status === PENALTY_STATUS.PENDING
                    return (
                      <tr key={p._id}>
                        <td>
                          {wid ? (
                            <button type="button" className="mgmt-link" onClick={() => navigate(`/workers/${wid}`)}>
                              {name}
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{penaltyPayerLabel(p.payerType)}</td>
                        <td>{penaltyReasonLabel(p.reason)}</td>
                        <td>{formatCurrency(p.amount)}</td>
                        <td>
                          <span className={`mgmt-badge ${penaltyStatusBadgeClass(p.status)}`}>
                            {penaltyStatusLabel(p.status)}
                          </span>
                          {p.mustPayBeforeUnlock && canAct && (
                            <span className="mgmt-badge badge-warning" style={{ marginLeft: '0.35rem' }} title="Blocks unlock until settled">Blocking</span>
                          )}
                        </td>
                        <td>
                          {canAct ? (
                            <div className="mgmt-actions-cell">
                              <Button
                                variant="primary"
                                onClick={() => setPenaltySettleTarget(p)}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                              >
                                Mark paid
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => { setPenaltyWaiveTarget(p); setPenaltyWaiveNote('') }}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                              >
                                Waive
                              </Button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Schedule &amp; timing</h3>
          <div className="view-row">
            <span className="view-label">Start date</span>
            <span className="view-value">{formatAdminDate(job?.startDate)}</span>
          </div>
          <div className="view-row">
            <span className="view-label">End date</span>
            <span className="view-value">{formatAdminDate(job?.endDate)}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Work timings</span>
            <span className="view-value">{job?.workTimings || '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Shift type</span>
            <span className="view-value">{job?.shiftType || '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Shift slot</span>
            <span className="view-value">{job?.shiftSlot ? (SHIFT_SLOT_LABELS[job.shiftSlot] || job.shiftSlot) : '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Reporting time</span>
            <span className="view-value">{job?.reportingTime || '—'}</span>
          </div>
        </section>

        {job?.status === JOB_STATUS.REJECTED && job?.rejectionReason && (
          <section className="job-view-card job-view-card-full">
            <h3 className="view-section-title">Rejection</h3>
            <div className="view-row view-row-full">
              <span className="view-label">Reason</span>
              <span className="view-value">{job.rejectionReason}</span>
            </div>
          </section>
        )}

        {/* Applicants (LIVE): workers who applied – admin can hire from here */}
        {isLive && employerId && (
          <section className="job-view-card job-view-card-full">
            <h3 className="view-section-title">Applicants</h3>
            <p className="view-detail-section-subtitle" style={{ marginTop: '-0.5rem' }}>
              Workers who applied for this job. Load the list and hire or reject.
            </p>
            <div style={{ marginBottom: '0.75rem' }}>
              <Button variant="secondary" onClick={loadApplicants} disabled={applicantsLoading}>
                {applicantsLoading ? 'Loading…' : 'Load applicants'}
              </Button>
            </div>
            {applicants.length === 0 && !applicantsLoading ? (
              <p className="view-value" style={{ color: '#6b7280', fontSize: '0.9375rem' }}>No applicants yet, or click “Load applicants” to refresh.</p>
            ) : (
              <div className="job-detail-table-wrap">
                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.map((a) => {
                      const w = a.worker || a.workerId
                      const wid = w?._id || a.workerId
                      const name = w?.fullName || w?.phoneNumber || wid
                      const isHiredRow = a.status === 'HIRED'
                      return (
                        <tr key={a._id || wid}>
                          <td>
                            <button type="button" className="mgmt-link" onClick={() => navigate(`/workers/${wid}`)}>
                              {name}
                            </button>
                          </td>
                          <td>{w?.displayPhone || w?.phoneNumber || '—'}</td>
                          <td>
                            {isHiredRow ? (
                              <span className="mgmt-badge badge-success">Hired</span>
                            ) : (
                              <span className="mgmt-badge badge-warning">Pending</span>
                            )}
                          </td>
                          <td>
                            {isHiredRow ? (
                              '—'
                            ) : (
                              <div className="mgmt-actions-cell">
                                <Button variant="primary" onClick={() => handleHire(wid)} disabled={hireLoading} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>
                                  {hireLoading ? '…' : 'Hire'}
                                </Button>
                                <Button variant="danger" onClick={() => handleReject(wid)} disabled={rejectLoading} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>
                                  {rejectLoading ? '…' : 'Reject'}
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Hired: Complete / Cancel / Pay service charge */}
        {isHired && employerId && (
          <section className="job-view-card">
            <h3 className="view-section-title">Hired – next steps</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button variant="primary" onClick={handleComplete} disabled={completeLoading}>
                {completeLoading ? '…' : 'Mark complete'}
              </Button>
              <Button variant="danger" onClick={() => setCancelOpen(true)} disabled={cancelSubmitting}>
                Cancel worker
              </Button>
            </div>
          </section>
        )}
        {isInactiveUnpaid && employerId && (
          <section className="job-view-card">
            <h3 className="view-section-title">Unpaid service charge</h3>
            <p className="view-value" style={{ marginBottom: '0.5rem' }}>Pay service charge to unlock worker. Amount: ₹{job?.serviceChargeAmount ?? '—'}</p>
            <Button variant="primary" onClick={handlePayServiceCharge} disabled={payScLoading}>
              {payScLoading ? '…' : 'Pay service charge'}
            </Button>
          </section>
        )}

        {job?.status === JOB_STATUS.COMPLETED && (
          <section className="job-view-card">
            <h3 className="view-section-title">Job completion payment</h3>
            <p className="view-detail-section-subtitle" style={{ marginTop: '-0.35rem', marginBottom: '0.5rem' }}>
              <button type="button" className="mgmt-link" onClick={() => navigate(`/payments?jobId=${encodeURIComponent(jobId)}`)}>
                All payment rows for this job in Payments
              </button>
            </p>
            {paymentStatusLoading ? (
              <p className="view-value" style={{ color: 'var(--text-muted)' }}>Checking payment status…</p>
            ) : paymentStatus.paid ? (
              <p className="view-value" style={{ color: 'var(--success)' }}>
                Paid{paymentStatus.payment?.createdAt ? ` on ${formatAdminDateTime(paymentStatus.payment.createdAt)}` : ''}.
              </p>
            ) : (
              <>
                <p className="view-value" style={{ marginBottom: '0.5rem' }}>
                  Complete payment for this job via Razorpay. You will be redirected to the payment gateway.
                </p>
                <Button variant="primary" onClick={handlePayWithRazorpay} disabled={payButtonLoading}>
                  {payButtonLoading ? 'Opening payment…' : 'Pay now'}
                </Button>
              </>
            )}
          </section>
        )}

        <section className="job-view-card job-view-card-full">
          <h3 className="view-section-title">Assigned workers</h3>
          <p className="view-detail-section-subtitle" style={{ marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
            Assign or remove workers. If someone is <strong>hired</strong>, removing them runs the employer penalty flow (same as employer “remove hire” in the app); legacy assign-only rows can be removed without a penalty.
          </p>
          <div style={{ marginBottom: '0.75rem' }}>
            <Button variant="primary" onClick={handleAssignOpen}>Assign worker</Button>
          </div>
          {assignedWorkers.length === 0 ? (
            <p className="view-value" style={{ color: '#6b7280', fontSize: '0.9375rem' }}>No workers assigned yet.</p>
          ) : (
            <div className="job-detail-table-wrap">
              <table className="mgmt-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Phone</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedWorkers.map((w) => {
                    const wid = w._id || w
                    const name = w.fullName || w.phoneNumber || wid
                    return (
                      <tr key={wid}>
                        <td>
                          <button type="button" className="mgmt-link" onClick={() => navigate(`/workers/${wid}`)}>
                            {name}
                          </button>
                        </td>
                        <td>{w.phoneNumber || '—'}</td>
                        <td>
                          <Button variant="danger" onClick={() => handleUnassign(wid)} disabled={unassigningId === wid} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>
                            {unassigningId === wid ? '…' : 'Unassign'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {(job?.cancellationReason || job?.cancellationNote) && (
          <section className="job-view-card job-view-card-full">
            <h3 className="view-section-title">Cancellation details</h3>
            {job?.cancellationReason && (
              <div className="view-row">
                <span className="view-label">Reason</span>
                <span className="view-value">{CANCELLATION_REASON_LABELS[job.cancellationReason] || job.cancellationReason}</span>
              </div>
            )}
            {job?.cancellationNote && (
              <div className="view-row view-row-full">
                <span className="view-label">Note</span>
                <span className="view-value">{job.cancellationNote}</span>
              </div>
            )}
          </section>
        )}

        {/* Employer – last, name + phone only */}
        <section className="job-view-card job-view-card-employer job-view-card-employer-last">
          <h3 className="view-section-title">Employer</h3>
          <div className="job-employer-contact">
            <div className="view-row">
              <span className="view-label">Name</span>
              <span className="view-value">
                {employer?._id ? (
                  <button type="button" className="mgmt-link" onClick={() => navigate(`/employers/${employer._id}`)}>
                    {employerName}
                  </button>
                ) : (
                  employerName || '—'
                )}
              </span>
            </div>
            <div className="view-row">
              <span className="view-label">Phone</span>
              <span className="view-value">{employer?.userId?.phone || employer?.phone || '—'}</span>
            </div>
          </div>
        </section>
      </div>

      {assignOpen && (
        <AssignWorkerModal
          workers={workersToShow}
          workersLoading={workersLoading}
          selectedWorkerId={selectedWorkerId}
          onSelectWorker={setSelectedWorkerId}
          onSubmit={handleAssignSubmit}
          onCancel={() => setAssignOpen(false)}
          assigning={assigning}
        />
      )}

      {editOpen && (
        <JobForm
          title="Edit Job"
          job={job}
          employers={[]}
          skills={skills}
          onSubmit={handleUpdate}
          onClose={() => { setEditOpen(false); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="edit"
        />
      )}

      {deleteOpen && (
        <ConfirmModal
          title="Delete Job"
          message={`Are you sure you want to delete "${job?.jobTitle || jobId}"?`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteOpen(false)}
          loading={submitting}
          variant="danger"
        />
      )}

      {cancelOpen && (
        <CancelJobModal
          reason={cancelReason}
          note={cancelNote}
          onReasonChange={setCancelReason}
          onNoteChange={setCancelNote}
          onSubmit={handleCancelSubmit}
          onCancel={() => { setCancelOpen(false); setCancelReason(CANCELLATION_REASON.OTHER); setCancelNote(''); }}
          loading={cancelSubmitting}
        />
      )}

      {penaltySettleTarget && (
        <ConfirmModal
          title="Mark penalty paid"
          message={`Record ${formatCurrency(penaltySettleTarget.amount)} as paid (${penaltyReasonLabel(penaltySettleTarget.reason)})?`}
          confirmLabel="Mark paid"
          onConfirm={handlePenaltySettleConfirm}
          onCancel={() => setPenaltySettleTarget(null)}
          loading={penaltyActionLoading}
          variant="primary"
        />
      )}

      {penaltyWaiveTarget && (
        <WaivePenaltyModal
          note={penaltyWaiveNote}
          onNoteChange={setPenaltyWaiveNote}
          onConfirm={handlePenaltyWaiveConfirm}
          onCancel={() => { setPenaltyWaiveTarget(null); setPenaltyWaiveNote('') }}
          loading={penaltyActionLoading}
        />
      )}
    </div>
  )
}
