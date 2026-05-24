import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { seedDossier, seedProjects, seedTimeline } from './seedData.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data')
mkdirSync(dataDir, { recursive: true })

export const dbPath = path.join(dataDir, 'ai-coding-journal.sqlite')
export const db = new DatabaseSync(dbPath)

function toJson(value) {
  return JSON.stringify(Array.isArray(value) ? value : [])
}

function fromJson(value) {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function normalizeProject(project = {}) {
  const now = new Date().toISOString().slice(0, 10)
  const images = Array.isArray(project.images) && project.images.length > 0
    ? project.images.filter(Boolean)
    : [project.coverImage, project.coverUrl, project.imageUrl, project.image].filter(Boolean)

  return {
    id: project.id || `project-${Date.now()}`,
    title: project.title || '未命名项目',
    subtitle: project.subtitle || '',
    description: project.description || '',
    longDescription: project.longDescription || '',
    coverImage: images[0] || project.coverImage || '',
    images,
    techStack: Array.isArray(project.techStack) ? project.techStack : [],
    tags: Array.isArray(project.tags) ? project.tags : [],
    githubUrl: project.githubUrl || '',
    demoUrl: project.demoUrl || '',
    status: project.status || 'published',
    priority: Number.isFinite(Number(project.priority)) ? Number(project.priority) : 0,
    featured: typeof project.featured === 'boolean' ? project.featured : Boolean(project.featured ?? true),
    createdAt: project.createdAt || now,
    updatedAt: project.updatedAt || now,
    rating: Number.isFinite(Number(project.rating)) ? Number(project.rating) : 0,
  }
}

export function normalizeTimelineItem(item = {}, index = 0) {
  const now = new Date().toISOString().slice(0, 10)

  return {
    id: item.id || `timeline-${Date.now()}-${index}`,
    phase: item.phase || `Phase ${index + 1}`,
    title: item.title || '新的成长节点',
    description: item.description || item.desc || '',
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : 0,
    isCurrent: typeof item.isCurrent === 'boolean' ? item.isCurrent : Boolean(item.active),
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
  }
}

export function rowToProject(row) {
  return normalizeProject({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    longDescription: row.long_description,
    coverImage: row.cover_image,
    images: fromJson(row.images),
    techStack: fromJson(row.tech_stack),
    tags: fromJson(row.tags),
    githubUrl: row.github_url,
    demoUrl: row.demo_url,
    status: row.status,
    priority: row.priority,
    featured: Boolean(row.featured),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rating: row.rating,
  })
}

export function rowToTimelineItem(row) {
  return normalizeTimelineItem({
    id: row.id,
    phase: row.phase,
    title: row.title,
    description: row.description,
    order: row.sort_order,
    isCurrent: Boolean(row.is_current),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      long_description TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      tech_stack TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      github_url TEXT DEFAULT '',
      demo_url TEXT DEFAULT '',
      status TEXT DEFAULT 'published',
      priority INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 1,
      rating REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timeline_items (
      id TEXT PRIMARY KEY,
      phase TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_current INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dossier (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  const projectCount = db.prepare('SELECT COUNT(*) AS count FROM projects').get().count
  if (projectCount === 0) {
    const insertProject = db.prepare(`
      INSERT INTO projects (
        id, title, subtitle, description, long_description, cover_image, images,
        tech_stack, tags, github_url, demo_url, status, priority, featured,
        rating, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const project of seedProjects.map(normalizeProject)) {
      insertProject.run(
        project.id,
        project.title,
        project.subtitle,
        project.description,
        project.longDescription,
        project.coverImage,
        toJson(project.images),
        toJson(project.techStack),
        toJson(project.tags),
        project.githubUrl,
        project.demoUrl,
        project.status,
        project.priority,
        project.featured ? 1 : 0,
        project.rating || 0,
        project.createdAt,
        project.updatedAt,
      )
    }
  }

  const timelineCount = db.prepare('SELECT COUNT(*) AS count FROM timeline_items').get().count
  if (timelineCount === 0) {
    const insertTimeline = db.prepare(`
      INSERT INTO timeline_items (
        id, phase, title, description, sort_order, is_current, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const item of seedTimeline.map(normalizeTimelineItem)) {
      insertTimeline.run(
        item.id,
        item.phase,
        item.title,
        item.description,
        item.order,
        item.isCurrent ? 1 : 0,
        item.createdAt,
        item.updatedAt,
      )
    }
  }

  const dossierCount = db.prepare('SELECT COUNT(*) AS count FROM dossier').get().count
  if (dossierCount === 0) {
    db.prepare('INSERT INTO dossier (id, data, updated_at) VALUES (?, ?, ?)').run(
      'main',
      JSON.stringify(seedDossier),
      new Date().toISOString().slice(0, 10),
    )
  }
}

export function projectParams(project) {
  return [
    project.id,
    project.title,
    project.subtitle,
    project.description,
    project.longDescription,
    project.coverImage,
    toJson(project.images),
    toJson(project.techStack),
    toJson(project.tags),
    project.githubUrl,
    project.demoUrl,
    project.status,
    project.priority,
    project.featured ? 1 : 0,
    project.rating || 0,
    project.createdAt,
    project.updatedAt,
  ]
}
