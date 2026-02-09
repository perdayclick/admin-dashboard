import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import MainLayout from '../layouts/MainLayout'
import Dashboard from '../pages/Dashboard'
import Login from '../pages/Login'
import Users from '../pages/Users'
import Placeholder from '../pages/Placeholder'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'users', element: <Users /> },
      { path: 'employers', element: <Placeholder title="Employers" /> },
      { path: 'agents', element: <Placeholder title="Agents" /> },
      { path: 'jobs', element: <Placeholder title="Jobs & Tasks" /> },
      { path: 'payments', element: <Placeholder title="Payments" /> },
      { path: 'analytics', element: <Placeholder title="Analytics" /> },
      { path: 'fraud', element: <Placeholder title="Fraud Control" /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
