import { render, screen, fireEvent } from '@testing-library/react'
import AdminTabsLayout from '@/components/AdminTabsLayout'

const tabs = [
  { key: 'tab1', label: 'Tab One' },
  { key: 'tab2', label: 'Tab Two' },
  { key: 'tab3', label: 'Tab Three', badge: 5 },
]

const children = [
  <div key="tab1">Content One</div>,
  <div key="tab2">Content Two</div>,
  <div key="tab3">Content Three</div>,
]

describe('AdminTabsLayout', () => {
  it('renders all tab labels', () => {
    render(<AdminTabsLayout tabs={tabs}>{children}</AdminTabsLayout>)
    expect(screen.getByText('Tab One')).toBeInTheDocument()
    expect(screen.getByText('Tab Two')).toBeInTheDocument()
    expect(screen.getByText('Tab Three')).toBeInTheDocument()
  })

  it('shows first tab content by default', () => {
    render(<AdminTabsLayout tabs={tabs}>{children}</AdminTabsLayout>)
    expect(screen.getByText('Content One')).toBeInTheDocument()
    expect(screen.queryByText('Content Two')).not.toBeInTheDocument()
    expect(screen.queryByText('Content Three')).not.toBeInTheDocument()
  })

  it('switches to second tab on click', () => {
    render(<AdminTabsLayout tabs={tabs}>{children}</AdminTabsLayout>)
    fireEvent.click(screen.getByText('Tab Two'))
    expect(screen.queryByText('Content One')).not.toBeInTheDocument()
    expect(screen.getByText('Content Two')).toBeInTheDocument()
  })

  it('switches to third tab on click', () => {
    render(<AdminTabsLayout tabs={tabs}>{children}</AdminTabsLayout>)
    fireEvent.click(screen.getByText('Tab Three'))
    expect(screen.getByText('Content Three')).toBeInTheDocument()
    expect(screen.queryByText('Content One')).not.toBeInTheDocument()
  })

  it('shows badge when badge > 0', () => {
    render(<AdminTabsLayout tabs={tabs}>{children}</AdminTabsLayout>)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('hides badge when badge is 0', () => {
    const tabsWithZeroBadge = [
      { key: 'tab1', label: 'Tab One', badge: 0 },
      { key: 'tab2', label: 'Tab Two' },
    ]
    render(
      <AdminTabsLayout tabs={tabsWithZeroBadge}>
        <div key="tab1">Content One</div>
        <div key="tab2">Content Two</div>
      </AdminTabsLayout>
    )
    // badge span should not be rendered; no numeric text node
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('hides badge when badge is undefined', () => {
    const tabsNoBadge = [
      { key: 'tab1', label: 'Tab One' },
      { key: 'tab2', label: 'Tab Two' },
    ]
    render(
      <AdminTabsLayout tabs={tabsNoBadge}>
        <div key="tab1">Content One</div>
        <div key="tab2">Content Two</div>
      </AdminTabsLayout>
    )
    // Only labels present; no extra badge spans
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('renders correct child for each tab', () => {
    render(<AdminTabsLayout tabs={tabs}>{children}</AdminTabsLayout>)

    // Tab 1 active by default
    expect(screen.getByText('Content One')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Tab Two'))
    expect(screen.getByText('Content Two')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Tab Three'))
    expect(screen.getByText('Content Three')).toBeInTheDocument()
  })
})
