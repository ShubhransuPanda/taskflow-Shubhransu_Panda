import { api } from '../lib/api'
import type { User } from '../types/models'

interface UsersResponse {
  users: User[]
}

export async function getUsers() {
  const { data } = await api.get<UsersResponse>('/users')
  return data.users
}
