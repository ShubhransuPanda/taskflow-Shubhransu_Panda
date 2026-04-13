export type ThemeMode = 'light' | 'dark'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ProjectStatus = 'planned' | 'active' | 'completed'
export type ProjectPriority = 'low' | 'medium' | 'high'

export interface User {
  id: string
  name: string
  email: string
  project_count?: number
  task_count?: number
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  priority: ProjectPriority
  due_date: string
  tags: string[]
  owner_id: string
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string
  due_date: string
  created_at: string
  updated_at: string
}

export interface ProjectDetail extends Project {
  tasks: Task[]
}
