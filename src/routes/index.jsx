import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import MainLayout from '../layouts/MainLayout'
import Dashboard from '../pages/Dashboard'
import Login from '../pages/Login'
import Users from '../pages/Users'
import Workers from '../pages/Workers'
import WorkerDetail from '../pages/WorkerDetail'
import Employers from '../pages/Employers'
import EmployerDetail from '../pages/EmployerDetail'
import Jobs from '../pages/Jobs'
import JobDetail from '../pages/JobDetail'
import Placeholder from '../pages/Placeholder'
import Categories from '../pages/Categories'

export const router = createBrowserRouter(
  [
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
        { path: 'workers', element: <Workers /> },
        { path: 'workers/:workerId', element: <WorkerDetail /> },
        { path: 'employers', element: <Employers /> },
        { path: 'employers/:employerId', element: <EmployerDetail /> },
        { path: 'categories', element: <Categories /> },
        { path: 'agents', element: <Placeholder title="Agents" /> },
        { path: 'jobs', element: <Jobs /> },
        { path: 'jobs/:jobId', element: <JobDetail /> },
        { path: 'payments', element: <Placeholder title="Payments" /> },
        { path: 'analytics', element: <Placeholder title="Analytics" /> },
        { path: 'fraud', element: <Placeholder title="Fraud Control" /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { future: { v7_startTransition: true } }
)
