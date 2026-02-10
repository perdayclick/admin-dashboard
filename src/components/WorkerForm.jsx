import { useState, useEffect } from 'react'
import { KYC_FORM_OPTIONS } from '../constants/kyc'
import './Modal.css'

export default function WorkerForm({ title, worker, onSubmit, onClose, error, submitting, mode }) {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [skills, setSkills] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [dailyEarningExpectation, setDailyEarningExpectation] = useState('')
  const [kycStatus, setKycStatus] = useState('')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (worker) {
      const u = worker.userId || worker.user
      setPhone(u?.phone ?? worker.phone ?? '')
      setEmail(u?.email ?? worker.email ?? '')
      setFullName(worker.fullName || '')
      setGender(worker.gender || '')
      setAge(worker.age ?? '')
      setWhatsappNumber(worker.whatsappNumber || '')
      setSkills(Array.isArray(worker.skills) ? worker.skills.join(', ') : '')
      setExperienceLevel(worker.experienceLevel || '')
      setDailyEarningExpectation(worker.dailyEarningExpectation ?? '')
      setKycStatus(worker.kyc?.status || '')
      setRemarks(worker.kyc?.remarks || '')
    } else {
      setKycStatus('')
      setRemarks('')
    }
  }, [worker])

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      phone: phone.trim(),
      email: email.trim() || undefined,
      password: password || undefined,
      fullName: fullName.trim() || undefined,
      gender: gender.trim() || undefined,
      age: age === '' ? undefined : Number(age),
      whatsappNumber: whatsappNumber.trim() || undefined,
      skills: skills.trim() ? skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      experienceLevel: experienceLevel.trim() || undefined,
      dailyEarningExpectation: dailyEarningExpectation === '' ? undefined : Number(dailyEarningExpectation),
    }
    if (mode === 'edit') {
      const updatePayload = {
        user: { phone: payload.phone.trim(), email: (payload.email && payload.email.trim()) || undefined },
        fullName: payload.fullName || undefined,
        gender: payload.gender || undefined,
        age: payload.age,
        whatsappNumber: payload.whatsappNumber || undefined,
        skills: payload.skills,
        experienceLevel: payload.experienceLevel || undefined,
        dailyEarningExpectation: payload.dailyEarningExpectation,
      }
      if (kycStatus) updatePayload.kycStatus = kycStatus
      if (remarks !== undefined) updatePayload.remarks = remarks
      onSubmit(updatePayload)
    } else {
      onSubmit(payload)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error" role="alert">{error}</div>}
          <label className="modal-label">
            Phone *
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10–15 digits" required className="modal-input" />
          </label>
          <label className="modal-label">
            Email (optional)
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="modal-input" />
          </label>
          {mode === 'create' && (
            <label className="modal-label">
              Password (optional, min 6)
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} className="modal-input" />
            </label>
          )}
          <label className="modal-label">
            Full name
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="modal-input" />
          </label>
          <label className="modal-label">
            Gender
            <input type="text" value={gender} onChange={(e) => setGender(e.target.value)} placeholder="e.g. Male" className="modal-input" />
          </label>
          <label className="modal-label">
            Age
            <input type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" className="modal-input" />
          </label>
          <label className="modal-label">
            WhatsApp
            <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="10–15 digits" className="modal-input" />
          </label>
          <label className="modal-label">
            Skills (comma-separated)
            <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Plumbing, Carpentry" className="modal-input" />
          </label>
          <label className="modal-label">
            Experience level
            <input type="text" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} placeholder="e.g. Entry" className="modal-input" />
          </label>
          <label className="modal-label">
            Daily earning expectation (₹)
            <input type="number" min={0} value={dailyEarningExpectation} onChange={(e) => setDailyEarningExpectation(e.target.value)} placeholder="500" className="modal-input" />
          </label>
          {mode === 'edit' && (
            <>
              <label className="modal-label">
                KYC status (admin verify)
                <select value={kycStatus} onChange={(e) => setKycStatus(e.target.value)} className="modal-input">
                  {KYC_FORM_OPTIONS.map((o) => (
                    <option key={o.value || 'none'} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="modal-label">
                KYC remarks
                <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks" className="modal-input" />
              </label>
            </>
          )}
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
