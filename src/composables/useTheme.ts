import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const DEFAULT_THEME: Theme = 'light' // the current design is light mode

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage can throw in private mode / restricted contexts — fall back.
  }
  return DEFAULT_THEME
}

function persist(value: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Best-effort; ignore storage failures.
  }
}

function applyToDom(value: Theme) {
  document.documentElement.setAttribute('data-theme', value)
}

// Module-level singleton so every caller shares one reactive source of truth.
const theme = ref<Theme>(readStoredTheme())

watch(theme, (value) => {
  applyToDom(value)
  persist(value)
})

/** Apply the persisted theme to <html>. Call once at app startup. */
export function initTheme() {
  applyToDom(theme.value)
}

export function useTheme() {
  function setTheme(value: Theme) {
    theme.value = value
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return { theme, setTheme, toggleTheme }
}
