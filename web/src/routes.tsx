import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ProtectedRoute from './components/auth/ProtectedRoute'

const router = createBrowserRouter([
  // Protected Backoffice Administrator Dashboard (Backoffice role only)
  {
    path: '/backoffice/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['Backoffice']}>
        <DashboardPage defaultRole="Backoffice" />
      </ProtectedRoute>
    ),
  },

  // Protected Grid Operator Terminal (GridOperator and Backoffice can access)
  {
    path: '/operator/home',
    element: (
      <ProtectedRoute allowedRoles={['GridOperator', 'Backoffice']}>
        <DashboardPage defaultRole="GridOperator" />
      </ProtectedRoute>
    ),
  },

  // General dashboard redirect alias
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['Backoffice', 'GridOperator']}>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },

  // Public & consumer portal routes with marketing navbar and footer
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <AuthPage /> },
      { path: 'admin/login', element: <Navigate to="/login" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default router
