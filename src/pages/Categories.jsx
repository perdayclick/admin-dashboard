import { useState, useEffect, useCallback } from 'react'
import { categoriesApi } from '../services/api'
import { getErrorMessage } from '../utils/format'
import {
  PageHeader,
  SummaryCard,
  SearchToolbar,
  DataTable,
  TableEmptyRow,
  TableActionButtons,
  Pagination,
  Alert,
  Button,
} from '../components/ui'
import CategoryForm from '../components/CategoryForm'
import ConfirmModal from '../components/ConfirmModal'
import '../styles/ManagementPage.css'

function getStatus(cat) {
  return cat?.isActive ? { label: 'Active', statusKey: 'active' } : { label: 'Inactive', statusKey: 'inactive' }
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editCategory, setEditCategory] = useState(null)
  const [deleteCategory, setDeleteCategory] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchCategories = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await categoriesApi.list({
        page,
        limit: 10,
        search: search.trim() || undefined,
      })
      const data = res.data || res
      setCategories(data.categories || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 0 })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load categories'))
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchCategories(pagination.page)
  }, [fetchCategories, pagination.page])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPagination((p) => ({ ...p, page: 1 }))
    fetchCategories(1)
  }

  const handleCreate = async (values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await categoriesApi.create(values)
      setCreateOpen(false)
      fetchCategories(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Create failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (categoryId, values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await categoriesApi.update(categoryId, values)
      setEditCategory(null)
      fetchCategories(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Update failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteCategory) return
    setSubmitting(true)
    try {
      await categoriesApi.delete(deleteCategory._id)
      setDeleteCategory(null)
      fetchCategories(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (cat) => {
    setSubmitting(true)
    try {
      await categoriesApi.toggleActive(cat._id)
      fetchCategories(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Toggle failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const total = pagination.total ?? categories.length
  const totalActive = categories.filter((c) => c.isActive).length
  const totalInactive = categories.filter((c) => !c.isActive).length

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Category Management"
        subtitle="Manage categories; only active categories are visible on the user side"
        primaryAction={<Button variant="primary" onClick={() => setCreateOpen(true)}>Add Category</Button>}
        secondaryAction={<Button disabled>Export</Button>}
      />

      <div className="mgmt-cards">
        <SummaryCard value={total} label="Total Categories" />
        <SummaryCard
          value={totalActive}
          label="Active"
          meta={total ? `${Math.round((totalActive / total) * 100)}% of total` : undefined}
          metaVariant="positive"
        />
        <SummaryCard
          value={totalInactive}
          label="Inactive"
          meta={total ? `${((totalInactive / total) * 100).toFixed(1)}% of total` : undefined}
          metaVariant="negative"
        />
      </div>

      <SearchToolbar
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search by category name..."
      />

      {error && <Alert>{error}</Alert>}

      <DataTable loading={loading} loadingMessage="Loading categories…" emptyColSpan={4}>
        {!loading && (
          <table className="mgmt-table">
            <thead>
              <tr>
                <th>CATEGORY NAME</th>
                <th>STATUS</th>
                <th>CREATED DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <TableEmptyRow colSpan={4} message="No categories found" />
              ) : (
                categories.map((cat) => {
                  const status = getStatus(cat)
                  return (
                    <tr key={cat._id}>
                      <td>{cat.categoryName || '-'}</td>
                      <td><span className={`mgmt-badge mgmt-status-${status.statusKey}`}>{status.label}</span></td>
                      <td>{cat.createdAt ? new Date(cat.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                      <td>
                        <TableActionButtons
                          onToggleActive={() => handleToggleActive(cat)}
                          toggleActiveLabel={cat.isActive ? 'Deactivate' : 'Activate'}
                          onEdit={() => setEditCategory(cat)}
                          onDelete={() => setDeleteCategory(cat)}
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
        <CategoryForm
          title="Add Category"
          onSubmit={handleCreate}
          onClose={() => { setCreateOpen(false); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="create"
        />
      )}
      {editCategory && (
        <CategoryForm
          title="Edit Category"
          category={editCategory}
          onSubmit={(values) => handleUpdate(editCategory._id, values)}
          onClose={() => { setEditCategory(null); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="edit"
        />
      )}
      {deleteCategory && (
        <ConfirmModal
          title="Delete Category"
          message="Do you really want to delete this category?"
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteCategory(null)}
          loading={submitting}
          variant="danger"
        />
      )}
    </div>
  )
}
