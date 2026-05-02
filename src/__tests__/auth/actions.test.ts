const mockSignOut = jest.fn(() => Promise.resolve({}))
const mockSupabaseClient = {
  auth: { signOut: mockSignOut },
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

const mockRevalidatePath = jest.fn()
jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const mockRedirect = jest.fn()
jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

import { logout } from '@/app/auth/actions'

describe('auth actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('logout', () => {
    it('calls supabase.auth.signOut()', async () => {
      await logout()
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('calls revalidatePath("/", "layout")', async () => {
      await logout()
      expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
    })

    it('calls redirect("/")', async () => {
      await logout()
      expect(mockRedirect).toHaveBeenCalledWith('/')
    })

    it('calls signOut before redirect', async () => {
      const callOrder: string[] = []
      mockSignOut.mockImplementation(async () => { callOrder.push('signOut'); return {} })
      mockRedirect.mockImplementation(() => { callOrder.push('redirect') })

      await logout()

      expect(callOrder.indexOf('signOut')).toBeLessThan(callOrder.indexOf('redirect'))
    })
  })
})
