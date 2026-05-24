import { mockTimeline } from '../data/mockTimeline'
import type { TimelineInput, TimelineItem } from '../types/timeline'

const TIMELINE_STORAGE_KEY = 'ai-coding-timeline'
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
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function sortTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => b.order - a.order || b.updatedAt.localeCompare(a.updatedAt))
}

function normalizeTimelineItem(item: Partial<TimelineItem> & { desc?: string; active?: boolean }, index: number): TimelineItem {
  const now = new Date().toISOString().slice(0, 10)

  return {
    id: item.id ?? `timeline-${index}-${Date.now()}`,
    phase: item.phase ?? `Phase ${index + 1}`,
    title: item.title ?? '未命名时间线节点',
    description: item.description ?? item.desc ?? '',
    order: typeof item.order === 'number' ? item.order : (mockTimeline.length - index) * 10,
    isCurrent: typeof item.isCurrent === 'boolean' ? item.isCurrent : Boolean(item.active),
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  }
}

function readTimeline(): TimelineItem[] | null {
  if (!isBrowser) return null

  try {
    const raw = window.localStorage.getItem(TIMELINE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.map(normalizeTimelineItem)
  } catch (error) {
    console.warn('读取时间线本地 fallback 失败', error)
    return null
  }
}

function writeTimeline(items: TimelineItem[]): void {
  if (!isBrowser) return

  try {
    window.localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(sortTimeline(items)))
  } catch (error) {
    console.warn('保存时间线本地 fallback 失败', error)
  }
}

async function loadTimeline(): Promise<TimelineItem[]> {
  try {
    return sortTimeline((await apiRequest<TimelineItem[]>('/api/timeline')).map(normalizeTimelineItem))
  } catch (error) {
    console.warn('服务器时间线数据不可用，使用本地 fallback', error)
    return sortTimeline(readTimeline() ?? mockTimeline)
  }
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `timeline-${Date.now()}`
}

export const timelineService = {
  async getTimelineItems(): Promise<TimelineItem[]> {
    return loadTimeline()
  },

  async createTimelineItem(input?: Partial<TimelineInput>): Promise<TimelineItem> {
    try {
      return normalizeTimelineItem(await apiRequest<TimelineItem>('/api/timeline', {
        method: 'POST',
        admin: true,
        body: JSON.stringify(input ?? {}),
      }), 0)
    } catch (error) {
      console.warn('服务器创建时间线失败，写入本地 fallback', error)
      const items = await loadTimeline()
      const now = new Date().toISOString().slice(0, 10)
      const item: TimelineItem = {
        id: createId(),
        phase: input?.phase ?? 'Phase',
        title: input?.title ?? '新的成长节点',
        description: input?.description ?? '补充这个阶段的成长记录。',
        order: typeof input?.order === 'number' ? input.order : (items[0]?.order ?? 0) + 10,
        isCurrent: Boolean(input?.isCurrent),
        createdAt: now,
        updatedAt: now,
      }
      const nextItems = item.isCurrent
        ? items.map((current) => ({ ...current, isCurrent: false }))
        : items
      writeTimeline([...nextItems, item])
      return item
    }
  },

  async updateTimelineItem(id: string, input: Partial<TimelineInput>): Promise<TimelineItem | undefined> {
    try {
      return normalizeTimelineItem(await apiRequest<TimelineItem>(`/api/timeline/${id}`, {
        method: 'PUT',
        admin: true,
        body: JSON.stringify(input),
      }), 0)
    } catch (error) {
      console.warn('服务器更新时间线失败，写入本地 fallback', error)
      const items = await loadTimeline()
      let updatedItem: TimelineItem | undefined
      const now = new Date().toISOString().slice(0, 10)
      const nextItems = items.map((item) => {
        if (item.id !== id) {
          return input.isCurrent ? { ...item, isCurrent: false } : item
        }
        updatedItem = { ...item, ...input, updatedAt: now }
        return updatedItem
      })
      writeTimeline(nextItems)
      return updatedItem
    }
  },

  async deleteTimelineItem(id: string): Promise<void> {
    try {
      await apiRequest(`/api/timeline/${id}`, { method: 'DELETE', admin: true })
      return
    } catch (error) {
      console.warn('服务器删除时间线失败，写入本地 fallback', error)
      const items = await loadTimeline()
      writeTimeline(items.filter((item) => item.id !== id))
    }
  },

  async setCurrentTimelineItem(id: string): Promise<void> {
    try {
      await apiRequest(`/api/timeline/${id}/current`, { method: 'PATCH', admin: true })
      return
    } catch (error) {
      console.warn('服务器设置 Current 失败，写入本地 fallback', error)
      const items = await loadTimeline()
      const now = new Date().toISOString().slice(0, 10)
      writeTimeline(items.map((item) => ({
        ...item,
        isCurrent: item.id === id,
        updatedAt: item.id === id ? now : item.updatedAt,
      })))
    }
  },
}

export type { TimelineInput, TimelineItem }
