import { render, screen } from '@testing-library/react'
import PageHeader from '@/components/PageHeader'

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Mijn Voorspelling" />)
    expect(screen.getByText('Mijn Voorspelling')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Title" subtitle="Some subtitle" />)
    expect(screen.getByText('Some subtitle')).toBeInTheDocument()
  })

  it('renders badge when provided', () => {
    render(<PageHeader title="Title" badge="WK 2026" />)
    expect(screen.getByText('WK 2026')).toBeInTheDocument()
  })

  it('renders countdown when provided', () => {
    render(<PageHeader title="Title" countdown={<div>Countdown here</div>} />)
    expect(screen.getByText('Countdown here')).toBeInTheDocument()
  })

  it('does not render subtitle when not provided', () => {
    const { container } = render(<PageHeader title="Title" />)
    // subtitle div is only rendered when subtitle prop exists
    expect(container.querySelectorAll('.text-white\\/70')).toHaveLength(0)
  })

  it('does not render badge when not provided', () => {
    render(<PageHeader title="Title" />)
    // badge is inside a span — verify it's not there
    expect(screen.queryByText('WK 2026')).not.toBeInTheDocument()
  })

  it('does not render countdown when not provided', () => {
    render(<PageHeader title="Title" />)
    expect(screen.queryByText('Countdown here')).not.toBeInTheDocument()
  })
})
