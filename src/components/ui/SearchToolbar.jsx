/**
 * Search + optional select filter + optional extra buttons.
 */
const SearchIcon = () => (
  <svg className="mgmt-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
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
