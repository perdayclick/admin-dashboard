import Avatar from './Avatar'

/**
 * Table cell: avatar + primary line + secondary line (e.g. name + email).
 * If onClick is provided, the whole cell becomes clickable (used to open detail views).
 */
export default function UserCell({ nameOrEmail, primary, secondary, className = '', onClick }) {
  return (
    <div
      className={`mgmt-cell-user ${onClick ? 'mgmt-cell-user-clickable' : ''} ${className}`.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Avatar nameOrEmail={nameOrEmail ?? primary} />
      <div>
        <span className="mgmt-name">{primary ?? '-'}</span>
        {secondary != null && secondary !== '' && (
          <span className="mgmt-email">{secondary}</span>
        )}
      </div>
    </div>
  )
}
