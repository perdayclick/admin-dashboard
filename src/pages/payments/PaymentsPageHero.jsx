export default function PaymentsPageHero({ title, subtitle, badge }) {
  const showBadge = badge != null && Number(badge) > 0
  return (
    <header className="payments-page-hero">
      <div className="payments-page-hero__text">
        <h2 className="payments-page-hero__title">{title}</h2>
        {subtitle && <p className="payments-page-hero__subtitle">{subtitle}</p>}
      </div>
      {showBadge && (
        <span className="payments-page-hero__badge" title="Open items">
          {badge}
        </span>
      )}
    </header>
  )
}
