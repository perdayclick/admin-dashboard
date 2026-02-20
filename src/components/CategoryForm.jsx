import { useState, useEffect } from 'react'
import './Modal.css'

export default function CategoryForm({ title, category, onSubmit, onClose, error, submitting, mode }) {
  const [categoryName, setCategoryName] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (category) {
      setCategoryName(category.categoryName || '')
      setIsActive(category.isActive !== false)
    } else {
      setCategoryName('')
      setIsActive(true)
    }
  }, [category])

  const handleSubmit = (e) => {
    e.preventDefault()
    const name = categoryName.trim()
    if (!name) return
    if (mode === 'create') {
      onSubmit({ categoryName: name, isActive })
    } else {
      onSubmit({ categoryName: name, isActive })
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
            Category Name
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Electronics"
              required
              maxLength={200}
              className="modal-input"
            />
          </label>
          <label className="modal-label checkbox-label">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>Active (visible on user side)</span>
          </label>
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
