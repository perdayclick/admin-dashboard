/**
 * View / Edit / Delete action buttons for table rows.
 */
export default function TableActionButtons({ onView, onEdit, onDelete }) {
  return (
    <div className="mgmt-actions-cell">
      {onView && (
        <button type="button" className="mgmt-action-btn" onClick={onView}>
          View
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
