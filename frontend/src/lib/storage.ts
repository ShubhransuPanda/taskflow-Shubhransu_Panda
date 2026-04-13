import type { ThemeMode, User } from '../types/models'

const AUTH_KEY = 'taskflow_auth'
const THEME_KEY = 'taskflow_theme'

interface StoredAuth {
  token: string
  user: User
}

export const authStorage = {
  get(): StoredAuth | null {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredAuth
    } catch {
      return null
    }
  },
  set(value: StoredAuth) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(value))
  },
  clear() {
    localStorage.removeItem(AUTH_KEY)
  },
}

export const themeStorage = {
  get(): ThemeMode {
    const raw = localStorage.getItem(THEME_KEY)
    return raw === 'dark' ? 'dark' : 'light'
  },
  set(mode: ThemeMode) {
    localStorage.setItem(THEME_KEY, mode)
  },
}
