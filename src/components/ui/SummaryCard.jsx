/**
 * Single summary stat card. Use in a grid for multiple cards.
 * @param {string} value - Main number/text
 * @param {string} label - Label below value
 * @param {string} [meta] - Optional meta line (e.g. "+12% this month")
 * @param {'positive'|'warning'|'negative'|undefined} [metaVariant] - Style for meta
 */
export default function SummaryCard({ value, label, meta, metaVariant }) {
  return (
    <div className="mgmt-card">
      <span className="mgmt-card-value">{value}</span>
      <span className="mgmt-card-label">{label}</span>
      {meta != null && meta !== '' && (
        <span className={`mgmt-card-meta ${metaVariant ? `mgmt-card-meta-${metaVariant}` : ''}`}>
          {meta}
        </span>
      )}
    </div>
  )
}
