import { useEffect, useMemo, useState } from 'react'
import { ProjectForm } from '../components/admin/ProjectForm'
import { mockDossier } from '../data/mockDossier'
import { dossierService } from '../services/dossierService'
import { projectService } from '../services/projectService'
import { timelineService } from '../services/timelineService'
import type { Dossier } from '../types/dossier'
import type { Project, ProjectInput } from '../types/project'
import type { TimelineItem } from '../types/timeline'

type AdminPageProps = {
  authenticated?: boolean
  onExit?: () => void
}

function linesToText(lines: string[]): string {
  return lines.join('\n')
}

function textToLines(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}

export function AdminPage({ authenticated = false, onExit }: AdminPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [dossier, setDossier] = useState<Dossier>(mockDossier)
  const [editingProject, setEditingProject] = useState<Project | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [dossierMessage, setDossierMessage] = useState('')

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.priority - a.priority || b.updatedAt.localeCompare(a.updatedAt)),
    [projects],
  )

  const refreshProjects = async () => {
    setProjects(await projectService.getProjects())
  }

  const refreshTimeline = async () => {
    setTimelineItems(await timelineService.getTimelineItems())
  }

  const refreshDossier = async () => {
    setDossier(await dossierService.getDossier())
  }

  const updateTimelineDraft = <K extends keyof TimelineItem>(id: string, key: K, value: TimelineItem[K]) => {
    setTimelineItems((items) => items.map((item) => (item.id === id ? { ...item, [key]: value } : item)))
  }

  useEffect(() => {
    if (authenticated) {
      refreshProjects()
      refreshTimeline()
      refreshDossier()
    }
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return undefined

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [authenticated])

  if (!authenticated) return null

  return (
    <main className="mission-shell admin-page min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="game-bg" aria-hidden="true" />
      <div className="bg-overlay-left" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-blue-200/70">Admin Console</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">项目内容管理</h1>
            <p className="mt-3 text-sm text-white/50">
              当前后台会优先写入服务器 SQLite 数据库，图片上传到服务器 uploads 目录；API 不可用时才使用本地 fallback。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="admin-button admin-button-secondary" type="button" onClick={onExit}>
              返回首页
            </button>
            <button
              className="admin-button admin-button-secondary"
              type="button"
              onClick={async () => {
                await timelineService.createTimelineItem()
                await refreshTimeline()
              }}
            >
              新增时间线
            </button>
            <button
              className="admin-button"
              type="button"
              onClick={() => {
                setEditingProject(undefined)
                setShowForm(true)
              }}
            >
              新增项目
            </button>
          </div>
        </header>

        <section className="mb-10">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-blue-200/60">Growth Timeline</p>
              <h2 className="mt-2 text-2xl font-medium text-white">成长时间线管理</h2>
            </div>
            <button
              className="admin-button"
              type="button"
              onClick={async () => {
                await timelineService.createTimelineItem()
                await refreshTimeline()
              }}
            >
              新增时间线节点
            </button>
          </div>

          {timelineItems.length === 0 ? (
            <div className="admin-panel rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-8 text-center text-sm text-white/45">
              暂无成长时间线内容
            </div>
          ) : (
            <div className="grid gap-4">
              {timelineItems.map((item) => (
                <article key={item.id} className="admin-panel grid gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem_10rem]">
                    <label className="grid gap-2 text-sm text-white/60">
                      阶段标签
                      <input value={item.phase} onChange={(event) => updateTimelineDraft(item.id, 'phase', event.target.value)} />
                    </label>
                    <label className="grid gap-2 text-sm text-white/60">
                      排序权重
                      <input type="number" value={item.order} onChange={(event) => updateTimelineDraft(item.id, 'order', Number(event.target.value))} />
                    </label>
                    <label className="flex items-end gap-3 pb-3 text-sm text-white/70">
                      <input
                        type="radio"
                        checked={item.isCurrent}
                        onChange={async () => {
                          await timelineService.setCurrentTimelineItem(item.id)
                          await refreshTimeline()
                        }}
                      />
                      设为 Current
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm text-white/60">
                    标题
                    <input value={item.title} onChange={(event) => updateTimelineDraft(item.id, 'title', event.target.value)} />
                  </label>

                  <label className="grid gap-2 text-sm text-white/60">
                    描述
                    <textarea rows={3} value={item.description} onChange={(event) => updateTimelineDraft(item.id, 'description', event.target.value)} />
                  </label>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      className="admin-button admin-button-secondary"
                      type="button"
                      onClick={async () => {
                        await timelineService.updateTimelineItem(item.id, {
                          phase: item.phase,
                          title: item.title,
                          description: item.description,
                          order: item.order,
                          isCurrent: item.isCurrent,
                        })
                        await refreshTimeline()
                      }}
                    >
                      保存节点
                    </button>
                    <button
                      className="admin-button admin-button-secondary"
                      type="button"
                      onClick={async () => {
                        await timelineService.updateTimelineItem(item.id, { order: item.order + 10 })
                        await refreshTimeline()
                      }}
                    >
                      上移
                    </button>
                    <button
                      className="admin-button admin-button-danger"
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`确认删除「${item.title}」？`)) return
                        await timelineService.deleteTimelineItem(item.id)
                        await refreshTimeline()
                      }}
                    >
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <div className="mb-4">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-blue-200/60">User Dossier</p>
            <h2 className="mt-2 text-2xl font-medium text-white">个人简历管理</h2>
          </div>
          <div className="admin-panel grid gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm text-white/60">
                姓名
                <input value={dossier.name} onChange={(event) => setDossier((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm text-white/60">
                电话
                <input value={dossier.phone} onChange={(event) => setDossier((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm text-white/60">
                邮箱
                <input value={dossier.email} onChange={(event) => setDossier((current) => ({ ...current, email: event.target.value }))} />
              </label>
            </div>
            <label className="grid gap-2 text-sm text-white/60">
              状态标签，用逗号分隔
              <input value={dossier.status.join('，')} onChange={(event) => setDossier((current) => ({ ...current, status: event.target.value.split(/[，,]/).map((item) => item.trim()).filter(Boolean) }))} />
            </label>
            <label className="grid gap-2 text-sm text-white/60">
              经历亮点，每行一条
              <textarea rows={5} value={linesToText(dossier.highlights)} onChange={(event) => setDossier((current) => ({ ...current, highlights: textToLines(event.target.value) }))} />
            </label>
            <label className="grid gap-2 text-sm text-white/60">
              教育背景 JSON
              <textarea rows={5} value={JSON.stringify(dossier.education, null, 2)} onChange={(event) => {
                try {
                  const education = JSON.parse(event.target.value)
                  if (Array.isArray(education)) setDossier((current) => ({ ...current, education }))
                } catch {
                  // Keep current value until JSON is valid.
                }
              }} />
            </label>
            <label className="grid gap-2 text-sm text-white/60">
              奖项 JSON
              <textarea rows={5} value={JSON.stringify(dossier.awards, null, 2)} onChange={(event) => {
                try {
                  const awards = JSON.parse(event.target.value)
                  if (Array.isArray(awards)) setDossier((current) => ({ ...current, awards }))
                } catch {
                  // Keep current value until JSON is valid.
                }
              }} />
            </label>
            <label className="grid gap-2 text-sm text-white/60">
              技能 JSON
              <textarea rows={5} value={JSON.stringify(dossier.skills, null, 2)} onChange={(event) => {
                try {
                  const skills = JSON.parse(event.target.value)
                  if (Array.isArray(skills)) setDossier((current) => ({ ...current, skills }))
                } catch {
                  // Keep current value until JSON is valid.
                }
              }} />
            </label>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {dossierMessage && <span className="text-xs text-blue-100/70">{dossierMessage}</span>}
              <button
                className="admin-button"
                type="button"
                onClick={async () => {
                  await dossierService.updateDossier(dossier)
                  await refreshDossier()
                  setDossierMessage('已保存到服务器')
                  window.setTimeout(() => setDossierMessage(''), 1800)
                }}
              >
                保存简历
              </button>
            </div>
          </div>
        </section>

        {showForm && (
          <div className="mb-8">
            <ProjectForm
              project={editingProject}
              onCancel={() => {
                setEditingProject(undefined)
                setShowForm(false)
              }}
              onSubmit={async (input: ProjectInput) => {
                if (editingProject) {
                  await projectService.updateProject(editingProject.id, input)
                } else {
                  await projectService.createProject(input)
                }
                await refreshProjects()
                setEditingProject(undefined)
                setShowForm(false)
              }}
            />
          </div>
        )}

        <section className="grid gap-4">
          {sortedProjects.map((project) => (
            <article key={project.id} className="admin-panel grid gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5 md:grid-cols-[8rem_minmax(0,1fr)_auto] md:items-center">
              {project.images?.[0] || project.coverImage ? (
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  <img src={project.images?.[0] ?? project.coverImage} alt={project.title} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-xs text-white/25">
                  暂无图片
                </div>
              )}
              <div>
                <h2 className="mb-2 text-lg font-medium text-white">{project.title}</h2>
                <p className="text-sm text-white/50">{project.description}</p>
                {project.githubUrl && <p className="mt-2 truncate font-mono text-xs text-blue-100/55">{project.githubUrl}</p>}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  className="admin-button admin-button-secondary"
                  type="button"
                  onClick={() => {
                    setEditingProject(project)
                    setShowForm(true)
                  }}
                >
                  编辑
                </button>
                <button
                  className="admin-button admin-button-secondary"
                  type="button"
                  onClick={async () => {
                    await projectService.updateProject(project.id, { featured: !project.featured })
                    await refreshProjects()
                  }}
                >
                  {project.featured ? '取消展示' : '设为展示'}
                </button>
                <button
                  className="admin-button admin-button-danger"
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`确认删除「${project.title}」？`)) return
                    await projectService.deleteProject(project.id)
                    await refreshProjects()
                  }}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
