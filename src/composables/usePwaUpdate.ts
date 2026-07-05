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
}

export function refreshPwa() {
  void applyUpdate?.(true)
}

export function dismissPwaUpdate() {
  pwaNeedRefresh.value = false
}
