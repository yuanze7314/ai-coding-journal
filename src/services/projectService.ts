import { mockProjects } from '../data/mockProjects'
import type { Project, ProjectInput } from '../types/project'

const PROJECT_DRAFT_STORAGE_KEY = 'ai-coding-admin-project-drafts'
const ADMIN_PASSWORD_KEY = 'ai-coding-admin-password'
const isBrowser = typeof window !== 'undefined'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

function getAdminPassword(): string {
  if (!isBrowser) return ''
  return window.sessionStorage.getItem(ADMIN_PASSWORD_KEY) || ''
}

async function apiRequest<T>(path: string, init?: RequestInit & { admin?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (init?.admin) headers.set('x-admin-password', getAdminPassword())

  const response = await fetch(apiUrl(path), { ...init, headers })
  if (!response.ok) {
    const message = await response.json().catch(() => null)
    throw new Error(message?.message || `API request failed: ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => b.priority - a.priority || b.updatedAt.localeCompare(a.updatedAt))
}

function normalizeProject(project: Partial<Project> & { image?: string; imageUrl?: string; coverUrl?: string }): Project {
  const coverImage = project.coverImage || project.coverUrl || project.imageUrl || project.image || ''
  const images = Array.isArray(project.images) && project.images.length > 0
    ? project.images.filter(Boolean)
    : [coverImage].filter(Boolean)

  return {
    id: project.id ?? `project-${Date.now()}`,
    title: project.title ?? '未命名项目',
    subtitle: project.subtitle ?? '',
    description: project.description ?? '',
    longDescription: project.longDescription ?? '',
    coverImage: images[0] ?? coverImage,
    images,
    techStack: Array.isArray(project.techStack) ? project.techStack : [],
    tags: Array.isArray(project.tags) ? project.tags : [],
    githubUrl: project.githubUrl ?? '',
    demoUrl: project.demoUrl ?? '',
    status: project.status ?? 'published',
    priority: typeof project.priority === 'number' ? project.priority : 0,
    featured: typeof project.featured === 'boolean' ? project.featured : true,
    createdAt: project.createdAt ?? new Date().toISOString().slice(0, 10),
    updatedAt: project.updatedAt ?? new Date().toISOString().slice(0, 10),
    rating: project.rating,
  }
}

function readDraftProjects(): Project[] | null {
  if (!isBrowser) return null

  try {
    const raw = window.localStorage.getItem(PROJECT_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeProject) : null
  } catch (error) {
    console.warn('读取项目本地 fallback 失败', error)
    return null
  }
}

function writeDraftProjects(projects: Project[]): void {
  if (!isBrowser) return

  try {
    window.localStorage.setItem(PROJECT_DRAFT_STORAGE_KEY, JSON.stringify(projects))
  } catch (error) {
    console.warn('保存项目本地 fallback 失败', error)
  }
}

async function loadProjects(): Promise<Project[]> {
  try {
    return sortProjects((await apiRequest<Project[]>('/api/projects')).map(normalizeProject))
  } catch (error) {
    console.warn('服务器项目数据不可用，使用本地 fallback', error)
    return sortProjects(readDraftProjects() ?? mockProjects.map(normalizeProject))
  }
}

function createLocalId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`
}

async function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export const adminAuth = {
  setPassword(password: string): void {
    if (isBrowser) window.sessionStorage.setItem(ADMIN_PASSWORD_KEY, password)
  },

  clearPassword(): void {
    if (isBrowser) window.sessionStorage.removeItem(ADMIN_PASSWORD_KEY)
  },

  async verifyPassword(password: string): Promise<boolean> {
    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      this.setPassword(password)
      return true
    } catch {
      return false
    }
  },
}

export const projectService = {
  async getProjects(): Promise<Project[]> {
    return loadProjects()
  },

  async getFeaturedProjects(): Promise<Project[]> {
    try {
      return sortProjects((await apiRequest<Project[]>('/api/projects/featured')).map(normalizeProject))
    } catch (error) {
      console.warn('服务器公开项目数据不可用，使用本地 fallback', error)
      const projects = await loadProjects()
      return projects.filter((project) => project.featured && project.status === 'published')
    }
  },

  async getProjectById(id: string): Promise<Project | undefined> {
    try {
      return normalizeProject(await apiRequest<Project>(`/api/projects/${id}`))
    } catch {
      const projects = await loadProjects()
      return projects.find((project) => project.id === id)
    }
  },

  async createProject(input: ProjectInput): Promise<Project> {
    try {
      return normalizeProject(await apiRequest<Project>('/api/projects', {
        method: 'POST',
        admin: true,
        body: JSON.stringify(input),
      }))
    } catch (error) {
      console.warn('服务器创建项目失败，写入本地 fallback', error)
      const projects = await loadProjects()
      const now = new Date().toISOString().slice(0, 10)
      const project = normalizeProject({
        ...input,
        id: createLocalId(),
        createdAt: now,
        updatedAt: now,
      })
      writeDraftProjects(sortProjects([...projects, project]))
      return project
    }
  },

  async updateProject(id: string, input: Partial<ProjectInput>): Promise<Project | undefined> {
    try {
      return normalizeProject(await apiRequest<Project>(`/api/projects/${id}`, {
        method: 'PUT',
        admin: true,
        body: JSON.stringify(input),
      }))
    } catch (error) {
      console.warn('服务器更新项目失败，写入本地 fallback', error)
      const projects = await loadProjects()
      let updatedProject: Project | undefined
      const nextProjects = projects.map((project) => {
        if (project.id !== id) return project
        updatedProject = normalizeProject({
          ...project,
          ...input,
          images: input.images ?? project.images,
          coverImage: input.images?.[0] ?? input.coverImage ?? project.coverImage,
          updatedAt: new Date().toISOString().slice(0, 10),
        })
        return updatedProject
      })
      writeDraftProjects(sortProjects(nextProjects))
      return updatedProject
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await apiRequest(`/api/projects/${id}`, { method: 'DELETE', admin: true })
      return
    } catch (error) {
      console.warn('服务器删除项目失败，写入本地 fallback', error)
      const projects = await loadProjects()
      writeDraftProjects(projects.filter((project) => project.id !== id))
    }
  },

  async uploadProjectImages(projectId: string, files: FileList | File[]): Promise<string[]> {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length === 0) return []

    try {
      const body = new FormData()
      imageFiles.forEach((file) => body.append('images', file))
      const result = await apiRequest<{ urls: string[] }>(`/api/uploads/projects/${projectId || 'draft'}`, {
        method: 'POST',
        admin: true,
        body,
      })
      return result.urls
    } catch (error) {
      console.warn('服务器图片上传失败，使用 base64 本地 fallback', error)
      return Promise.all(imageFiles.map(readImageFile))
    }
  },
}

export type { Project, ProjectInput }
