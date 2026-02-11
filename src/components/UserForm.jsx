import { useState, useEffect } from 'react'
import './Modal.css'

export default function UserForm({ title, user, roles, onSubmit, onClose, error, submitting, mode }) {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [roleName, setRoleName] = useState('')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    if (user) {
      setPhone(user.phone || '')
      setEmail(user.email || '')
      const r = user.roleId
      setRoleName(typeof r === 'object' && r?.name ? r.name : (r || ''))
      setIsActive(user.isActive !== false)
      setIsBlocked(user.isBlocked === true)
    } else {
      setRoleName(roles?.[0]?.value || '')
    }
  }, [user, roles])

  const handlePhoneChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(v)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (mode === 'create') {
      onSubmit({ phone: phone.trim(), email: email.trim() || undefined, roleName: roleName.trim(), password: password || undefined })
    } else {
      // Phone is view-only on edit; do not send
      onSubmit({ email: email.trim() || undefined, roleName: roleName.trim(), isActive, isBlocked })
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error" role="alert">{error}</div>}
          <label className="modal-label">
            Phone {mode === 'edit' && <span className="modal-hint">(view only)</span>}
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              value={phone}
              onChange={handlePhoneChange}
              placeholder="10 digits"
              required
              readOnly={mode === 'edit'}
              disabled={mode === 'edit'}
              className="modal-input"
              aria-readonly={mode === 'edit'}
              title="Exactly 10 digits"
            />
          </label>
          <label className="modal-label">
            Email (optional)
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="modal-input"
            />
          </label>
          <label className="modal-label">
            Role
            <select value={roleName} onChange={(e) => setRoleName(e.target.value)} required className="modal-input">
              <option value="">Select role</option>
              {roles.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          {mode === 'create' && (
            <label className="modal-label">
              Password (optional, min 6)
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="modal-input"
              />
            </label>
          )}
          {mode === 'edit' && (
            <>
              <label className="modal-label checkbox-label">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <span>Active</span>
              </label>
              <label className="modal-label checkbox-label">
                <input type="checkbox" checked={isBlocked} onChange={(e) => setIsBlocked(e.target.checked)} />
                <span>Blocked (Suspended)</span>
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
