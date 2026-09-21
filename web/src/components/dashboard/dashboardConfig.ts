export type DashboardRole = 'Backoffice' | 'GridOperator'

export interface NavSubItem {
  id: string
  label: string
  badge?: string | number
}

export interface NavMenuItem {
  id: string
  label: string
  icon: string
  path?: string
  badge?: string | number
  badgeColor?: 'primary' | 'amber' | 'blue' | 'red'
  subItems?: NavSubItem[]
}

export interface KpiMetric {
  id: string
  title: string
  value: string | number
  subtitle: string
  changeText?: string
  isPositive?: boolean
  requiresAttention?: boolean
  icon: string
  colorTheme: 'blue' | 'amber' | 'emerald' | 'purple'
  targetTab?: string
}

export interface ReservationStats {
  pending: number
  approved: number
  completed: number
  rejected: number
  cancelled: number
  chartData: { day: string; count: number; heightPercent: number }[]
}

export interface StationItem {
  id: string
  code: string
  name: string
  location: string
  status: 'Active' | 'Inactive'
  slots: number
  powerType: 'AC 230V' | 'DC Fast' | 'Hybrid 400V'
  operatingHours: string
}

export interface ProsumerRequest {
  id: string
  name: string
  nic: string
  registeredDate: string
  status: 'Pending' | 'Active' | 'Deactivated'
  phone: string
  email: string
  address: string
  solarCapacityKw: number
  inverterModel: string
  cebAccountNo: string
}

export interface RecentActivityItem {
  id: string
  title: string
  description?: string
  timeAgo: string
  type: 'activation' | 'registration' | 'deactivation' | 'station' | 'operator'
}

export interface RoleDashboardConfig {
  role: DashboardRole
  roleDisplayName: string
  roleTitle: string
  greetingSubtitle: string
  navItems: NavMenuItem[]
  kpis: KpiMetric[]
  quickActions: { id: string; label: string; icon: string; actionType: string }[]
}

export const ADMIN_CONFIG: RoleDashboardConfig = {
  role: 'Backoffice',
  roleDisplayName: 'Admin',
  roleTitle: 'System Administrator',
  greetingSubtitle: "Here's an overview of the SolarGrid system.",
  navItems: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'home',
    },
    {
      id: 'users',
      label: 'Users',
      icon: 'users',
      subItems: [
        { id: 'all-users', label: 'All Users' },
        { id: 'prosumer-requests', label: 'Prosumer Requests', badge: 12 },
        { id: 'operators', label: 'Operators' },
      ],
    },
    {
      id: 'stations',
      label: 'Stations',
      icon: 'zap',
      badge: '18 Total',
    },
    {
      id: 'slots',
      label: 'Slots',
      icon: 'clock',
    },
    {
      id: 'prosumers',
      label: 'Prosumer Requests',
      icon: 'clipboard-list',
      badge: 12,
      badgeColor: 'amber',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
    },
  ],
  kpis: [
    {
      id: 'total-users',
      title: 'Total Users',
      value: '128',
      subtitle: '+8 this month',
      changeText: '+8 this month',
      isPositive: true,
      icon: 'users',
      colorTheme: 'blue',
      targetTab: 'users',
    },
    {
      id: 'pending-prosumers',
      title: 'Pending Prosumer Requests',
      value: '12',
      subtitle: 'Requires attention',
      requiresAttention: true,
      icon: 'user-check',
      colorTheme: 'amber',
      targetTab: 'prosumers',
    },
    {
      id: 'total-stations',
      title: 'Total Stations',
      value: '18',
      subtitle: '15 Active • 3 Inactive',
      icon: 'zap',
      colorTheme: 'purple',
      targetTab: 'stations',
    },
    {
      id: 'active-stations',
      title: 'Active Stations',
      value: '15',
      subtitle: '83% operational',
      isPositive: true,
      icon: 'check-circle',
      colorTheme: 'emerald',
      targetTab: 'stations',
    },
  ],
  quickActions: [
    { id: 'create-user', label: 'Create User', icon: 'user-plus', actionType: 'createUser' },
    { id: 'add-station', label: 'Add Station', icon: 'zap', actionType: 'addStation' },
    { id: 'review-prosumers', label: 'Review Prosumer Requests', icon: 'user-check', actionType: 'reviewProsumers' },
    { id: 'manage-slots', label: 'Manage Slots', icon: 'clock', actionType: 'manageSlots' },
  ],
}

export const OPERATOR_CONFIG: RoleDashboardConfig = {
  role: 'GridOperator',
  roleDisplayName: 'Operator',
  roleTitle: 'Grid Dispatch Operator',
  greetingSubtitle: "Here is your live station queue and microgrid dispatch telemetry.",
  navItems: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'home',
    },
    {
      id: 'queue',
      label: "Today's Queue",
      icon: 'clipboard-list',
      badge: 5,
      badgeColor: 'primary',
    },
    {
      id: 'stations',
      label: 'Assigned Station',
      icon: 'zap',
    },
    {
      id: 'slots',
      label: 'Slot Availability',
      icon: 'clock',
    },
    {
      id: 'transfers',
      label: 'Energy Transfers',
      icon: 'activity',
    },
    {
      id: 'settings',
      label: 'Terminal Settings',
      icon: 'settings',
    },
  ],
  kpis: [
    {
      id: 'today-reservations',
      title: "Today's Reservations",
      value: '24',
      subtitle: '8 Completed • 5 Active',
      isPositive: true,
      icon: 'calendar',
      colorTheme: 'blue',
      targetTab: 'queue',
    },
    {
      id: 'active-charging',
      title: 'Active Transfers',
      value: '6',
      subtitle: 'Peak microgrid draw',
      requiresAttention: false,
      icon: 'zap',
      colorTheme: 'amber',
      targetTab: 'transfers',
    },
    {
      id: 'total-dispatched',
      title: 'Dispatched Energy',
      value: '348 kWh',
      subtitle: '14% vs yesterday',
      isPositive: true,
      icon: 'activity',
      colorTheme: 'emerald',
      targetTab: 'dashboard',
    },
    {
      id: 'station-health',
      title: 'Feeder Status',
      value: 'Nominal',
      subtitle: '50.02 Hz • 230V Synced',
      isPositive: true,
      icon: 'check-circle',
      colorTheme: 'purple',
      targetTab: 'stations',
    },
  ],
  quickActions: [
    { id: 'scan-qr', label: 'Scan Reservation QR', icon: 'qr-code', actionType: 'scanQr' },
    { id: 'dispatch-energy', label: 'Dispatch Feeder Flow', icon: 'zap', actionType: 'dispatchEnergy' },
    { id: 'view-queue', label: "Today's Queue", icon: 'list', actionType: 'viewQueue' },
    { id: 'emergency-cutoff', label: 'Safe Grid Isolation', icon: 'alert-triangle', actionType: 'emergencyCutoff' },
  ],
}

export const INITIAL_RESERVATION_STATS: ReservationStats = {
  pending: 12,
  approved: 34,
  completed: 87,
  rejected: 5,
  cancelled: 8,
  chartData: [
    { day: 'Mon', count: 42, heightPercent: 48 },
    { day: 'Tue', count: 65, heightPercent: 74 },
    { day: 'Wed', count: 88, heightPercent: 100 },
    { day: 'Thu', count: 58, heightPercent: 66 },
    { day: 'Fri', count: 76, heightPercent: 86 },
    { day: 'Sat', count: 50, heightPercent: 57 },
    { day: 'Sun', count: 35, heightPercent: 40 },
  ],
}

export const INITIAL_STATIONS: StationItem[] = [
  {
    id: 'st-001',
    code: 'Node 001',
    name: 'Node 001 - Malabe',
    location: 'Malabe Distribution Substation, Kaduwela Rd',
    status: 'Active',
    slots: 12,
    powerType: 'AC 230V',
    operatingHours: '08:00 - 18:00',
  },
  {
    id: 'st-002',
    code: 'Node 002',
    name: 'Node 002 - Kaduwela',
    location: 'Kaduwela Microgrid Feeder Hub',
    status: 'Active',
    slots: 8,
    powerType: 'DC Fast',
    operatingHours: '06:00 - 20:00',
  },
  {
    id: 'st-003',
    code: 'Node 003',
    name: 'Node 003 - Matara',
    location: 'Matara Southern Coastal Grid Substation',
    status: 'Inactive',
    slots: 6,
    powerType: 'Hybrid 400V',
    operatingHours: 'Maintenance Mode',
  },
  {
    id: 'st-004',
    code: 'Node 004',
    name: 'Node 004 - Kandy Central',
    location: 'Peradeniya Inverter Interconnect',
    status: 'Active',
    slots: 10,
    powerType: 'AC 230V',
    operatingHours: '07:00 - 19:00',
  },
]

export const INITIAL_PROSUMERS: ProsumerRequest[] = [
  {
    id: 'pro-001',
    name: 'Amal Perera',
    nic: '199923456789',
    registeredDate: 'Sep 20, 2026',
    status: 'Pending',
    phone: '+94 77 123 4567',
    email: 'amal.perera@example.com',
    address: 'No 45, Temple Road, Malabe',
    solarCapacityKw: 5.4,
    inverterModel: 'Huawei SUN2000-5KTL',
    cebAccountNo: 'CEB-098234-MB',
  },
  {
    id: 'pro-002',
    name: 'Kasun Silva',
    nic: '200012345678',
    registeredDate: 'Sep 20, 2026',
    status: 'Pending',
    phone: '+94 71 987 6543',
    email: 'kasun.silva@example.com',
    address: '12/A, Station Road, Kaduwela',
    solarCapacityKw: 8.2,
    inverterModel: 'SMA Sunny Boy 8.0',
    cebAccountNo: 'CEB-112093-KD',
  },
  {
    id: 'pro-003',
    name: 'Nimal Perera',
    nic: '199812345678',
    registeredDate: 'Sep 19, 2026',
    status: 'Pending',
    phone: '+94 76 555 1234',
    email: 'nimal.perera@example.com',
    address: 'No 88, Galle Road, Matara',
    solarCapacityKw: 4.8,
    inverterModel: 'Growatt MIN 5000TL-X',
    cebAccountNo: 'CEB-449120-MT',
  },
  {
    id: 'pro-004',
    name: 'Dilani Samarawickrama',
    nic: '199554321987',
    registeredDate: 'Sep 18, 2026',
    status: 'Active',
    phone: '+94 77 889 9001',
    email: 'dilani.s@example.com',
    address: '24/1, Lake Drive, Colombo 07',
    solarCapacityKw: 10.0,
    inverterModel: 'Fronius Primo 10.0-1',
    cebAccountNo: 'CEB-772134-C7',
  },
]

export const INITIAL_ACTIVITY: RecentActivityItem[] = [
  {
    id: 'act-1',
    title: 'Prosumer Amal Perera was activated',
    description: 'Account verified and allowed rooftop solar exports',
    timeAgo: '10 minutes ago',
    type: 'activation',
  },
  {
    id: 'act-2',
    title: 'Node 002 - Kaduwela was activated',
    description: 'DC Fast Charging station online after transformer service',
    timeAgo: '32 minutes ago',
    type: 'station',
  },
  {
    id: 'act-3',
    title: 'New prosumer registration received',
    description: 'Kasun Silva submitted 8.2 kW rooftop PV profile',
    timeAgo: '1 hour ago',
    type: 'registration',
  },
  {
    id: 'act-4',
    title: 'Operator account created',
    description: 'Grid operator terminal credentials provisioned for Kamal Gunaratne',
    timeAgo: '2 hours ago',
    type: 'operator',
  },
  {
    id: 'act-5',
    title: 'Node 003 was deactivated',
    description: 'Matara Southern coastal node scheduled for maintenance',
    timeAgo: 'Yesterday',
    type: 'deactivation',
  },
]
