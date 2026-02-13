import { useState, useEffect } from 'react'
import { KYC_FORM_OPTIONS } from '../constants/kyc'
import { AVAILABILITY_OPTIONS, WORKER_LEVEL_OPTIONS } from '../constants/schemaEnums'
import './Modal.css'

const emptyAddress = { addressText: '', city: '', state: '', pincode: '', country: '' }

export default function WorkerForm({ title, worker, onSubmit, onClose, error, submitting, mode }) {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [dob, setDob] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [skills, setSkills] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [dailyEarningExpectation, setDailyEarningExpectation] = useState('')
  const [availabilityStatus, setAvailabilityStatus] = useState('')
  const [workerLevel, setWorkerLevel] = useState('')
  const [address, setAddress] = useState(emptyAddress)
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
      setDob(worker.dob ? (typeof worker.dob === 'string' ? worker.dob.slice(0, 10) : worker.dob.toISOString?.().slice(0, 10)) : '')
      setPhoneNumber(worker.phoneNumber || '')
      setWhatsappNumber(worker.whatsappNumber || '')
      setSkills(Array.isArray(worker.skills) ? worker.skills.join(', ') : '')
      setExperienceLevel(worker.experienceLevel || '')
      setDailyEarningExpectation(worker.dailyEarningExpectation ?? '')
      setAvailabilityStatus(worker.availabilityStatus || '')
      setWorkerLevel(worker.workerLevel || '')
      const addr = Array.isArray(worker.address) && worker.address[0] ? worker.address[0] : {}
      setAddress({
        addressText: addr.addressText || '',
        city: addr.city || '',
        state: addr.state || '',
        pincode: addr.pincode || '',
        country: addr.country || '',
      })
      setKycStatus(worker.kyc?.status || '')
      setRemarks(worker.kyc?.remarks || '')
    } else {
      setAddress(emptyAddress)
      setKycStatus('')
      setRemarks('')
    }
  }, [worker])

  const handlePhoneChange = (e) => {
    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
  }
  const handlePhoneNumberChange = (e) => {
    setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
  }
  const handleWhatsAppChange = (e) => {
    setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const hasAddress = address.addressText || address.city || address.state || address.pincode || address.country
    const addressArray = hasAddress ? [{ ...address }] : undefined
    const payload = {
      phone: phone.trim(),
      email: email.trim() || undefined,
      password: password || undefined,
      fullName: fullName.trim() || undefined,
      gender: gender.trim() || undefined,
      age: age === '' ? undefined : Number(age),
      dob: dob ? dob : undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      whatsappNumber: whatsappNumber.trim() || undefined,
      skills: skills.trim() ? skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      experienceLevel: experienceLevel.trim() || undefined,
      dailyEarningExpectation: dailyEarningExpectation === '' ? undefined : Number(dailyEarningExpectation),
      availabilityStatus: availabilityStatus || undefined,
      workerLevel: workerLevel || undefined,
      address: addressArray,
    }
    if (mode === 'edit') {
      const updatePayload = {
        user: { email: (payload.email && payload.email.trim()) || undefined },
        fullName: payload.fullName || undefined,
        gender: payload.gender || undefined,
        age: payload.age,
        dob: payload.dob,
        phoneNumber: payload.phoneNumber || undefined,
        whatsappNumber: payload.whatsappNumber || undefined,
        skills: payload.skills,
        experienceLevel: payload.experienceLevel || undefined,
        dailyEarningExpectation: payload.dailyEarningExpectation,
        availabilityStatus: payload.availabilityStatus,
        workerLevel: payload.workerLevel,
        address: payload.address,
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
      <div className="modal-box modal-form-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '90vh' }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error" role="alert">{error}</div>}
          <section className="modal-section">
            <h3 className="modal-section-title">Login (User)</h3>
            <label className="modal-label">
              Phone * {mode === 'edit' && <span className="modal-hint">(view only)</span>}
              <input type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={phone} onChange={handlePhoneChange} placeholder="10 digits" required readOnly={mode === 'edit'} disabled={mode === 'edit'} className="modal-input" title="Exactly 10 digits" />
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
          </section>
          <section className="modal-section">
            <h3 className="modal-section-title">Profile</h3>
            <label className="modal-label">
              Full name
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="modal-input" />
            </label>
            <label className="modal-label">
              Gender
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="modal-input">
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="modal-label">
              Age
              <input type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" className="modal-input" />
            </label>
            <label className="modal-label">
              Date of birth
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="modal-input" />
            </label>
            <label className="modal-label">
              Phone number (worker)
              <input type="tel" inputMode="numeric" maxLength={10} value={phoneNumber} onChange={handlePhoneNumberChange} placeholder="10 digits" className="modal-input" />
            </label>
            <label className="modal-label">
              WhatsApp
              <input type="tel" inputMode="numeric" maxLength={10} value={whatsappNumber} onChange={handleWhatsAppChange} placeholder="10 digits" className="modal-input" />
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
            <label className="modal-label">
              Availability
              <select value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value)} className="modal-input">
                {AVAILABILITY_OPTIONS.map((o) => (
                  <option key={o.value || 'blank'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="modal-label">
              Worker level
              <select value={workerLevel} onChange={(e) => setWorkerLevel(e.target.value)} className="modal-input">
                {WORKER_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value || 'blank'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </section>
          <section className="modal-section">
            <h3 className="modal-section-title">Address</h3>
            <label className="modal-label">
              Address line
              <input type="text" value={address.addressText} onChange={(e) => setAddress((a) => ({ ...a, addressText: e.target.value }))} placeholder="Street, area" className="modal-input" />
            </label>
            <label className="modal-label">
              City
              <input type="text" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} placeholder="City" className="modal-input" />
            </label>
            <label className="modal-label">
              State
              <input type="text" value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} placeholder="State" className="modal-input" />
            </label>
            <label className="modal-label">
              Pincode
              <input type="text" value={address.pincode} onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value }))} placeholder="Pincode" className="modal-input" />
            </label>
            <label className="modal-label">
              Country
              <input type="text" value={address.country} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))} placeholder="Country" className="modal-input" />
            </label>
          </section>
          {mode === 'edit' && (
            <section className="modal-section">
              <h3 className="modal-section-title">KYC (admin)</h3>
              <label className="modal-label">
                KYC status
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
            </section>
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
