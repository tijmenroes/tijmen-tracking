import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignIn = vi.hoisted(() => vi.fn())
const mockSignUp = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
    },
  },
}))

const { useAuth } = await import('@/composables/useAuth')

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signIn sets error on failure', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })

    const { error, signIn } = useAuth()
    await signIn('test@example.com', 'wrong')

    expect(error.value).toBe('Invalid credentials')
  })

  it('signIn clears error on success', async () => {
    mockSignIn.mockResolvedValue({ error: null })

    const { error, signIn } = useAuth()
    await signIn('test@example.com', 'correct')

    expect(error.value).toBeNull()
  })

  it('signUp sets error on failure', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Email already in use' } })

    const { error, signUp } = useAuth()
    await signUp('existing@example.com', 'password')

    expect(error.value).toBe('Email already in use')
  })

  it('signUp clears error on success', async () => {
    mockSignUp.mockResolvedValue({ error: null })

    const { error, signUp } = useAuth()
    await signUp('new@example.com', 'password')

    expect(error.value).toBeNull()
  })

  it('loading is false after signIn completes', async () => {
    mockSignIn.mockResolvedValue({ error: null })

    const { loading, signIn } = useAuth()
    await signIn('test@example.com', 'password')

    expect(loading.value).toBe(false)
  })
})
