import { render, screen, fireEvent } from '@testing-library/react'
import AdminSyncLogs, { SyncLog } from '@/components/AdminSyncLogs'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({ delete: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })) })),
  })),
}))

const baseLog = (overrides: Partial<SyncLog> = {}): SyncLog => ({
  id: 1,
  ran_at: '2025-06-01T10:00:00.000Z',
  status: 'success',
  message: 'Sync completed',
  updated: 3,
  skipped: 1,
  unmatched: 0,
  details: null,
  triggered_by: 'cron',
  ...overrides,
})

describe('AdminSyncLogs', () => {
  it('renders empty state when no logs', () => {
    render(<AdminSyncLogs logs={[]} />)
    expect(screen.getByText(/Nog geen synchronisaties uitgevoerd/)).toBeInTheDocument()
    expect(screen.getByText(/cronjob draait dagelijks/)).toBeInTheDocument()
  })

  it('renders logs when provided', () => {
    render(<AdminSyncLogs logs={[baseLog()]} />)
    expect(screen.getByText('Sync completed')).toBeInTheDocument()
  })

  it('shows success status icon and label', () => {
    render(<AdminSyncLogs logs={[baseLog({ status: 'success' })]} />)
    // STATUS_CONFIG success label appears in the log row
    expect(screen.getAllByText('Bijgewerkt').length).toBeGreaterThan(0)
  })

  it('shows none status icon and label', () => {
    render(<AdminSyncLogs logs={[baseLog({ status: 'none', updated: 0 })]} />)
    expect(screen.getAllByText('Geen nieuws').length).toBeGreaterThan(0)
  })

  it('shows error status icon and label', () => {
    render(<AdminSyncLogs logs={[baseLog({ status: 'error', updated: 0 })]} />)
    expect(screen.getAllByText('Fout').length).toBeGreaterThan(0)
  })

  it('shows triggered_by admin as handmatig', () => {
    render(<AdminSyncLogs logs={[baseLog({ triggered_by: 'admin' })]} />)
    expect(screen.getByText(/Handmatig/)).toBeInTheDocument()
  })

  it('shows triggered_by cron as automatisch', () => {
    render(<AdminSyncLogs logs={[baseLog({ triggered_by: 'cron' })]} />)
    expect(screen.getByText(/Automatisch/)).toBeInTheDocument()
  })

  it('shows lastSuccess date when a success log exists', () => {
    const logs = [baseLog({ status: 'success', updated: 2 })]
    render(<AdminSyncLogs logs={logs} />)
    // The "Laatste uitslagen bijgewerkt" panel should show date (not em dash)
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('shows em dash for lastSuccess when no success log exists', () => {
    const logs = [baseLog({ status: 'none', updated: 0 })]
    render(<AdminSyncLogs logs={logs} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows updated count with plural suffix when updated !== 1', () => {
    const logs = [baseLog({ status: 'success', updated: 2 })]
    render(<AdminSyncLogs logs={logs} />)
    // "2 uitslagen" (plural)
    expect(screen.getByText(/2 uitslag/)).toBeInTheDocument()
  })

  it('shows updated count with singular suffix when updated === 1', () => {
    const logs = [baseLog({ status: 'success', updated: 1 })]
    render(<AdminSyncLogs logs={logs} />)
    // "1 uitslag" but NOT "1 uitslagen"
    const el = screen.getByText(/1 uitslag/)
    expect(el.textContent).not.toContain('uitslagen')
  })

  it('shows unmatched count when unmatched > 0 in success row', () => {
    const logs = [baseLog({ status: 'success', unmatched: 2 })]
    render(<AdminSyncLogs logs={logs} />)
    expect(screen.getByText(/2 niet gekoppeld/)).toBeInTheDocument()
  })

  it('does not show unmatched text when unmatched === 0', () => {
    const logs = [baseLog({ status: 'success', unmatched: 0 })]
    render(<AdminSyncLogs logs={logs} />)
    expect(screen.queryByText(/niet gekoppeld/)).not.toBeInTheDocument()
  })

  it('does not show expand arrow when log has no details', () => {
    const logs = [baseLog({ details: null })]
    render(<AdminSyncLogs logs={logs} />)
    expect(screen.queryByText('▼')).not.toBeInTheDocument()
    expect(screen.queryByText('▲')).not.toBeInTheDocument()
  })

  it('does not show expand arrow when details is empty array', () => {
    const logs = [baseLog({ details: [] })]
    render(<AdminSyncLogs logs={logs} />)
    expect(screen.queryByText('▼')).not.toBeInTheDocument()
  })

  it('shows expand arrow (▼) when log has details', () => {
    const logs = [baseLog({ details: ['line 1', 'line 2'] })]
    render(<AdminSyncLogs logs={logs} />)
    expect(screen.getByText('▼')).toBeInTheDocument()
  })

  it('expands details on click showing detail lines', () => {
    const logs = [baseLog({ details: ['line 1', 'line 2'] })]
    render(<AdminSyncLogs logs={logs} />)

    // Click the row to expand
    fireEvent.click(screen.getByText('▼').closest('div')!)
    expect(screen.getByText('line 1')).toBeInTheDocument()
    expect(screen.getByText('line 2')).toBeInTheDocument()
    // Arrow flips to ▲
    expect(screen.getByText('▲')).toBeInTheDocument()
  })

  it('collapses expanded details on second click', () => {
    const logs = [baseLog({ details: ['line 1'] })]
    render(<AdminSyncLogs logs={logs} />)

    // Expand by clicking the ▼ arrow's parent div
    const getClickTarget = () => {
      const down = screen.queryByText('▼')
      const up = screen.queryByText('▲')
      const arrow = down ?? up
      return arrow!.closest('div')!
    }

    // Expand
    fireEvent.click(getClickTarget())
    expect(screen.getByText('line 1')).toBeInTheDocument()

    // Collapse — now arrow shows ▲
    fireEvent.click(getClickTarget())
    expect(screen.queryByText('line 1')).not.toBeInTheDocument()
    expect(screen.getByText('▼')).toBeInTheDocument()
  })

  it('clicking a row without details does nothing (no expand)', () => {
    const logs = [baseLog({ details: null })]
    render(<AdminSyncLogs logs={logs} />)
    // Click the row div - should not crash and no arrow appears
    const rowContent = screen.getByText('Sync completed').closest('div')!
    fireEvent.click(rowContent)
    expect(screen.queryByText('▼')).not.toBeInTheDocument()
    expect(screen.queryByText('▲')).not.toBeInTheDocument()
  })

  it('renders multiple logs', () => {
    const logs = [
      baseLog({ id: 1, status: 'success', message: 'First sync' }),
      baseLog({ id: 2, status: 'none', message: 'Second sync', updated: 0 }),
      baseLog({ id: 3, status: 'error', message: 'Third sync', updated: 0 }),
    ]
    render(<AdminSyncLogs logs={logs} />)
    expect(screen.getByText('First sync')).toBeInTheDocument()
    expect(screen.getByText('Second sync')).toBeInTheDocument()
    expect(screen.getByText('Third sync')).toBeInTheDocument()
  })

  it('lastSuccess banner shows update count with plural', () => {
    const logs = [baseLog({ status: 'success', updated: 5 })]
    render(<AdminSyncLogs logs={logs} />)
    expect(screen.getByText(/5 uitslagen/)).toBeInTheDocument()
  })

  it('lastSuccess banner shows update count singular', () => {
    const logs = [baseLog({ status: 'success', updated: 1 })]
    render(<AdminSyncLogs logs={logs} />)
    const matches = screen.getAllByText(/1 uitslag/)
    expect(matches.length).toBeGreaterThan(0)
  })
})
