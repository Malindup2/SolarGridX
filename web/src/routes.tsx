import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import type { ReactNode } from 'react'
import MainLayout from './layouts/MainLayout'
import AppLayout from './layouts/AppLayout'
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import type { UserRole } from './types/auth'
import BackofficeDashboardPage from './pages/reservations/BackofficeDashboardPage'
import OperatorDashboardPage from './pages/reservations/OperatorDashboardPage'
import ReservationListPage from './pages/reservations/ReservationListPage'
import ReservationDetailsPage from './pages/reservations/ReservationDetailsPage'
import ActionSummaryPage from './pages/reservations/ActionSummaryPage'
import BookingMonitorPage from './pages/reservations/BookingMonitorPage'
import NewReservationPage from './pages/reservations/NewReservationPage'
import ProfilePage from './pages/account/ProfilePage'
import NotificationsPage from './pages/account/NotificationsPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import UsersPage from './pages/users/UsersPage'
import ProsumersPage from './pages/prosumers/ProsumersPage'
import ProsumerDetailsPage from './pages/prosumers/ProsumerDetailsPage'
import StationsPage from './pages/stations/StationsPage'
import StationDetailsPage from './pages/stations/StationDetailsPage'
import SlotsPage from './pages/slots/SlotsPage'

const STAFF: UserRole[] = ['Backoffice', 'GridOperator']

function guard(roles: UserRole[], element: ReactNode) {
  return <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>
}

// Signed-in web app. Each section belongs to the member named next to it
// (docs/FRONTEND-OWNERSHIP.md); owners send M1 their page to swap in.
const appRoutes: RouteObject[] = [
  // M1 — dashboards, reservations, bookings
  { path: 'backoffice/dashboard', element: guard(['Backoffice'], <BackofficeDashboardPage />) },
  { path: 'operator/home', element: guard(['GridOperator'], <OperatorDashboardPage />) },
  { path: 'reservations', element: guard(STAFF, <ReservationListPage />) },
  { path: 'reservations/new', element: guard(['GridOperator'], <NewReservationPage />) },
  { path: 'reservations/:id', element: guard(STAFF, <ReservationDetailsPage />) },
  { path: 'reservations/:id/summary', element: guard(STAFF, <ActionSummaryPage />) },
  { path: 'bookings', element: guard(STAFF, <BookingMonitorPage />) },

  // Every staff member's own account
  { path: 'profile', element: guard(STAFF, <ProfilePage />) },
  { path: 'notifications', element: guard(STAFF, <NotificationsPage />) },

  // M2 — identity
  { path: 'users', element: guard(['Backoffice'], <UsersPage />) },
  { path: 'prosumers', element: guard(STAFF, <ProsumersPage />) },
  { path: 'prosumers/:nic', element: guard(STAFF, <ProsumerDetailsPage />) },

  // M3 — stations
  { path: 'stations', element: guard(STAFF, <StationsPage />) },
  { path: 'stations/:id', element: guard(STAFF, <StationDetailsPage />) },

  // M4 — slots (write endpoints are GridOperator only)
  { path: 'slots', element: guard(['GridOperator'], <SlotsPage />) },
]

const router = createBrowserRouter([
  // Password change (any signed-in web user; forced on first sign-in for administrator-created accounts)
  {
    path: '/change-password',
    element: (
      <ProtectedRoute allowedRoles={STAFF} allowPasswordChange>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },

  // Pathless layout route: it only matches when one of its children does, so
  // it never competes with the public "/" below.
  { element: guard(STAFF, <AppLayout />), children: appRoutes },

  // Public routes with marketing navbar and footer
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <AuthPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'admin/login', element: <Navigate to="/login" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default router
