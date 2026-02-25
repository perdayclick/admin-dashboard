import { useState, useEffect } from 'react'
import {
  WORK_TYPE_OPTIONS,
  PAYOUT_TYPE_OPTIONS,
  SHIFT_TYPE_OPTIONS,
  CHECK_IN_METHOD_OPTIONS,
} from '../constants/jobEnums'
import './Modal.css'

export default function JobForm({ title, job, employers = [], skills = [], onSubmit, onClose, error, submitting, mode }) {
  const [employerId, setEmployerId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [workType, setWorkType] = useState('')
  const [salaryOrPayout, setSalaryOrPayout] = useState('')
  const [payoutType, setPayoutType] = useState('')
  const [duration, setDuration] = useState('')
  const [workersRequired, setWorkersRequired] = useState(1)
  const [skillsRequired, setSkillsRequired] = useState([])
  const [genderPreference, setGenderPreference] = useState('')
  const [minimumAge, setMinimumAge] = useState('')
  const [maximumAge, setMaximumAge] = useState('')
  const [experienceRequired, setExperienceRequired] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [workTimings, setWorkTimings] = useState('')
  const [shiftType, setShiftType] = useState('')
  const [attendanceRequired, setAttendanceRequired] = useState(false)
  const [isUrgent, setIsUrgent] = useState(false)
  const [dailyHours, setDailyHours] = useState('')
  const [perDayPayout, setPerDayPayout] = useState('')
  const [checkInMethod, setCheckInMethod] = useState('')
  const [reportingTime, setReportingTime] = useState('')

  useEffect(() => {
    if (job) {
      const emp = job.employerId || job.employer
      setEmployerId(emp?._id ? emp._id : '')
      setJobTitle(job.jobTitle || '')
      setJobDescription(job.jobDescription || '')
      setWorkType(job.workType || '')
      setSalaryOrPayout(job.salaryOrPayout ?? '')
      setPayoutType(job.payoutType || '')
      setDuration(job.duration || '')
      setWorkersRequired(job.workersRequired ?? 1)
      setSkillsRequired(Array.isArray(job.skillsRequired) && job.skillsRequired.length ? [job.skillsRequired.map((s) => (s._id || s).toString())[0]] : [])
      setGenderPreference(job.genderPreference || '')
      setMinimumAge(job.minimumAge ?? '')
      setMaximumAge(job.maximumAge ?? '')
      setExperienceRequired(job.experienceRequired || '')
      setStartDate(job.startDate ? (typeof job.startDate === 'string' ? job.startDate.slice(0, 10) : job.startDate.toISOString?.().slice(0, 10)) : '')
      setEndDate(job.endDate ? (typeof job.endDate === 'string' ? job.endDate.slice(0, 10) : job.endDate.toISOString?.().slice(0, 10)) : '')
      setWorkTimings(job.workTimings || '')
      setShiftType(job.shiftType || '')
      setAttendanceRequired(job.attendanceRequired === true)
      setIsUrgent(job.isUrgent === true)
      setDailyHours(job.dailyHours ?? '')
      setPerDayPayout(job.perDayPayout ?? '')
      setCheckInMethod(job.checkInMethod || '')
      setReportingTime(job.reportingTime || '')
    }
  }, [job])

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      jobTitle: jobTitle.trim(),
      jobDescription: jobDescription.trim() || undefined,
      workType: workType || undefined,
      salaryOrPayout: salaryOrPayout === '' ? undefined : Number(salaryOrPayout),
      payoutType: payoutType || undefined,
      duration: duration.trim() || undefined,
      workersRequired: Number(workersRequired) || 1,
      skillsRequired: skillsRequired.length ? skillsRequired : undefined,
      genderPreference: genderPreference.trim() || undefined,
      minimumAge: minimumAge === '' ? undefined : Number(minimumAge),
      maximumAge: maximumAge === '' ? undefined : Number(maximumAge),
      experienceRequired: experienceRequired.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      workTimings: workTimings.trim() || undefined,
      shiftType: shiftType || undefined,
      attendanceRequired: attendanceRequired,
      isUrgent: isUrgent,
      dailyHours: dailyHours === '' ? undefined : Number(dailyHours),
      perDayPayout: perDayPayout === '' ? undefined : Number(perDayPayout),
      checkInMethod: checkInMethod || undefined,
      reportingTime: reportingTime.trim() || undefined,
    }
    if (mode === 'create' && employerId) payload.employerId = employerId
    onSubmit(payload)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-form-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '90vh' }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error" role="alert">{error}</div>}
          {mode === 'create' && employers.length > 0 && (
            <section className="modal-section">
              <h3 className="modal-section-title">Employer</h3>
              <label className="modal-label">
                Posted by (employer)
                <select value={employerId} onChange={(e) => setEmployerId(e.target.value)} className="modal-input">
                  <option value="">— Select employer —</option>
                  {employers.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.businessName || emp.companyName || emp.contactPersonName || emp._id}
                    </option>
                  ))}
                </select>
              </label>
            </section>
          )}
          <section className="modal-section">
            <h3 className="modal-section-title">Basic</h3>
            <label className="modal-label">
              Job title *
              <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job title" required maxLength={200} className="modal-input" />
            </label>
            <label className="modal-label">
              Description
              <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Description" rows={3} className="modal-input" />
            </label>
            <label className="modal-label">
              Work type *
              <select value={workType} onChange={(e) => setWorkType(e.target.value)} required className="modal-input">
                {WORK_TYPE_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="modal-label">
              Duration
              <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 3 months" className="modal-input" />
            </label>
          </section>
          <section className="modal-section">
            <h3 className="modal-section-title">Pay &amp; workers</h3>
            <label className="modal-label">
              Salary / payout (₹)
              <input type="number" min={0} value={salaryOrPayout} onChange={(e) => setSalaryOrPayout(e.target.value)} placeholder="Amount" className="modal-input" />
            </label>
            <label className="modal-label">
              Payout type
              <select value={payoutType} onChange={(e) => setPayoutType(e.target.value)} className="modal-input">
                {PAYOUT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'blank'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="modal-label">
              Per day payout (₹)
              <input type="number" min={0} value={perDayPayout} onChange={(e) => setPerDayPayout(e.target.value)} className="modal-input" />
            </label>
            <label className="modal-label">
              Workers required
              <input type="number" min={1} value={workersRequired} onChange={(e) => setWorkersRequired(e.target.value)} className="modal-input" />
            </label>
          </section>
          {skills.length > 0 && (
            <section className="modal-section">
              <h3 className="modal-section-title">Skills</h3>
              <label className="modal-label">
                Skills required
                <select
                  value={skillsRequired[0] || ''}
                  onChange={(e) => setSkillsRequired(e.target.value ? [e.target.value] : [])}
                  className="modal-input"
                >
                  <option value="">— Select skill —</option>
                  {skills.map((sk) => (
                    <option key={sk._id} value={sk._id}>{sk.name}</option>
                  ))}
                </select>
              </label>
            </section>
          )}
          <section className="modal-section">
            <h3 className="modal-section-title">Requirements &amp; schedule</h3>
            <label className="modal-label">
              Gender preference
              <input type="text" value={genderPreference} onChange={(e) => setGenderPreference(e.target.value)} placeholder="e.g. Any" className="modal-input" />
            </label>
            <label className="modal-label">
              Min / max age
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" min={0} max={120} value={minimumAge} onChange={(e) => setMinimumAge(e.target.value)} placeholder="Min" className="modal-input" style={{ flex: 1 }} />
                <input type="number" min={0} max={120} value={maximumAge} onChange={(e) => setMaximumAge(e.target.value)} placeholder="Max" className="modal-input" style={{ flex: 1 }} />
              </div>
            </label>
            <label className="modal-label">
              Experience required
              <input type="text" value={experienceRequired} onChange={(e) => setExperienceRequired(e.target.value)} placeholder="e.g. 1 year" className="modal-input" />
            </label>
            <label className="modal-label">
              Start date
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="modal-input" />
            </label>
            <label className="modal-label">
              End date
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="modal-input" />
            </label>
            <label className="modal-label">
              Work timings
              <input type="text" value={workTimings} onChange={(e) => setWorkTimings(e.target.value)} placeholder="e.g. 9 AM - 6 PM" className="modal-input" />
            </label>
            <label className="modal-label">
              Shift type
              <select value={shiftType} onChange={(e) => setShiftType(e.target.value)} className="modal-input">
                {SHIFT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'blank'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="modal-label">
              Daily hours
              <input type="number" min={0} max={24} step={0.5} value={dailyHours} onChange={(e) => setDailyHours(e.target.value)} className="modal-input" />
            </label>
            <label className="modal-label">
              Check-in method
              <select value={checkInMethod} onChange={(e) => setCheckInMethod(e.target.value)} className="modal-input">
                {CHECK_IN_METHOD_OPTIONS.map((o) => (
                  <option key={o.value || 'blank'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="modal-label">
              Reporting time
              <input type="text" value={reportingTime} onChange={(e) => setReportingTime(e.target.value)} placeholder="e.g. 8:00 AM" className="modal-input" />
            </label>
            <label className="modal-label checkbox-label">
              <input type="checkbox" checked={attendanceRequired} onChange={(e) => setAttendanceRequired(e.target.checked)} />
              <span>Attendance required</span>
            </label>
            <label className="modal-label checkbox-label">
              <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
              <span>Urgent</span>
            </label>
          </section>
          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn primary" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
