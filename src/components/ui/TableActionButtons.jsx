/**
 * View / Edit / Delete / Toggle Active action buttons for table rows.
 */
export default function TableActionButtons({ onView, onEdit, onDelete, onToggleActive, toggleActiveLabel }) {
  return (
    <div className="mgmt-actions-cell">
      {onView && (
        <button type="button" className="mgmt-action-btn" onClick={onView}>
          View
        </button>
      )}
      {onToggleActive && (
        <button type="button" className="mgmt-action-btn" onClick={onToggleActive}>
          {toggleActiveLabel ?? 'Toggle'}
        </button>
      )}
      {onEdit && (
        <button type="button" className="mgmt-action-btn" onClick={onEdit}>
          Edit
        </button>
      )}
      {onDelete && (
        <button type="button" className="mgmt-action-btn mgmt-action-btn-danger" onClick={onDelete}>
          Delete
        </button>
      )}
    </div>
  )
}
