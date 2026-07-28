import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

export const pwaNeedRefresh = ref(false)

let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined

if (import.meta.env.PROD) {
  applyUpdate = registerSW({
    onNeedRefresh() {
      pwaNeedRefresh.value = true
    },
  })
  void dropStaleSupabaseCache()
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
