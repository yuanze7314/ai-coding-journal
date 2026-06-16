import { useEffect, useMemo, useState } from 'react'
import { ProjectForm } from '../components/admin/ProjectForm'
import { projectService } from '../services/projectService'
import type { Project, ProjectInput } from '../types/project'

type AdminPageProps = {
  authenticated?: boolean
  onExit?: () => void
}

function getProjectImages(project: Project): string[] {
  if (Array.isArray(project.images) && project.images.length > 0) {
    return project.images.filter(Boolean)
  }
  return [project.coverImage].filter(Boolean)
}

export function AdminPage({ authenticated = false, onExit }: AdminPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [editingProject, setEditingProject] = useState<Project | undefined>()
  const [showForm, setShowForm] = useState(false)

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.priority - a.priority || b.updatedAt.localeCompare(a.updatedAt)),
    [projects],
  )

  const refreshProjects = async () => {
    setProjects(await projectService.getProjects())
  }

  useEffect(() => {
    if (authenticated) {
      refreshProjects()
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
            <h1 className="mt-3 text-4xl font-semibold text-white">项目展示管理</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/55">
              这里维护前台项目展示的核心内容：项目图片、标题、简介、详细说明和 GitHub 链接。图片可上传多张，第一张会作为卡片封面。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="admin-button admin-button-secondary" type="button" onClick={onExit}>
              返回首页
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

        <section className="grid gap-4" aria-label="项目列表">
          {sortedProjects.length === 0 ? (
            <div className="admin-panel rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-8 text-center text-sm text-white/45">
              暂无项目内容，点击“新增项目”开始添加。
            </div>
          ) : (
            sortedProjects.map((project) => {
              const images = getProjectImages(project)

              return (
                <article
                  key={project.id}
                  className="admin-panel grid gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-center"
                >
                  {images[0] ? (
                    <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      <img src={images[0]} alt={project.title} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-xs text-white/25">
                      暂无图片
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-medium text-white">{project.title}</h2>
                      {images.length > 0 && (
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/45">
                          {images.length} 张图片
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-white/58">{project.description}</p>
                    {project.longDescription && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/42">
                        {project.longDescription}
                      </p>
                    )}
                    {project.githubUrl && (
                      <p className="mt-2 truncate font-mono text-xs text-blue-100/55">{project.githubUrl}</p>
                    )}
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
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
