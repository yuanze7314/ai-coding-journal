import { mockDossier } from '../data/mockDossier'
import type { Dossier } from '../types/dossier'

const DOSSIER_STORAGE_KEY = 'ai-coding-dossier'
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
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json')
  if (init?.admin) headers.set('x-admin-password', getAdminPassword())

  const response = await fetch(apiUrl(path), { ...init, headers })
  if (!response.ok) {
    const message = await response.json().catch(() => null)
    throw new Error(message?.message || `API request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

function normalizeDossier(input: Partial<Dossier> = {}): Dossier {
  return {
    name: input.name ?? mockDossier.name,
    status: Array.isArray(input.status) ? input.status : mockDossier.status,
    phone: input.phone ?? mockDossier.phone,
    email: input.email ?? mockDossier.email,
    education: Array.isArray(input.education) ? input.education : mockDossier.education,
    highlights: Array.isArray(input.highlights) ? input.highlights : mockDossier.highlights,
    awards: Array.isArray(input.awards) ? input.awards : mockDossier.awards,
    skills: Array.isArray(input.skills) ? input.skills : mockDossier.skills,
    updatedAt: input.updatedAt,
  }
}

function readLocalDossier(): Dossier | null {
  if (!isBrowser) return null
  try {
    const raw = window.localStorage.getItem(DOSSIER_STORAGE_KEY)
    return raw ? normalizeDossier(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeLocalDossier(dossier: Dossier): void {
  if (!isBrowser) return
  window.localStorage.setItem(DOSSIER_STORAGE_KEY, JSON.stringify(dossier))
}

export const dossierService = {
  async getDossier(): Promise<Dossier> {
    try {
      return normalizeDossier(await apiRequest<Dossier>('/api/dossier'))
    } catch (error) {
      console.warn('服务器 Dossier 数据不可用，使用本地 fallback', error)
      return readLocalDossier() ?? mockDossier
    }
  },

  async updateDossier(input: Dossier): Promise<Dossier> {
    try {
      return normalizeDossier(await apiRequest<Dossier>('/api/dossier', {
        method: 'PUT',
        admin: true,
        body: JSON.stringify(input),
      }))
    } catch (error) {
      console.warn('服务器保存 Dossier 失败，写入本地 fallback', error)
      const dossier = normalizeDossier(input)
      writeLocalDossier(dossier)
      return dossier
    }
  },
}
