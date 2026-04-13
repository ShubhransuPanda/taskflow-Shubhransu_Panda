import axios from 'axios'
import { authStorage } from './storage'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const stored = authStorage.get()
  if (stored?.token) {
    config.headers.Authorization = `Bearer ${stored.token}`
  }
  return config
})
