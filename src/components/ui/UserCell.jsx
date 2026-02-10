import Avatar from './Avatar'

/**
 * Table cell: avatar + primary line + secondary line (e.g. name + email).
 */
export default function UserCell({ nameOrEmail, primary, secondary, className = '' }) {
  return (
    <div className={`mgmt-cell-user ${className}`.trim()}>
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
