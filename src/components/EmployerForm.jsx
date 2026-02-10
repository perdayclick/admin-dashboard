import { useState, useEffect } from 'react'
import { KYC_FORM_OPTIONS } from '../constants/kyc'
import './Modal.css'

export default function EmployerForm({ title, employer, onSubmit, onClose, error, submitting, mode }) {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactPersonName, setContactPersonName] = useState('')
  const [contactPersonPhone, setContactPersonPhone] = useState('')
  const [jobCategories, setJobCategories] = useState('')
  const [kycStatus, setKycStatus] = useState('')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (employer) {
      const u = employer.userId || employer.user
      setPhone(u?.phone ?? employer.phone ?? '')
      setEmail(u?.email ?? employer.email ?? '')
      setBusinessName(employer.businessName || '')
      setCompanyName(employer.companyName || '')
      setContactPersonName(employer.contactPersonName || '')
      setContactPersonPhone(employer.contactPersonPhone || '')
      setJobCategories(Array.isArray(employer.jobCategories) ? employer.jobCategories.join(', ') : '')
      setKycStatus(employer.kyc?.status || '')
      setRemarks(employer.kyc?.remarks || '')
    } else {
      setKycStatus('')
      setRemarks('')
    }
  }, [employer])

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      phone: phone.trim(),
      email: email.trim() || undefined,
      password: password || undefined,
      businessName: businessName.trim() || undefined,
      companyName: companyName.trim() || undefined,
      contactPersonName: contactPersonName.trim() || undefined,
      contactPersonPhone: contactPersonPhone.trim() || undefined,
      jobCategories: jobCategories.trim() ? jobCategories.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    }
    if (mode === 'edit') {
      const updatePayload = {
        user: { phone: payload.phone.trim(), email: (payload.email && payload.email.trim()) || undefined },
        businessName: payload.businessName,
        companyName: payload.companyName,
        contactPersonName: payload.contactPersonName,
        contactPersonPhone: payload.contactPersonPhone,
        jobCategories: payload.jobCategories,
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
            Business name
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" className="modal-input" />
          </label>
          <label className="modal-label">
            Company name
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" className="modal-input" />
          </label>
          <label className="modal-label">
            Contact person
            <input type="text" value={contactPersonName} onChange={(e) => setContactPersonName(e.target.value)} placeholder="Contact person name" className="modal-input" />
          </label>
          <label className="modal-label">
            Contact phone
            <input type="text" value={contactPersonPhone} onChange={(e) => setContactPersonPhone(e.target.value)} placeholder="10–15 digits" className="modal-input" />
          </label>
          <label className="modal-label">
            Job categories (comma-separated)
            <input type="text" value={jobCategories} onChange={(e) => setJobCategories(e.target.value)} placeholder="Construction, Plumbing" className="modal-input" />
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
