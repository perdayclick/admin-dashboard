export default function Placeholder({ title = 'Coming soon' }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#374151' }}>{title}</h2>
      <p style={{ margin: 0 }}>This section is not implemented yet.</p>
    </div>
  )
}
