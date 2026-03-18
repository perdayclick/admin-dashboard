/**
 * Search + optional refresh icon + optional select filter + optional extra buttons.
 */
const SearchIcon = () => (
  <svg className="mgmt-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const RefreshIcon = ({ spinning }) => (
  <svg
    className={`mgmt-refresh-icon ${spinning ? 'mgmt-refresh-icon--spinning' : ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 21h5v-5" />
  </svg>
)

export default function SearchToolbar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search…',
  filterOptions,
  filterValue,
  onFilterChange,
  filterLabel = 'All',
  extraButton,
  onRefresh,
  refreshing = false,
}) {
  return (
    <div className="mgmt-toolbar">
      <form className="mgmt-search-form" onSubmit={onSearchSubmit}>
        <SearchIcon />
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="mgmt-search-input"
          aria-label="Search"
        />
      </form>
      {onRefresh && (
        <button
          type="button"
          className="mgmt-refresh-btn"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh list"
          aria-label="Refresh list"
        >
          <RefreshIcon spinning={refreshing} />
        </button>
      )}
      {filterOptions != null && filterOptions.length > 0 && (
        <select
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
          className="mgmt-select"
          aria-label={filterLabel}
        >
          {filterOptions.map((opt) => (
            <option key={opt.value ?? 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
      {extraButton}
    </div>
  )
}
