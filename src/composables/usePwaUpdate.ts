import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

export const pwaNeedRefresh = ref(false)

let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined

if (import.meta.env.PROD) {
  applyUpdate = registerSW({
    onNeedRefresh() {
      pwaNeedRefresh.value = true
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration) checkForUpdatesOnResume(registration)
    },
  })
  void dropStaleSupabaseCache()
}

/**
 * A home screen app is resumed from memory rather than reloaded, and the browser
 * only looks for a new service worker on navigation — so an old build could stay
 * open for days. Check again whenever the app comes back to the foreground.
 */
export function checkForUpdatesOnResume(registration: ServiceWorkerRegistration) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (registration.installing || !navigator.onLine) return
    registration.update().catch(() => {
      // Offline or a flaky network — the next resume tries again.
    })
  })
}

/**
 * Older builds cached Supabase read queries stale-while-revalidate, which could
 * surface yesterday's data right after logging something. That runtime cache is
 * no longer written to, but it survives a service worker update — so drop it.
 */
async function dropStaleSupabaseCache() {
  if (!('caches' in globalThis)) return
  try {
    await caches.delete('supabase-rest')
  } catch {
    // Storage may be unavailable (private mode, quota) — nothing to recover from.
  }
}

export function refreshPwa() {
  void applyUpdate?.(true)
}

export function dismissPwaUpdate() {
  pwaNeedRefresh.value = false
}
