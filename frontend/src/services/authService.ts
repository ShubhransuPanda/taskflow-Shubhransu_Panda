import { api } from '../lib/api'
import type { AuthResponse } from '../types/models'

export async function loginUser(email: string, password: string) {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  return data
}

export async function registerUser(name: string, email: string, password: string) {
  const { data } = await api.post<AuthResponse>('/auth/register', {
    name,
    email,
    password,
  })
  return data
}
