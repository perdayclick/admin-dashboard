import { jobStatusLabel, jobStatusBadgeClass } from '../constants/jobEnums'
import './Modal.css'

function formatDate(v) {
  if (!v) return '—'
  if (typeof v === 'string') return v.slice(0, 10)
  if (v.toISOString) return v.toISOString().slice(0, 10)
  return '—'
}

export default function JobView({ job, onClose }) {
  const employer = job?.employerId || job?.employer
  const employerName = employer?.businessName || employer?.companyName || employer?.contactPersonName || (employer?.userId ? 'Employer' : '—')
  const skills = job?.skillsRequired || job?.skills || []
  const skillNames = Array.isArray(skills) ? skills.map((s) => (s && (s.name || s._id))) : []

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-view modal-view-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '90vh' }}>
        <div className="modal-header">
          <h2 className="modal-title">Job details</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <section className="view-section">
            <h3 className="view-section-title">Basic</h3>
            <div className="view-row">
              <span className="view-label">Title</span>
              <span className="view-value">{job?.jobTitle || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Status</span>
              <span className={`view-value badge ${jobStatusBadgeClass(job?.status)}`}>{jobStatusLabel(job?.status)}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Posted by</span>
              <span className="view-value">{employerName}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Work type</span>
              <span className="view-value">{job?.workType || '—'}</span>
            </div>
            {job?.jobDescription && (
              <div className="view-row">
                <span className="view-label">Description</span>
                <span className="view-value" style={{ whiteSpace: 'pre-wrap' }}>{job.jobDescription}</span>
              </div>
            )}
          </section>
          <section className="view-section">
            <h3 className="view-section-title">Workers &amp; pay</h3>
            <div className="view-row">
              <span className="view-label">Workers required</span>
              <span className="view-value">{job?.workersRequired ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Workers assigned</span>
              <span className="view-value">{job?.workersAssigned ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Salary / payout (₹)</span>
              <span className="view-value">{job?.salaryOrPayout ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Payout type</span>
              <span className="view-value">{job?.payoutType || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Per day payout (₹)</span>
              <span className="view-value">{job?.perDayPayout ?? '—'}</span>
            </div>
          </section>
          <section className="view-section">
            <h3 className="view-section-title">Requirements &amp; schedule</h3>
            <div className="view-row">
              <span className="view-label">Skills</span>
              <span className="view-value">{skillNames.length ? skillNames.join(', ') : '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Duration</span>
              <span className="view-value">{job?.duration || '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Start / end date</span>
              <span className="view-value">{formatDate(job?.startDate)} – {formatDate(job?.endDate)}</span>
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
              <span className="view-label">Urgent</span>
              <span className="view-value">{job?.isUrgent ? 'Yes' : 'No'}</span>
            </div>
          </section>
          <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
            <button type="button" className="modal-btn secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
