import { useState, useEffect, useCallback } from 'react'
import { usersApi, rolesApi } from '../services/api'
import UserForm from '../components/UserForm'
import UserView from '../components/UserView'
import ConfirmModal from '../components/ConfirmModal'
import './Users.css'

function getRoleName(user) {
  const r = user?.roleId
  if (!r) return '—'
  return typeof r === 'object' && r.name ? r.name : '—'
}

function getStatus(user) {
  if (user?.isBlocked) return { label: 'Suspended', className: 'status-suspended' }
  if (user?.isActive) return { label: 'Active', className: 'status-active' }
  return { label: 'Inactive', className: 'status-inactive' }
}

function initials(nameOrEmail) {
  if (!nameOrEmail) return '—'
  const s = String(nameOrEmail).trim()
  const parts = s.split(/[\s@.]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [roles, setRoles] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [viewUser, setViewUser] = useState(null)
  const [deleteUser, setDeleteUser] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await usersApi.list({
        page,
        limit: 10,
        role: roleFilter || undefined,
        search: search.trim() || undefined,
      })
      const data = res.data || res
      setUsers(data.users || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 0 })
    } catch (err) {
      const msg = err.body?.message || err.body?.error || err.message || 'Failed to load users'
      setError(typeof msg === 'string' ? msg : 'Request failed')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter])

  const fetchRoles = useCallback(async () => {
    try {
      const res = await rolesApi.list({ limit: 100 })
      const data = res.data || res
      const list = Array.isArray(data.roles) ? data.roles : (data.items || [])
      setRoles(list)
    } catch {
      setRoles([])
    }
  }, [])

  useEffect(() => {
    fetchUsers(pagination.page)
  }, [fetchUsers, pagination.page, roleFilter, search])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPagination((p) => ({ ...p, page: 1 }))
    fetchUsers(1) // refetch with current search/filters
  }

  const handleCreate = async (values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await usersApi.create(values)
      setCreateOpen(false)
      fetchUsers(pagination.page)
    } catch (err) {
      const msg = err.body?.message || err.body?.error || err.message || 'Create failed'
      setFormError(typeof msg === 'string' ? msg : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (userId, values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await usersApi.update(userId, values)
      setEditUser(null)
      fetchUsers(pagination.page)
    } catch (err) {
      const msg = err.body?.message || err.body?.error || err.message || 'Update failed'
      setFormError(typeof msg === 'string' ? msg : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return
    setSubmitting(true)
    try {
      await usersApi.delete(deleteUser._id)
      setDeleteUser(null)
      fetchUsers(pagination.page)
    } catch (err) {
      const msg = err.body?.message || err.body?.error || err.message || 'Delete failed'
      setError(typeof msg === 'string' ? msg : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const roleOptions = roles.map((r) => ({ value: r.name, label: r.name }))
  const total = pagination.total ?? users.length
  const totalActive = users.filter((u) => u.isActive && !u.isBlocked).length
  const totalSuspended = users.filter((u) => u.isBlocked).length

  return (
    <div className="users-page">
      <div className="users-header">
        <div>
          <h1 className="users-title">User Management</h1>
          <p className="users-subtitle">Manage and monitor platform users</p>
        </div>
        <div className="users-actions">
          <button type="button" className="users-btn secondary" disabled>
            Export
          </button>
          <button type="button" className="users-btn primary" onClick={() => setCreateOpen(true)}>
            Add User
          </button>
        </div>
      </div>

      <div className="users-cards">
        <div className="users-card">
          <span className="users-card-value">{total}</span>
          <span className="users-card-label">Total Users</span>
          <span className="users-card-meta positive">+12.5% this month</span>
        </div>
        <div className="users-card">
          <span className="users-card-value">{totalActive}</span>
          <span className="users-card-label">Active Users</span>
          <span className="users-card-meta positive">{total ? Math.round((totalActive / total) * 100) : 0}% of total</span>
        </div>
        <div className="users-card">
          <span className="users-card-value">—</span>
          <span className="users-card-label">Pending Approval</span>
          <span className="users-card-meta warning">Requires review</span>
        </div>
        <div className="users-card">
          <span className="users-card-value">{totalSuspended}</span>
          <span className="users-card-label">Suspended</span>
          <span className="users-card-meta negative">{total ? ((totalSuspended / total) * 100).toFixed(1) : 0}% of total</span>
        </div>
      </div>

      <div className="users-toolbar">
        <form className="users-search-form" onSubmit={handleSearchSubmit}>
          <svg className="users-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="search"
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="users-search-input"
          />
        </form>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          className="users-select"
        >
          <option value="">All Roles</option>
          {roleOptions.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="button" className="users-btn secondary" onClick={() => fetchUsers(1)}>
          More Filters
        </button>
      </div>

      {error && <div className="users-error" role="alert">{error}</div>}

      <div className="users-table-wrap">
        {loading ? (
          <div className="users-loading">Loading users…</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all" /></th>
                <th>USER</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>JOINED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="users-empty">No users found</td></tr>
              ) : (
                users.map((user) => {
                  const status = getStatus(user)
                  const name = user.email || user.phone || user._id
                  return (
                    <tr key={user._id}>
                      <td><input type="checkbox" aria-label={`Select ${name}`} /></td>
                      <td>
                        <div className="users-cell-user">
                          <span className="users-avatar">{initials(user.email || user.phone)}</span>
                          <div>
                            <span className="users-name">{user.email || user.phone || '—'}</span>
                            <span className="users-email">{user.email ? user.phone || '—' : user.phone || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{getRoleName(user)}</td>
                      <td><span className={`users-badge ${status.className}`}>{status.label}</span></td>
                      <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td>
                        <div className="users-actions-cell">
                          <button type="button" className="users-action-btn" onClick={() => setViewUser(user)} title="View">View</button>
                          <button type="button" className="users-action-btn" onClick={() => setEditUser(user)} title="Edit">Edit</button>
                          <button type="button" className="users-action-btn danger" onClick={() => setDeleteUser(user)} title="Delete">Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {!loading && pagination.pages > 1 && (
        <div className="users-pagination">
          <button
            type="button"
            className="users-btn secondary"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          >
            Previous
          </button>
          <span className="users-pagination-info">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <button
            type="button"
            className="users-btn secondary"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}

      {createOpen && (
        <UserForm
          title="Add User"
          roles={roleOptions}
          onSubmit={handleCreate}
          onClose={() => { setCreateOpen(false); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="create"
        />
      )}
      {editUser && (
        <UserForm
          title="Edit User"
          user={editUser}
          roles={roleOptions}
          onSubmit={(values) => handleUpdate(editUser._id, values)}
          onClose={() => { setEditUser(null); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="edit"
        />
      )}
      {viewUser && (
        <UserView user={viewUser} onClose={() => setViewUser(null)} />
      )}
      {deleteUser && (
        <ConfirmModal
          title="Delete User"
          message={`Are you sure you want to delete this user? (${deleteUser.email || deleteUser.phone || deleteUser._id})`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteUser(null)}
          loading={submitting}
          variant="danger"
        />
      )}
    </div>
  )
}
