import { api } from '../lib/api'
import type { Project, ProjectDetail } from '../types/models'

export interface ProjectPayload {
  name: string
  description?: string
  status: Project['status']
  priority: Project['priority']
  due_date: string
  tags: string[]
}

interface ProjectsResponse {
  projects: Project[]
}

const normalizeProject = (project: Project): Project => ({
  ...project,
  status: project.status ?? 'planned',
  priority: project.priority ?? 'medium',
  due_date: project.due_date ?? '',
  tags: Array.isArray(project.tags) ? project.tags : [],
})

export async function getProjects() {
  const { data } = await api.get<ProjectsResponse>('/projects')
  return data.projects.map(normalizeProject)
}

export async function createProject(payload: ProjectPayload) {
  const { data } = await api.post<Project>('/projects', payload)
  return normalizeProject(data)
}

export async function updateProject(projectId: string, payload: ProjectPayload) {
  const { data } = await api.patch<Project>(`/projects/${projectId}`, payload)
  return normalizeProject(data)
}

export async function deleteProject(projectId: string) {
  await api.delete(`/projects/${projectId}`)
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  const { data } = await api.get<ProjectDetail>(`/projects/${projectId}`)
  return {
    ...normalizeProject(data),
    tasks: data.tasks,
  }
}
