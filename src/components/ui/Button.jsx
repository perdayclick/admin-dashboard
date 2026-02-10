/**
 * Primary or secondary button for management pages.
 */
export default function Button({ children, variant = 'secondary', onClick, disabled, type = 'button', className = '' }) {
  const base = 'mgmt-btn'
  const variantClass = variant === 'primary' ? 'mgmt-btn-primary' : 'mgmt-btn-secondary'
  return (
    <button
      type={type}
      className={`${base} ${variantClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
