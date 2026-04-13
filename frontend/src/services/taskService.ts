import { api } from '../lib/api'
import type { Task, TaskStatus } from '../types/models'

export interface TaskPayload {
  title: string
  description?: string
  status: Task['status']
  priority: Task['priority']
  assignee_id: string
  due_date: string
}

interface TasksResponse {
  tasks: Task[]
}

export async function getProjectTasks(
  projectId: string,
  filters: { status?: TaskStatus; assignee?: string },
) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.assignee) params.set('assignee', filters.assignee)
  const queryString = params.toString()
  const { data } = await api.get<TasksResponse>(
    `/projects/${projectId}/tasks${queryString ? `?${queryString}` : ''}`,
  )
  return data.tasks
}

export async function createTask(projectId: string, payload: TaskPayload) {
  const { data } = await api.post<Task>(`/projects/${projectId}/tasks`, payload)
  return data
}

export async function updateTask(taskId: string, payload: Partial<TaskPayload>) {
  const { data } = await api.patch<Task>(`/tasks/${taskId}`, payload)
  return data
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const { data } = await api.patch<Task>(`/tasks/${taskId}`, { status })
  return data
}

export async function deleteTask(taskId: string) {
  await api.delete(`/tasks/${taskId}`)
}
