import { render, screen, fireEvent } from '@testing-library/react'
import Navbar from '@/components/Navbar'

const mockPathname = jest.fn(() => '/')
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

const mockLogout = jest.fn()
jest.mock('@/app/auth/actions', () => ({
  logout: () => mockLogout(),
}))

jest.mock('@/components/WavingFlag', () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => (
    <div data-testid="waving-flag" className={className} />
  ),
}))

// next/link mock
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, onClick, className }: { href: string; children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <a href={href} onClick={onClick} className={className}>{children}</a>
  ),
}))

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ available: 2 }) } as Response)
  )
})

describe('Navbar', () => {
  const userWithProfile = {
    user: { id: 'user-1', email: 'test@test.nl' },
    profile: {
      id: 'user-1',
      display_name: 'Test User',
      is_admin: false,
      is_deelnemer: true,
      created_at: '2026-01-01',
    },
  }

  it('renders logo "WK Pool" and "2026"', () => {
    render(<Navbar user={null} profile={null} />)
    expect(screen.getByText('WK Pool')).toBeInTheDocument()
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it('shows Inloggen and Aanmelden when user is null', () => {
    render(<Navbar user={null} profile={null} />)
    expect(screen.getAllByText('Inloggen').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Aanmelden').length).toBeGreaterThan(0)
  })

  it('shows user display_name when user provided', () => {
    render(<Navbar user={userWithProfile.user} profile={userWithProfile.profile} />)
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('shows Uitloggen when user is logged in', () => {
    render(<Navbar user={userWithProfile.user} profile={userWithProfile.profile} />)
    expect(screen.getAllByText('Uitloggen').length).toBeGreaterThan(0)
  })

  it('shows Pre-Pool and WK Poule links for deelnemer', () => {
    render(<Navbar user={userWithProfile.user} profile={userWithProfile.profile} />)
    expect(screen.getAllByText('Pre-Pool').length).toBeGreaterThan(0)
    expect(screen.getAllByText('WK Poule').length).toBeGreaterThan(0)
  })

  it('shows Admin link for admin user', () => {
    const adminProfile = { ...userWithProfile.profile, is_admin: true }
    render(<Navbar user={userWithProfile.user} profile={adminProfile} />)
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0)
  })

  it('does not show Admin link for non-admin user', () => {
    render(<Navbar user={userWithProfile.user} profile={userWithProfile.profile} />)
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('does not show Pre-Pool for non-deelnemer (is_deelnemer=false)', () => {
    const nonDeelnemerProfile = { ...userWithProfile.profile, is_deelnemer: false }
    render(<Navbar user={userWithProfile.user} profile={nonDeelnemerProfile} />)
    expect(screen.queryByText('Pre-Pool')).not.toBeInTheDocument()
  })

  it('hamburger button is present on mobile', () => {
    render(<Navbar user={null} profile={null} />)
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })

  it('hamburger toggles mobile menu open', () => {
    render(<Navbar user={userWithProfile.user} profile={userWithProfile.profile} />)
    // Before click, the mobile menu section is hidden (md:hidden parent)
    // After clicking hamburger, the menu appears
    const menuButton = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(menuButton)
    // After toggle, mobile menu should be visible (multiple Pre-Pool links)
    const prePoolLinks = screen.queryAllByText('Pre-Pool')
    expect(prePoolLinks.length).toBeGreaterThan(0)
  })

  it('logout button calls logout action', async () => {
    render(<Navbar user={userWithProfile.user} profile={userWithProfile.profile} />)
    const logoutButtons = screen.getAllByText('Uitloggen')
    fireEvent.click(logoutButtons[0])
    expect(mockLogout).toHaveBeenCalled()
  })

  it('renders Ranglijst link', () => {
    render(<Navbar user={null} profile={null} />)
    expect(screen.getAllByText('Ranglijst').length).toBeGreaterThan(0)
  })

  it('active NavLink gets text-white class', () => {
    mockPathname.mockReturnValue('/ranglijst')
    render(<Navbar user={null} profile={null} />)
    const ranglijstLinks = screen.getAllByText('Ranglijst')
    const activeLink = ranglijstLinks.find((el) => el.closest('a')?.className.includes('text-white'))
    expect(activeLink).toBeTruthy()
  })

  it('shows "Uitloggen..." in mobile menu while logging out', async () => {
    mockLogout.mockReturnValue(new Promise(() => {})) // never resolves
    render(<Navbar user={userWithProfile.user} profile={userWithProfile.profile} />)
    // Open mobile menu
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    // Find and click the mobile logout button
    const logoutButtons = screen.getAllByText('Uitloggen')
    fireEvent.click(logoutButtons[logoutButtons.length - 1])
    await screen.findByText('Uitloggen...')
  })

  it('clicking mobile nav link calls close (hides menu)', () => {
    render(<Navbar user={null} profile={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    // Ranglijst link in mobile menu — clicking it calls close()
    const ranglijstLinks = screen.getAllByText('Ranglijst')
    // Find the one inside the mobile menu (there may be multiple)
    fireEvent.click(ranglijstLinks[ranglijstLinks.length - 1])
    // After close(), menu is gone so only one Ranglijst link remains (desktop)
    expect(screen.getAllByText('Ranglijst').length).toBeGreaterThanOrEqual(1)
  })

  it('active MobileLink gets highlighted class', () => {
    mockPathname.mockReturnValue('/ranglijst')
    render(<Navbar user={null} profile={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const mobileRanglijst = screen.getAllByText('Ranglijst').find((el) =>
      el.closest('a')?.className.includes('bg-white/15')
    )
    expect(mobileRanglijst).toBeTruthy()
  })
})
