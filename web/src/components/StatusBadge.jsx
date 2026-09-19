const STATUS_STYLES = {
  Pending: { color: 'var(--color-status-pending)', label: 'Pending' },
  Approved: { color: 'var(--color-status-approved)', label: 'Approved' },
  Active: { color: 'var(--color-status-approved)', label: 'Active' },
  Completed: { color: 'var(--color-status-completed)', label: 'Completed' },
  Rejected: { color: 'var(--color-status-rejected)', label: 'Rejected' },
  Cancelled: { color: 'var(--color-status-cancelled)', label: 'Cancelled' },
  Deactivated: { color: 'var(--color-status-cancelled)', label: 'Deactivated' },
  Inactive: { color: 'var(--color-status-cancelled)', label: 'Inactive' },
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? { color: 'var(--color-border)', label: status }

  return (
    <span className="inline-flex items-center gap-2 text-body">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: style.color }}
        aria-hidden="true"
      />
      {style.label}
    </span>
  )
}
