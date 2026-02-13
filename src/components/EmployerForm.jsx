import { useState, useEffect } from 'react'
import { KYC_FORM_OPTIONS } from '../constants/kyc'
import { AVAILABILITY_OPTIONS, VERIFICATION_TYPE_OPTIONS } from '../constants/schemaEnums'
import './Modal.css'

const emptyAddress = { addressText: '', city: '', state: '', pincode: '', country: '' }

export default function EmployerForm({ title, employer, onSubmit, onClose, error, submitting, mode }) {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [dob, setDob] = useState('')
  const [contactPersonName, setContactPersonName] = useState('')
  const [contactPersonPhone, setContactPersonPhone] = useState('')
  const [jobCategories, setJobCategories] = useState('')
  const [availabilityStatus, setAvailabilityStatus] = useState('')
  const [verificationType, setVerificationType] = useState('')
  const [address, setAddress] = useState(emptyAddress)
  const [kycStatus, setKycStatus] = useState('')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (employer) {
      const u = employer.userId || employer.user
      setPhone(u?.phone ?? employer.phone ?? '')
      setEmail(u?.email ?? employer.email ?? '')
      setFullName(employer.fullName || '')
      setGender(employer.gender || '')
      setBusinessName(employer.businessName || '')
      setCompanyName(employer.companyName || '')
      setGstNumber(employer.gstNumber || '')
      setDob(employer.dob ? (typeof employer.dob === 'string' ? employer.dob.slice(0, 10) : employer.dob.toISOString?.().slice(0, 10)) : '')
      setContactPersonName(employer.contactPersonName || '')
      setContactPersonPhone(employer.contactPersonPhone || '')
      setJobCategories(Array.isArray(employer.jobCategories) ? employer.jobCategories.join(', ') : '')
      setAvailabilityStatus(employer.availabilityStatus || '')
      setVerificationType(employer.verificationType || '')
      const addr = Array.isArray(employer.address) && employer.address[0] ? employer.address[0] : {}
      setAddress({
        addressText: addr.addressText || '',
        city: addr.city || '',
        state: addr.state || '',
        pincode: addr.pincode || '',
        country: addr.country || '',
      })
      setKycStatus(employer.kyc?.status || '')
      setRemarks(employer.kyc?.remarks || '')
    } else {
      setAddress(emptyAddress)
      setKycStatus('')
      setRemarks('')
      setFullName('')
      setGender('')
    }
  }, [employer])

  const handlePhoneChange = (e) => {
    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
  }
  const handleContactPhoneChange = (e) => {
    setContactPersonPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
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
      gender: gender || undefined,
      businessName: businessName.trim() || undefined,
      companyName: companyName.trim() || undefined,
      gstNumber: gstNumber.trim() || undefined,
      dob: dob || undefined,
      contactPersonName: contactPersonName.trim() || undefined,
      contactPersonPhone: contactPersonPhone.trim() || undefined,
      jobCategories: jobCategories.trim() ? jobCategories.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      availabilityStatus: availabilityStatus || undefined,
      verificationType: verificationType || undefined,
      address: addressArray,
    }
    if (mode === 'edit') {
      const updatePayload = {
        user: { email: (payload.email && payload.email.trim()) || undefined },
        fullName: payload.fullName,
        gender: payload.gender,
        businessName: payload.businessName,
        companyName: payload.companyName,
        gstNumber: payload.gstNumber,
        dob: payload.dob,
        contactPersonName: payload.contactPersonName,
        contactPersonPhone: payload.contactPersonPhone,
        jobCategories: payload.jobCategories,
        availabilityStatus: payload.availabilityStatus,
        verificationType: payload.verificationType,
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
            <h3 className="modal-section-title">Business</h3>
            <label className="modal-label">
              Full name
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Owner full name" className="modal-input" />
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
              Business name
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" className="modal-input" />
            </label>
            <label className="modal-label">
              Company name
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" className="modal-input" />
            </label>
            <label className="modal-label">
              GST number
              <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="GST number" className="modal-input" />
            </label>
            <label className="modal-label">
              Date of birth
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="modal-input" />
            </label>
            <label className="modal-label">
              Contact person
              <input type="text" value={contactPersonName} onChange={(e) => setContactPersonName(e.target.value)} placeholder="Contact person name" className="modal-input" />
            </label>
            <label className="modal-label">
              Contact phone
              <input type="tel" inputMode="numeric" maxLength={10} value={contactPersonPhone} onChange={handleContactPhoneChange} placeholder="10 digits" className="modal-input" />
            </label>
            <label className="modal-label">
              Job categories (comma-separated)
              <input type="text" value={jobCategories} onChange={(e) => setJobCategories(e.target.value)} placeholder="Construction, Plumbing" className="modal-input" />
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
              Verification type
              <select value={verificationType} onChange={(e) => setVerificationType(e.target.value)} className="modal-input">
                {VERIFICATION_TYPE_OPTIONS.map((o) => (
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
