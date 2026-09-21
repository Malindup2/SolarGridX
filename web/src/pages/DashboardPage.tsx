import { useAuth } from '../context/AuthContext'
import { useLogoutConfirm } from '../components/auth/useLogoutConfirm'
import SolarGridDashboard from '../components/dashboard/SolarGridDashboard'
import type { DashboardRole } from '../components/dashboard/dashboardConfig'

interface DashboardPageProps {
  defaultRole?: DashboardRole
}

export default function DashboardPage({ defaultRole }: DashboardPageProps) {
  const { auth } = useAuth()
  const { requestLogout, dialog } = useLogoutConfirm()

  // Determine initial role: prop override > auth role > default to Backoffice
  const resolvedRole: DashboardRole =
    defaultRole ||
    (auth?.role === 'GridOperator' ? 'GridOperator' : 'Backoffice')

  return (
    <>
      <SolarGridDashboard
        initialRole={resolvedRole}
        userDisplayName={auth?.displayName || (resolvedRole === 'Backoffice' ? 'System Administrator' : 'Kamal Gunaratne')}
        userNic={auth?.nic || undefined}
        onLogout={requestLogout}
      />
      {dialog}
    </>
  )
}
