/**
 * Reusable page header: title, subtitle, primary and optional secondary actions.
 */
export default function PageHeader({ title, subtitle, primaryAction, secondaryAction }) {
  return (
    <div className="mgmt-header">
      <div>
        <h1 className="mgmt-title">{title}</h1>
        {subtitle && <p className="mgmt-subtitle">{subtitle}</p>}
      </div>
      <div className="mgmt-actions">
        {secondaryAction}
        {primaryAction}
      </div>
    </div>
  )
}
