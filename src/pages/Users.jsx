import { useState, useEffect, useCallback } from 'react'
import { usersApi, rolesApi } from '../services/api'
import { getErrorMessage } from '../utils/format'
import {
  PageHeader,
  SummaryCard,
  SearchToolbar,
  DataTable,
  TableEmptyRow,
  UserCell,
  TableActionButtons,
  Pagination,
  Alert,
  Button,
} from '../components/ui'
import UserForm from '../components/UserForm'
import UserView from '../components/UserView'
import ConfirmModal from '../components/ConfirmModal'
import InactiveDateModal from '../components/InactiveDateModal'
import '../styles/ManagementPage.css'

function getRoleName(user) {
  const r = user?.roleId
  if (!r) return '-'
  return typeof r === 'object' && r.name ? r.name : '-'
}

function getStatus(user) {
  if (user?.isBlocked) return { label: 'Suspended', statusKey: 'suspended' }
  if (user?.isActive) return { label: 'Active', statusKey: 'active' }
  return { label: 'Inactive', statusKey: 'inactive' }
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
  const [blockUser, setBlockUser] = useState(null)
  const [inactiveModalUser, setInactiveModalUser] = useState(null)
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
      setError(getErrorMessage(err, 'Failed to load users'))
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
  }, [fetchUsers, pagination.page])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPagination((p) => ({ ...p, page: 1 }))
    fetchUsers(1)
  }

  const handleCreate = async (values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await usersApi.create(values)
      setCreateOpen(false)
      fetchUsers(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Create failed'))
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
      setFormError(getErrorMessage(err, 'Update failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleBlockConfirm = async () => {
    if (!blockUser) return
    setSubmitting(true)
    try {
      await usersApi.update(blockUser._id, { isBlocked: true })
      setBlockUser(null)
      fetchUsers(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Block failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnblock = async (user) => {
    setSubmitting(true)
    try {
      await usersApi.update(user._id, { isBlocked: false })
      fetchUsers(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Unblock failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetInactive = async (userId, payload) => {
    setFormError('')
    setSubmitting(true)
    try {
      // Send ISO 8601 strings so backend validation accepts them (input type="date" gives YYYY-MM-DD only)
      const inactiveFrom = payload.inactiveFrom ? new Date(payload.inactiveFrom).toISOString() : null
      const inactiveTo = payload.inactiveTo ? new Date(payload.inactiveTo).toISOString() : null
      await usersApi.update(userId, { isActive: false, inactiveFrom, inactiveTo })
      setInactiveModalUser(null)
      fetchUsers(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Set inactive failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetActive = async (user) => {
    setFormError('')
    setSubmitting(true)
    try {
      await usersApi.update(user._id, { isActive: true, inactiveFrom: null, inactiveTo: null })
      fetchUsers(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Set active failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const roleOptions = [{ value: '', label: 'All Roles' }, ...roles.map((r) => ({ value: r.name, label: r.name }))]
  // For admin user creation: hide Worker and Employer (they are created via Workers/Employers flows only)
  const ROLES_EXCLUDED_FROM_CREATE = ['WORKER', 'EMPLOYER']
  const createRoleOptions = roleOptions.filter(
    (o) => o.value !== '' && !ROLES_EXCLUDED_FROM_CREATE.includes((o.value || '').toUpperCase())
  )
  const total = pagination.total ?? users.length
  const totalActive = users.filter((u) => u.isActive && !u.isBlocked).length
  const totalSuspended = users.filter((u) => u.isBlocked).length

  return (
    <div className="mgmt-page">
      <PageHeader
        title="User Management"
        subtitle="Manage and monitor platform users"
        primaryAction={<Button variant="primary" onClick={() => setCreateOpen(true)}>Add User</Button>}
        secondaryAction={
          <>
            <Button variant="secondary" onClick={() => fetchUsers(pagination.page)} disabled={loading} title="Refresh list">
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button disabled>Export</Button>
          </>
        }
      />

      <div className="mgmt-cards">
        <SummaryCard value={total} label="Total Users" meta="+12.5% this month" metaVariant="positive" />
        <SummaryCard
          value={totalActive}
          label="Active Users"
          meta={total ? `${Math.round((totalActive / total) * 100)}% of total` : undefined}
          metaVariant="positive"
        />
        <SummaryCard value="-" label="Pending Approval" meta="Requires review" metaVariant="warning" />
        <SummaryCard
          value={totalSuspended}
          label="Suspended"
          meta={total ? `${((totalSuspended / total) * 100).toFixed(1)}% of total` : undefined}
          metaVariant="negative"
        />
      </div>

      <SearchToolbar
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search by name, email, or ID..."
        filterOptions={roleOptions}
        filterValue={roleFilter}
        onFilterChange={(v) => { setRoleFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}
        extraButton={<Button onClick={() => fetchUsers(1)}>More Filters</Button>}
      />

      {error && <Alert>{error}</Alert>}

      <DataTable loading={loading} loadingMessage="Loading users…" emptyColSpan={7}>
        {!loading && (
          <table className="mgmt-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all" /></th>
                <th>USER</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>ACTIVE</th>
                <th>JOINED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <TableEmptyRow colSpan={7} message="No users found" />
              ) : (
                users.map((user) => {
                  const status = getStatus(user)
                  const isActive = user.isActive
                  return (
                    <tr key={user._id}>
                      <td><input type="checkbox" aria-label={`Select ${user.email || user.phone}`} /></td>
                      <td>
                        <UserCell
                          primary={user.email || user.phone || '-'}
                          secondary={user.email ? user.phone || '-' : user.phone || '-'}
                          nameOrEmail={user.email || user.phone}
                        />
                      </td>
                      <td>{getRoleName(user)}</td>
                      <td><span className={`mgmt-badge mgmt-status-${status.statusKey}`}>{status.label}</span></td>
                      <td>
                        <label className="mgmt-toggle-wrap">
                          <input
                            type="checkbox"
                            className="mgmt-switch-input"
                            checked={isActive}
                            onChange={() => {
                              if (isActive) {
                                setInactiveModalUser(user)
                              } else {
                                handleSetActive(user)
                              }
                            }}
                            disabled={user.isBlocked}
                            aria-label={isActive ? 'Active' : 'Inactive'}
                          />
                          <span className="mgmt-switch-track" aria-hidden="true">
                            <span className="mgmt-switch-thumb" />
                          </span>
                          <span className="mgmt-toggle-label">{isActive ? 'Active' : 'Inactive'}</span>
                        </label>
                      </td>
                      <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                      <td>
                        <TableActionButtons
                          onView={() => setViewUser(user)}
                          onEdit={() => setEditUser(user)}
                          onBlock={!user.isBlocked ? () => setBlockUser(user) : undefined}
                          onUnblock={user.isBlocked ? () => handleUnblock(user) : undefined}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </DataTable>

      <Pagination
        page={pagination.page}
        pages={pagination.pages}
        total={pagination.total}
        onPrevious={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
        onNext={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
      />

      {createOpen && (
        <UserForm
          title="Add User"
          roles={createRoleOptions}
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
          roles={roleOptions.filter((o) => o.value !== '')}
          onSubmit={(values) => handleUpdate(editUser._id, values)}
          onClose={() => { setEditUser(null); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="edit"
        />
      )}
      {viewUser && <UserView user={viewUser} onClose={() => setViewUser(null)} />}
      {blockUser && (
        <ConfirmModal
          title="Block User"
          message={`Block this user? They will be able to login with phone and OTP but cannot perform any actions. They will see: "You have been blocked due to some reason." (${blockUser.email || blockUser.phone || blockUser._id})`}
          confirmLabel="Block"
          onConfirm={handleBlockConfirm}
          onCancel={() => setBlockUser(null)}
          loading={submitting}
          variant="danger"
        />
      )}
      {inactiveModalUser && (
        <InactiveDateModal
          user={inactiveModalUser}
          onSubmit={(payload) => handleSetInactive(inactiveModalUser._id, payload)}
          onCancel={() => { setInactiveModalUser(null); setFormError(''); }}
          submitting={submitting}
          error={formError}
        />
      )}
    </div>
  )
}
