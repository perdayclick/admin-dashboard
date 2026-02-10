/**
 * Inline alert for errors or messages.
 */
export default function Alert({ children, variant = 'error', role = 'alert', className = '' }) {
  const cls = variant === 'error' ? 'mgmt-error' : 'mgmt-alert'
  return (
    <div className={`${cls} ${className}`.trim()} role={role}>
      {children}
    </div>
  )
}
