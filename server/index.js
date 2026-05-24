import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import multer from 'multer'
import path from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  db,
  dbPath,
  initializeDatabase,
  normalizeProject,
  normalizeTimelineItem,
  projectParams,
  rowToProject,
  rowToTimelineItem,
} from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads')
const distDir = path.join(rootDir, 'dist')
const port = Number(process.env.PORT || 3001)
const adminPassword = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '123456'

mkdirSync(uploadsDir, { recursive: true })
initializeDatabase()

const app = express()

app.use(cors())
app.use(morgan('tiny'))
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(uploadsDir, { maxAge: '30d' }))

function requireAdmin(req, res, next) {
  const password = req.get('x-admin-password') || req.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: '密码错误，请重新输入' })
  }
  return next()
}

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

const storage = multer.diskStorage({
  destination(req, _file, callback) {
    const projectId = String(req.params.projectId || 'draft').replace(/[^a-zA-Z0-9_-]/g, '-')
    const targetDir = path.join(uploadsDir, 'projects', projectId)
    mkdirSync(targetDir, { recursive: true })
    callback(null, targetDir)
  },
  filename(_req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase()
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60)
    callback(null, `${Date.now()}-${base || 'image'}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024, files: 12 },
  fileFilter(_req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(new Error('仅支持 jpg、jpeg、png、webp 图片'))
    }
    return callback(null, true)
  },
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, dbPath, uploadsDir })
})

app.post('/api/auth/login', (req, res) => {
  if (req.body?.password !== adminPassword) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: '密码错误，请重新输入' })
  }
  return res.json({ ok: true })
})

app.get('/api/projects', (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY priority DESC, updated_at DESC').all()
  res.json(rows.map(rowToProject))
})

app.get('/api/projects/featured', (_req, res) => {
  const rows = db.prepare(`
    SELECT * FROM projects
    WHERE featured = 1 AND status = 'published'
    ORDER BY priority DESC, updated_at DESC
  `).all()
  res.json(rows.map(rowToProject))
})

app.get('/api/projects/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' })
  return res.json(rowToProject(row))
})

app.post('/api/projects', requireAdmin, (req, res) => {
  const now = new Date().toISOString().slice(0, 10)
  const project = normalizeProject({
    ...req.body,
    id: req.body?.id || createId('project'),
    createdAt: now,
    updatedAt: now,
  })

  db.prepare(`
    INSERT INTO projects (
      id, title, subtitle, description, long_description, cover_image, images,
      tech_stack, tags, github_url, demo_url, status, priority, featured,
      rating, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(...projectParams(project))

  return res.status(201).json(project)
})

app.put('/api/projects/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' })

  const current = rowToProject(existing)
  const updated = normalizeProject({
    ...current,
    ...req.body,
    id: req.params.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString().slice(0, 10),
  })

  db.prepare(`
    UPDATE projects SET
      title = ?, subtitle = ?, description = ?, long_description = ?,
      cover_image = ?, images = ?, tech_stack = ?, tags = ?,
      github_url = ?, demo_url = ?, status = ?, priority = ?,
      featured = ?, rating = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updated.title,
    updated.subtitle,
    updated.description,
    updated.longDescription,
    updated.coverImage,
    JSON.stringify(updated.images),
    JSON.stringify(updated.techStack),
    JSON.stringify(updated.tags),
    updated.githubUrl,
    updated.demoUrl,
    updated.status,
    updated.priority,
    updated.featured ? 1 : 0,
    updated.rating || 0,
    updated.updatedAt,
    updated.id,
  )

  return res.json(updated)
})

app.delete('/api/projects/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

app.post('/api/uploads/projects/:projectId', requireAdmin, upload.array('images', 12), (req, res) => {
  const projectId = String(req.params.projectId || 'draft').replace(/[^a-zA-Z0-9_-]/g, '-')
  const urls = (req.files || []).map((file) => `/uploads/projects/${projectId}/${file.filename}`)
  res.status(201).json({ urls })
})

app.get('/api/timeline', (_req, res) => {
  const rows = db.prepare('SELECT * FROM timeline_items ORDER BY sort_order DESC, updated_at DESC').all()
  res.json(rows.map(rowToTimelineItem))
})

app.post('/api/timeline', requireAdmin, (req, res) => {
  const now = new Date().toISOString().slice(0, 10)
  const item = normalizeTimelineItem({
    ...req.body,
    id: req.body?.id || createId('timeline'),
    createdAt: now,
    updatedAt: now,
  })

  if (item.isCurrent) {
    db.prepare('UPDATE timeline_items SET is_current = 0').run()
  }

  db.prepare(`
    INSERT INTO timeline_items (
      id, phase, title, description, sort_order, is_current, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(item.id, item.phase, item.title, item.description, item.order, item.isCurrent ? 1 : 0, item.createdAt, item.updatedAt)

  res.status(201).json(item)
})

app.put('/api/timeline/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM timeline_items WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' })

  const current = rowToTimelineItem(existing)
  const item = normalizeTimelineItem({
    ...current,
    ...req.body,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString().slice(0, 10),
  })

  if (item.isCurrent) {
    db.prepare('UPDATE timeline_items SET is_current = 0 WHERE id != ?').run(item.id)
  }

  db.prepare(`
    UPDATE timeline_items SET
      phase = ?, title = ?, description = ?, sort_order = ?,
      is_current = ?, updated_at = ?
    WHERE id = ?
  `).run(item.phase, item.title, item.description, item.order, item.isCurrent ? 1 : 0, item.updatedAt, item.id)

  res.json(item)
})

app.delete('/api/timeline/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM timeline_items WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

app.patch('/api/timeline/:id/current', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM timeline_items WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' })

  const now = new Date().toISOString().slice(0, 10)
  db.prepare('UPDATE timeline_items SET is_current = 0').run()
  db.prepare('UPDATE timeline_items SET is_current = 1, updated_at = ? WHERE id = ?').run(now, req.params.id)
  res.json(rowToTimelineItem(db.prepare('SELECT * FROM timeline_items WHERE id = ?').get(req.params.id)))
})

app.get('/api/dossier', (_req, res) => {
  const row = db.prepare('SELECT data, updated_at FROM dossier WHERE id = ?').get('main')
  if (!row) return res.json({})
  try {
    return res.json({ ...JSON.parse(row.data), updatedAt: row.updated_at })
  } catch {
    return res.json({})
  }
})

app.put('/api/dossier', requireAdmin, (req, res) => {
  const now = new Date().toISOString().slice(0, 10)
  const data = req.body && typeof req.body === 'object' ? req.body : {}
  db.prepare(`
    INSERT INTO dossier (id, data, updated_at)
    VALUES ('main', ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(JSON.stringify(data), now)
  res.json({ ...data, updatedAt: now })
})

if (existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '1h' }))
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((error, _req, res, _next) => {
  console.error(error)
  const status = error.message?.includes('仅支持') || error.code === 'LIMIT_FILE_SIZE' ? 400 : 500
  res.status(status).json({ error: 'SERVER_ERROR', message: error.message || '服务器错误' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`AI Coding Journal server listening on http://0.0.0.0:${port}`)
})
