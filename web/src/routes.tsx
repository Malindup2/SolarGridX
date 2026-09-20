import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import DashboardStub from './pages/DashboardStub'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <AuthPage initialTab="login" /> },
      { path: 'register', element: <AuthPage initialTab="register" /> },
      { path: 'admin/login', element: <Navigate to="/login" replace /> },
      { path: 'prosumer/home', element: <DashboardStub roleName="Prosumer" /> },
      { path: 'operator/home', element: <DashboardStub roleName="Grid Operator" /> },
      { path: 'backoffice/dashboard', element: <DashboardStub roleName="Backoffice Administrator" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default router
