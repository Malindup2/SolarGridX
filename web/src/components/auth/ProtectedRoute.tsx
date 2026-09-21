import { useEffect, useRef, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../types/auth'
import toast from 'react-hot-toast'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  allowPasswordChange?: boolean
}

export default function ProtectedRoute({ children, allowedRoles, allowPasswordChange = false }: ProtectedRouteProps) {
  const { auth } = useAuth()
  const location = useLocation()
  const notifiedRef = useRef(false)

  const isAuth = Boolean(auth && auth.token)
  const isRoleAllowed = !allowedRoles || (auth && allowedRoles.includes(auth.role))

  useEffect(() => {
    if (!isAuth && !notifiedRef.current) {
      notifiedRef.current = true
      toast.error('Authentication required. Please sign in with your credentials.', {
        id: 'auth-required',
      })
    } else if (isAuth && !isRoleAllowed && !notifiedRef.current) {
      notifiedRef.current = true
      const roleLabel = auth?.role === 'Backoffice' ? 'System Administrator' : 'Grid Operator'
      toast.error(
        `Access Restricted: Your role (${roleLabel}) is not authorized for this dashboard.`,
        { id: 'role-restricted' }
      )
    }
  }, [isAuth, isRoleAllowed, auth])

  // If unauthenticated, redirect to login with return path
  if (!isAuth) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${returnUrl}`} replace />
  }

  // Accounts created by an administrator must replace the temporary password first
  if (auth?.mustChangePassword && !allowPasswordChange) {
    return <Navigate to="/change-password" replace />
  }

  // If authenticated but unauthorized for this role, redirect to their home portal
  if (!isRoleAllowed) {
    const destination = auth?.homeRoute || (auth?.role === 'GridOperator' ? '/operator/home' : '/backoffice/dashboard')
    return <Navigate to={destination} replace />
  }

  return <>{children}</>
}
