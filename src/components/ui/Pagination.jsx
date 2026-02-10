/**
 * Previous / Page info / Next pagination.
 */
export default function Pagination({ page, pages, total, onPrevious, onNext }) {
  if (pages <= 1) return null
  return (
    <div className="mgmt-pagination">
      <button
        type="button"
        className="mgmt-btn mgmt-btn-secondary"
        disabled={page <= 1}
        onClick={onPrevious}
      >
        Previous
      </button>
      <span className="mgmt-pagination-info">
        Page {page} of {pages} ({total} total)
      </span>
      <button
        type="button"
        className="mgmt-btn mgmt-btn-secondary"
        disabled={page >= pages}
        onClick={onNext}
      >
        Next
      </button>
    </div>
  )
}
