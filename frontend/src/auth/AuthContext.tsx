import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authStorage } from '../lib/storage'
import type { AuthResponse, User } from '../types/models'
import { loginUser, registerUser } from '../services/authService'

interface AuthContextValue {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = authStorage.get()
  const [token, setToken] = useState<string | null>(initial?.token ?? null)
  const [user, setUser] = useState<User | null>(initial?.user ?? null)

  const setAuth = useCallback((data: AuthResponse) => {
    setToken(data.token)
    setUser(data.user)
    authStorage.set({ token: data.token, user: data.user })
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await loginUser(email, password)
      setAuth(data)
    },
    [setAuth],
  )

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await registerUser(name, email, password)
      setAuth(data)
    },
    [setAuth],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    authStorage.clear()
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
    }),
    [token, user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
