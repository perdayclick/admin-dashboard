import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <div className="main-layout">
      <header className="main-header">
        <h1>Admin Portal</h1>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
