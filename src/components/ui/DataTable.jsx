/**
 * Table wrapper with loading and empty states.
 * Children should be <table> with thead/tbody.
 */
export default function DataTable({ loading, loadingMessage = 'Loading…', emptyMessage = 'No records found', emptyColSpan = 6, children }) {
  return (
    <div className="mgmt-table-wrap">
      {loading ? (
        <div className="mgmt-loading" role="status">{loadingMessage}</div>
      ) : (
        children
      )}
    </div>
  )
}

/** Renders a single empty row for use inside table tbody when list is empty. */
export function TableEmptyRow({ colSpan, message = 'No records found' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="mgmt-empty">
        {message}
      </td>
    </tr>
  )
}
