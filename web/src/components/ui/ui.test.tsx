import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, ConfirmDialog, DataTable, EmptyState, ErrorAlert, StatusBadge, type Column } from '.'

describe('Button', () => {
  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Approve</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('is disabled and announces busy while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    )
    const button = screen.getByRole('button', { name: /Saving/ })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not set aria-busy when idle', () => {
    render(<Button>Idle</Button>)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy')
  })
})

describe('StatusBadge', () => {
  it.each(['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled', 'Active', 'Deactivated'])(
    'shows the %s label as text, so colour is never the only signal',
    (status) => {
      render(<StatusBadge status={status} />)
      expect(screen.getByText(status)).toBeInTheDocument()
    },
  )

  it('still renders an unknown status', () => {
    render(<StatusBadge status="Mystery" />)
    expect(screen.getByText('Mystery')).toBeInTheDocument()
  })
})

describe('ErrorAlert', () => {
  const error = {
    status: 400,
    code: 'RESERVATION_WINDOW_EXCEEDED',
    message: 'Reservations must be scheduled within 7 days.',
    details: ['reservationDate: 12 days from today'],
  }

  it('renders nothing without an error', () => {
    const { container } = render(<ErrorAlert error={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the message, then the details underneath', () => {
    render(<ErrorAlert error={error} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(error.message)).toBeInTheDocument()
    expect(screen.getByText(error.details[0])).toBeInTheDocument()
  })

  it('omits the details list when there are none', () => {
    render(<ErrorAlert error={{ ...error, details: [] }} />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('offers retry and dismiss only when handlers are given', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(<ErrorAlert error={error} />)
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()

    rerender(<ErrorAlert error={error} onRetry={onRetry} onDismiss={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('shows the title, description and action', () => {
    render(<EmptyState title="No reservations yet" description="Bookings will appear here." action={<button>Refresh</button>} />)

    expect(screen.getByText('No reservations yet')).toBeInTheDocument()
    expect(screen.getByText('Bookings will appear here.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })
})

describe('ConfirmDialog', () => {
  function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Cancel reservation?"
        message="This frees the slot."
        confirmLabel="Yes, cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />,
    )
    return { onConfirm, onCancel }
  }

  it('renders nothing while closed', () => {
    setup({ open: false })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('is an alertdialog with a title and message', () => {
    setup()

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Cancel reservation?')).toBeInTheDocument()
    expect(screen.getByText('This frees the slot.')).toBeInTheDocument()
  })

  it('confirms and cancels through their own buttons', async () => {
    const { onConfirm, onCancel } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }))
    expect(onConfirm).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('closes on Escape', async () => {
    const { onCancel } = setup()

    await userEvent.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalled()
  })

  it('cannot be dismissed with Escape while busy', async () => {
    const { onCancel } = setup({ busy: true })

    await userEvent.keyboard('{Escape}')

    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})

describe('DataTable', () => {
  interface Row {
    id: string
    name: string
  }
  const columns: Column<Row>[] = [{ key: 'name', header: 'Name', render: (row) => row.name }]
  const rows: Row[] = [
    { id: '1', name: 'Negombo' },
    { id: '2', name: 'Kandy' },
  ]

  it('renders a header and a cell per row', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />)

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getAllByText('Negombo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Kandy').length).toBeGreaterThan(0)
  })

  it('shows the empty slot instead of a table when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(row) => row.id} empty={<p>Nothing booked</p>} />)

    expect(screen.getByText('Nothing booked')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows skeleton rows, not data, while loading', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} loading />)

    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Negombo')).not.toBeInTheDocument()
  })

  it('does not show the empty slot while loading', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(row) => row.id} loading empty={<p>Nothing booked</p>} />)
    expect(screen.queryByText('Nothing booked')).not.toBeInTheDocument()
  })

  it('makes rows clickable and keyboard reachable when onRowClick is given', async () => {
    const onRowClick = vi.fn()
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} onRowClick={onRowClick} rowLabel={(row) => `Open ${row.name}`} />)

    const [row] = screen.getAllByRole('link', { name: 'Open Negombo' })
    await userEvent.click(row)
    expect(onRowClick).toHaveBeenLastCalledWith(rows[0])

    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenCalledTimes(2)
  })

  it('has no link rows when rows are not clickable', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
