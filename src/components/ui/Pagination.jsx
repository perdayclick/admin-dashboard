/**
 * Standard pagination: left = "Showing X–Y of Z", right = Previous / Next.
 */
export default function Pagination({ page, pages, total, limit = 10, onPrevious, onNext }) {
  const totalRes = total ?? 0
  const pageNum = Math.max(1, page ?? 1)
  const pagesNum = Math.max(1, pages ?? 1)
  const from = totalRes === 0 ? 0 : (pageNum - 1) * (limit || 10) + 1
  const to = Math.min(pageNum * (limit || 10), totalRes)

  if (pagesNum <= 1 && totalRes <= (limit || 10)) return null

  return (
    <div className="mgmt-pagination">
      <div className="mgmt-pagination-left">
        <span className="mgmt-pagination-info">
          Showing {from} to {to} of {totalRes} entries
        </span>
      </div>
      <div className="mgmt-pagination-right">
        <button
          type="button"
          className="mgmt-btn mgmt-btn-secondary mgmt-pagination-btn"
          disabled={pageNum <= 1}
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          type="button"
          className="mgmt-btn mgmt-btn-secondary mgmt-pagination-btn"
          disabled={pageNum >= pagesNum}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  )
}
