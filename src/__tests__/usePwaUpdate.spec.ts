import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkForUpdatesOnResume } from '@/composables/usePwaUpdate'

function fakeRegistration(installing: unknown = null) {
  const update = vi.fn<() => Promise<void>>(() => Promise.resolve())
  const registration = { installing, update } as unknown as ServiceWorkerRegistration
  return { registration, update }
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true })
}

describe('checkForUpdatesOnResume', () => {
  afterEach(() => {
    setOnline(true)
  })

  it('checks for a new service worker when the app comes back to the foreground', () => {
    const { registration, update } = fakeRegistration()
    checkForUpdatesOnResume(registration)

    setVisibility('hidden')
    expect(update).not.toHaveBeenCalled()

    setVisibility('visible')
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('skips the check while offline or while an update is already installing', () => {
    const offline = fakeRegistration()
    checkForUpdatesOnResume(offline.registration)
    setOnline(false)
    setVisibility('visible')
    expect(offline.update).not.toHaveBeenCalled()

    setOnline(true)
    const installing = fakeRegistration({})
    checkForUpdatesOnResume(installing.registration)
    setVisibility('visible')
    expect(installing.update).not.toHaveBeenCalled()
  })

  it('swallows a failed check', async () => {
    const { registration, update } = fakeRegistration()
    update.mockRejectedValueOnce(new Error('offline'))
    checkForUpdatesOnResume(registration)

    expect(() => setVisibility('visible')).not.toThrow()
    await Promise.resolve()
  })
})
