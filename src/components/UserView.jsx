import './Modal.css'

function getRoleName(user) {
  const r = user?.roleId
  if (!r) return '—'
  return typeof r === 'object' && r.name ? r.name : '—'
}

export default function UserView({ user, onClose }) {
  if (!user) return null
  const status = user.isBlocked ? 'Suspended' : user.isActive ? 'Active' : 'Inactive'
  const joined = user.createdAt ? new Date(user.createdAt).toLocaleString('en-IN') : '—'
  const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-IN') : '—'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-view" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">User Details</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <div className="view-row">
            <span className="view-label">ID</span>
            <span className="view-value">{user._id}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Phone</span>
            <span className="view-value">{user.phone || '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Email</span>
            <span className="view-value">{user.email || '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Role</span>
            <span className="view-value">{getRoleName(user)}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Status</span>
            <span className="view-value">{status}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Joined</span>
            <span className="view-value">{joined}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Last login</span>
            <span className="view-value">{lastLogin}</span>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-btn primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
