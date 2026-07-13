import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'

const STORAGE_KEY = 'theme'

/**
 * useTheme keeps module-level singleton state, so each test resets the DOM +
 * storage and re-imports the module fresh to read the persisted value cleanly.
 */
async function freshTheme() {
  vi.resetModules()
  return import('@/composables/useTheme')
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to light when nothing is stored', async () => {
    const { useTheme } = await freshTheme()
    expect(useTheme().theme.value).toBe('light')
  })

  it('reads a persisted theme on load', async () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    const { useTheme } = await freshTheme()
    expect(useTheme().theme.value).toBe('dark')
  })

  it('initTheme applies the theme to <html>', async () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    const { initTheme } = await freshTheme()
    initTheme()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('toggleTheme flips the value, updates the DOM and persists', async () => {
    const { useTheme } = await freshTheme()
    const { theme, toggleTheme } = useTheme()

    toggleTheme()
    await nextTick()

    expect(theme.value).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('setTheme sets an explicit value', async () => {
    const { useTheme } = await freshTheme()
    const { theme, setTheme } = useTheme()

    setTheme('dark')
    await nextTick()
    setTheme('light')
    await nextTick()

    expect(theme.value).toBe('light')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light')
  })
})
