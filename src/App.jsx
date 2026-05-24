import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Upload,
  Image,
  Plus,
  Menu,
  X,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { AdminPage } from './pages/AdminPage'
import { mockDossier } from './data/mockDossier'
import { dossierService } from './services/dossierService'
import { adminAuth, projectService } from './services/projectService'
import { timelineService } from './services/timelineService'

const OWNER_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '123456'

function normalizeProjectImages(project) {
  if (Array.isArray(project.images)) {
    return project.images.filter(Boolean)
  }
  if (project.coverImage) return [project.coverImage]
  if (project.coverUrl) return [project.coverUrl]
  if (project.imageUrl) return [project.imageUrl]
  return project.image ? [project.image] : []
}

function readImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

// ========================
// 主 App 组件
// ========================
export default function App() {
  const [projects, setProjects] = useState([])
  const [isProjectsLoading, setIsProjectsLoading] = useState(true)
  const [timeline, setTimeline] = useState([])
  const [dossier, setDossier] = useState(mockDossier)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)

  const loadDisplayData = useCallback(async () => {
    setIsProjectsLoading(true)
    try {
      const [nextProjects, nextTimeline, nextDossier] = await Promise.all([
        projectService.getFeaturedProjects(),
        timelineService.getTimelineItems(),
        dossierService.getDossier(),
      ])
      setProjects(nextProjects)
      setTimeline(nextTimeline)
      setDossier(nextDossier)
    } catch (error) {
      console.warn('加载展示数据失败', error)
    } finally {
      setIsProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    setIsProjectsLoading(true)
    Promise.all([
      projectService.getFeaturedProjects(),
      timelineService.getTimelineItems(),
      dossierService.getDossier(),
    ]).then(([nextProjects, nextTimeline, nextDossier]) => {
      if (!mounted) return
      setProjects(nextProjects)
      setTimeline(nextTimeline)
      setDossier(nextDossier)
      setIsProjectsLoading(false)
    }).catch((error) => {
      console.warn('加载展示数据失败', error)
      if (mounted) setIsProjectsLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (isAdminMode) return undefined

    let frameId
    let observer

    frameId = window.requestAnimationFrame(() => {
    const revealElements = document.querySelectorAll('.reveal')
      observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active')
          }
        })
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px',
      }
    )

      revealElements.forEach((element) => {
        const rect = element.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          element.classList.add('active')
        }
        observer.observe(element)
      })
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      observer?.disconnect()
    }
  }, [isAdminMode, projects.length, timeline.length, isProjectsLoading])

  // ---- owner 相关 ----

  const handleUnlock = useCallback(async (password) => {
    const verifiedByServer = await adminAuth.verifyPassword(password)
    if (verifiedByServer || password === OWNER_PASSWORD) {
      adminAuth.setPassword(password)
      setIsOwner(true)
      setIsAdminMode(true)
      setShowUnlockModal(false)
      return { success: true }
    }
    return { success: false, error: '密码错误，请重新输入' }
  }, [])

  const handleLock = useCallback(() => {
    adminAuth.clearPassword()
    setIsOwner(false)
    setIsAdminMode(false)
    setShowUnlockModal(false)
    setMobileMenuOpen(false)
    if (window.location.pathname !== '/' || window.location.hash) {
      window.history.replaceState(null, '', '/')
    }
    window.requestAnimationFrame(() => {
      document.getElementById('scroll-container')?.scrollTo({ top: 0 })
    })
    loadDisplayData().catch((error) => {
      console.warn('重新加载展示数据失败', error)
    })
  }, [loadDisplayData])

  // ---- 核心操作函数 ----

  const updateProject = useCallback(() => {}, [])
  const handleImageUpload = useCallback(() => {}, [])

  const updateTimelineItem = useCallback(() => {}, [])

  const addProject = useCallback(() => {}, [])
  const deleteProject = useCallback(() => {}, [])

  // ---- 平滑滚动 ----
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    isAdminMode ? (
      <AdminPage authenticated onExit={handleLock} />
    ) : (
      <div className="mission-shell relative min-h-screen overflow-hidden bg-black text-white/90">
      <div className="game-bg" aria-hidden="true" />
      <div className="bg-overlay-left" aria-hidden="true" />

      <div className="scroll-panel" id="scroll-container">
        {/* ========== 顶部导航栏 ========== */}
        <Navbar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          scrollTo={scrollTo}
          isOwner={isOwner}
          onUnlock={() => setShowUnlockModal(true)}
          onLock={handleLock}
        />

        {/* ========== Hero 区 ========== */}
        <HeroSection scrollTo={scrollTo} />

        {/* ========== 项目卡片区 ========== */}
        <ProjectsSection
          projects={projects}
          isLoading={isProjectsLoading}
          updateProject={updateProject}
          handleImageUpload={handleImageUpload}
          addProject={addProject}
          deleteProject={deleteProject}
          isOwner={isOwner}
        />

        <div className="archive-duo relative z-10">
          <TimelineSection
            timeline={timeline}
            updateTimelineItem={updateTimelineItem}
            isOwner={isOwner}
          />
          <DossierSection dossier={dossier} />
        </div>

        {/* ========== 底部 ========== */}
        <Footer
          isOwner={isOwner}
          onUnlock={() => setShowUnlockModal(true)}
          onLock={handleLock}
        />
      </div>

      {/* ========== 解锁弹窗 ========== */}
      {showUnlockModal && (
        <UnlockModal
          onUnlock={handleUnlock}
          onClose={() => setShowUnlockModal(false)}
        />
      )}
      </div>
    )
  )
}

// ========================
// 导航栏组件
// ========================
function Navbar({ mobileMenuOpen, setMobileMenuOpen, scrollTo, isOwner, onUnlock, onLock }) {
  const navItems = [
    { label: 'Missions', target: 'missions' },
    { label: 'Timeline', target: 'timeline' },
    { label: 'Dossier', target: 'resume' },
  ]

  return (
    <nav className="glass sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4 md:px-12">
        {/* Logo */}
        <button
          onClick={() => scrollTo('hero')}
          className="brand-mark flex items-center gap-2 font-mono text-sm tracking-[0.22em] text-white"
        >
          <span>YZ</span>
          <span className="text-white/35">// SYSTEM.OS</span>
        </button>

        {/* 桌面导航 */}
        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <button
              key={item.target}
              onClick={() => scrollTo(item.target)}
              className="text-sm text-white/60 transition-colors hover:text-white"
            >
              {item.label}
            </button>
          ))}

          {/* 锁定/解锁状态 */}
          <button
            onClick={isOwner ? onLock : onUnlock}
            className="ml-2 flex items-center gap-1.5 text-xs text-white/30 transition-colors hover:text-white/60"
            title={isOwner ? '退出后台管理' : '输入密码进入编辑后台'}
          >
            {isOwner ? (
              <>
                <Unlock size={14} className="text-blue-400" />
                <span className="hidden lg:inline">退出编辑</span>
              </>
            ) : (
              <>
                <Lock size={14} />
                <span className="hidden lg:inline">编辑</span>
              </>
            )}
          </button>
        </div>

        {/* 移动端 */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={isOwner ? onLock : onUnlock}
            className="text-white/30 hover:text-white/60"
            aria-label={isOwner ? '退出编辑后台' : '进入编辑后台'}
          >
            {isOwner ? <Unlock size={16} className="text-blue-400" /> : <Lock size={16} />}
          </button>
          <button
            className="text-white/70"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="border-t border-white/5 bg-gray-950/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col px-6 py-4 gap-3">
            {navItems.map((item) => (
              <button
                key={item.target}
                onClick={() => scrollTo(item.target)}
                className="text-left text-sm text-white/60 transition-colors hover:text-white py-1"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}

// ========================
// Hero 区组件
// ========================
function HeroSection({ scrollTo }) {
  return (
    <section
      id="hero"
      className="relative z-10 flex min-h-[85vh] flex-col justify-center px-6 pb-10 pt-10 md:px-12"
    >
      <div className="w-full">
        <h1 className="reveal mb-8 text-6xl font-semibold leading-tight tracking-tight text-white md:text-[5.5rem]">
          Yz AI Coding
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Growth Archive
          </span>
        </h1>

        <p className="reveal mb-10 max-w-2xl text-xl font-light leading-relaxed text-white/50 md:text-2xl">
          记录我如何用 AI 编程、数据分析和自动化 Agent，把分散的想法变成可展示的项目系统。
        </p>

      </div>
    </section>
  )
}

// ========================
// 项目卡片区组件
// ========================
function ProjectsSection({
  projects,
  isLoading,
  updateProject,
  handleImageUpload,
  addProject,
  deleteProject,
  isOwner,
}) {
  const [selectedProject, setSelectedProject] = useState(null)
  const [zoomImage, setZoomImage] = useState(null)
  const canEditProjects = false
  const handleDetailUpdate = useCallback((id, key, value) => {
    updateProject(id, key, value)
    setSelectedProject((current) =>
      current?.id === id ? { ...current, [key]: value } : current
    )
  }, [updateProject])

  return (
    <section id="missions" className="projects-section relative z-10 py-16 px-6 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12">
          <div>
            <h2 className="mb-3 text-3xl font-bold text-white md:text-5xl">
              项目展示
            </h2>
          </div>
        </div>

        {isLoading ? (
          <ProjectsLoadingState />
        ) : projects.length > 0 ? (
          <div className="project-grid grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                revealDelay={`${index * 0.08}s`}
                updateProject={updateProject}
                handleImageUpload={handleImageUpload}
                deleteProject={deleteProject}
                isOwner={canEditProjects}
                onOpen={() => setSelectedProject(project)}
              />
            ))}
            {canEditProjects && (
              <button
                type="button"
                onClick={addProject}
                className="add-mission-card reveal glass-card group flex min-h-[25rem] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/20 text-white/45 transition-all"
                style={{ transitionDelay: `${projects.length * 0.08}s` }}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 transition-all group-hover:border-blue-300/70 group-hover:text-white">
                  <Plus size={26} strokeWidth={1.5} />
                </span>
                <span className="font-mono text-sm uppercase tracking-[0.18em]">
                  Add Local Draft
                </span>
                <span className="max-w-[15rem] text-center text-xs leading-relaxed text-white/30">
                  仅保存到当前浏览器草稿，不会更新线上公开数据
                </span>
              </button>
            )}
          </div>
        ) : (
          <EmptyProjectsState isOwner={canEditProjects} onAdd={addProject} />
        )}
      </div>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          isOwner={canEditProjects}
          updateProject={handleDetailUpdate}
          onClose={() => setSelectedProject(null)}
          onZoom={setZoomImage}
        />
      )}

      {zoomImage && (
        <ImageZoomModal
          image={zoomImage}
          onClose={() => setZoomImage(null)}
        />
      )}
    </section>
  )
}

function EmptyProjectsState({ isOwner, onAdd }) {
  return (
    <div className="empty-project-state reveal glass-card flex min-h-[22rem] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 px-6 text-center">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/45">
        <Image size={26} strokeWidth={1.4} />
      </span>
      <h3 className="text-xl font-medium text-white">暂无项目内容</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/45">
        暂无项目内容，请点击编辑添加项目。
      </p>
      {isOwner && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-6 rounded-full border border-white/15 px-5 py-2 text-sm text-white/65 transition-colors hover:border-blue-300/50 hover:text-white"
        >
          新建本地草稿
        </button>
      )}
    </div>
  )
}

function ProjectsLoadingState() {
  return (
    <div className="empty-project-state reveal glass-card flex min-h-[22rem] flex-col items-center justify-center rounded-2xl border border-white/10 px-6 text-center">
      <span className="mb-5 h-10 w-10 animate-pulse rounded-full border border-blue-300/30 bg-blue-300/10" />
      <h3 className="text-xl font-medium text-white">正在加载项目</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/45">
        正在同步最新作品展示数据。
      </p>
    </div>
  )
}

function TimelineSection({ timeline, updateTimelineItem, isOwner }) {
  return (
    <section id="timeline" className="timeline-section relative z-10 px-6 py-20 md:px-12">
      <h2 className="reveal mb-10 text-2xl font-light tracking-wide text-white">
        Growth Timeline
      </h2>
      {timeline.length === 0 ? (
        <div className="empty-project-state reveal glass-card rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center text-white/45">
          暂无成长时间线内容
        </div>
      ) : (
      <div className="relative ml-3 space-y-8 border-l border-white/10 pb-4">
        {timeline.map((item, index) => (
          <div
            key={item.id ?? item.phase}
            className="reveal relative pl-8"
            style={{ transitionDelay: `${index * 0.1}s` }}
          >
            <span
              className={`absolute -left-[6.5px] top-1.5 h-3 w-3 rounded-full ${
                (item.isCurrent ?? item.active) ? 'bg-blue-300 shadow-[0_0_16px_rgba(147,197,253,0.9)]' : 'bg-white/25'
              }`}
            />
            <div className={`mb-1 font-mono text-xs ${(item.isCurrent ?? item.active) ? 'text-blue-200' : 'text-white/35'}`}>
              {isOwner ? (
                <input
                  value={item.phase}
                  onChange={(e) => updateTimelineItem(index, 'phase', e.target.value)}
                  className="timeline-edit-field timeline-edit-field--phase"
                  aria-label="编辑时间线阶段"
                />
              ) : (
                item.phase
              )}
            </div>
            <div className="glass-card rounded-xl p-4">
              {isOwner ? (
                <div className="grid gap-3">
                  <input
                    value={item.title}
                    onChange={(e) => updateTimelineItem(index, 'title', e.target.value)}
                    className="timeline-edit-field text-lg font-medium"
                    aria-label="编辑时间线标题"
                  />
                  <textarea
                    value={item.desc}
                    rows={3}
                    onChange={(e) => updateTimelineItem(index, 'desc', e.target.value)}
                    className="timeline-edit-field resize-none text-sm leading-relaxed"
                    aria-label="编辑时间线说明"
                  />
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/45">{item.description ?? item.desc}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </section>
  )
}

function DossierSection({ dossier }) {
  const data = dossier || {}
  const status = Array.isArray(data.status) ? data.status : []
  const education = Array.isArray(data.education) ? data.education : []
  const highlights = Array.isArray(data.highlights) ? data.highlights : []
  const awards = Array.isArray(data.awards) ? data.awards : []
  const skills = Array.isArray(data.skills) ? data.skills : []

  return (
    <section id="resume" className="dossier-section relative z-10 px-6 py-16 md:px-12">
      <h2 className="reveal mb-10 flex items-center gap-3 border-l-4 border-blue-500 pl-4 text-2xl font-light tracking-wide text-white">
        User Dossier
      </h2>

      <div className="resume-panel reveal glass-card group relative overflow-hidden rounded-2xl border border-white/10 p-8 transition-colors hover:border-blue-400/30 md:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl transition-all group-hover:bg-blue-500/10" />

        <div className="relative z-10 mb-8 border-b border-white/10 pb-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 font-mono text-xs uppercase tracking-widest text-white/35">Personal Resume</div>
              <h3 className="text-4xl font-semibold tracking-widest text-white">{data.name || '? ?'}</h3>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-xs text-white/45">
              {status.map((item, index) => (
                <span key={item} className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1">
                  {index === 0 && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 font-mono text-sm text-white/70 md:flex-row md:gap-6">
            {data.phone && (
              <span className="flex items-center gap-2 transition-colors hover:text-white">
                <Phone size={16} className="text-white/35" />
                {data.phone}
              </span>
            )}
            {data.email && (
              <span className="flex items-center gap-2 transition-colors hover:text-white">
                <Mail size={16} className="text-white/35" />
                {data.email}
              </span>
            )}
          </div>
        </div>

        <div className="relative z-10 space-y-10">
          <DossierBlock title="Education">
            <div className="space-y-4">
              {education.map((item) => (
                <DossierRow key={`${item.school}-${item.period}`} title={item.school} meta={item.period} desc={item.major} active={item.active} />
              ))}
            </div>
          </DossierBlock>

          <DossierBlock title="Experience Highlights">
            <ul className="ml-1 space-y-3 border-l border-white/10 pl-2 text-sm leading-relaxed text-white/65">
              {highlights.map((item) => (
                <li key={item} className="relative pl-4 before:absolute before:-left-[5px] before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-white/20">
                  {item}
                </li>
              ))}
            </ul>
          </DossierBlock>

          <DossierBlock title="Awards">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {awards.map((item) => (
                <div key={`${item.title}-${item.level}`} className="rounded border border-white/5 bg-white/5 p-3 text-xs text-white/60 transition-colors hover:border-blue-400/30">
                  {item.title}
                  <span className="mt-1 block text-white">{item.level}</span>
                </div>
              ))}
            </div>
          </DossierBlock>

          <DossierBlock title="Core Skills">
            <div className="space-y-4 text-sm text-white/65">
              {skills.map((item) => (
                <SkillLine key={item.label} label={item.label}>{item.value}</SkillLine>
              ))}
            </div>
          </DossierBlock>
        </div>
      </div>
    </section>
  )
}

function DossierBlock({ title, children }) {
  return (
    <div>
      <h4 className="mb-4 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-white/35">
        <span className="h-1 w-1 rounded-full bg-blue-400" />
        {title}
      </h4>
      {children}
    </div>
  )
}

function DossierRow({ title, desc, meta, active }) {
  return (
    <div className="flex flex-col justify-between rounded border border-transparent p-3 transition-colors hover:border-white/5 hover:bg-white/5 md:flex-row md:items-center">
      <div className="text-base text-white">
        {title}
        <span className="mx-2 text-white/30">|</span>
        <span className="text-white/65">{desc}</span>
      </div>
      <div className={`mt-1 font-mono text-xs md:mt-0 ${active ? 'text-blue-300' : 'text-white/35'}`}>{meta}</div>
    </div>
  )
}

function SkillLine({ label, children }) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/5 pb-3 last:border-b-0 last:pb-1 md:flex-row md:gap-4">
      <span className="min-w-[120px] font-mono text-xs uppercase tracking-wider text-white/80">{label}</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

function ProjectCard({ project, revealDelay, updateProject, handleImageUpload, deleteProject, isOwner, onOpen }) {
  const fileInputRef = useRef(null)
  const projectImages = normalizeProjectImages(project)
  const coverImage = projectImages[0]

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      handleImageUpload(project.id, e.target.files)
    }
    e.target.value = ''
  }

  return (
    <article
      onClick={onOpen}
      className="project-card reveal glass-card group flex cursor-pointer flex-col rounded-2xl overflow-hidden relative shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_32px_100px_rgba(59,130,246,0.20)]"
      style={{ transitionDelay: revealDelay }}
    >
      {/* ---- 删除按钮 ---- */}
      {isOwner && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            deleteProject(project.id)
          }}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/40 backdrop-blur-sm transition-all hover:bg-red-500/30 hover:text-red-300"
          title="删除此卡片"
        >
          <Trash2 size={15} />
        </button>
      )}

      {/* ---- 图片上传区域 ---- */}
      {isOwner && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {coverImage ? (
        <div
          className={`relative aspect-video overflow-hidden border-b border-white/5 bg-black/30 ${isOwner ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            if (!isOwner) return
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
        >
          <img
            src={coverImage}
            alt={project.title}
            className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
          />
          {isOwner && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-sm text-white/80">点击替换图片</span>
            </div>
          )}
        </div>
      ) : (
        isOwner ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            className="flex aspect-video w-full flex-col items-center justify-center gap-2 border-b border-white/5 bg-white/[0.01] text-white/25 transition-colors hover:text-white/45"
          >
            <Upload size={28} strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-sm font-medium">点击上传项目图片</p>
              <p className="mt-0.5 text-xs">Mission Cover</p>
            </div>
          </button>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 border-b border-white/5 bg-white/[0.01] text-white/12">
            <Image size={28} strokeWidth={1} />
            <p className="text-xs">暂无图片</p>
          </div>
        )
      )}

      {/* ---- 卡片内容 ---- */}
      <div className="flex flex-1 flex-col gap-5 p-5 bg-white/[0.05] border-t border-white/10">
        {isOwner ? (
          <input
            type="text"
            value={project.title}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateProject(project.id, 'title', e.target.value)}
            className="w-full bg-transparent text-lg font-semibold text-white placeholder-white/20 outline-none"
            placeholder="输入项目标题"
          />
        ) : (
          <h3 className="text-lg font-semibold text-white">{project.title}</h3>
        )}

        {isOwner ? (
          <textarea
            value={project.description ?? project.desc}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateProject(project.id, 'desc', e.target.value)}
            rows={3}
            className="w-full resize-none bg-transparent text-sm leading-relaxed text-white/50 placeholder-white/15 outline-none"
            placeholder="输入项目介绍..."
          />
        ) : (
          <p className="text-sm leading-relaxed text-white/45">{project.description ?? project.desc}</p>
        )}

        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-auto inline-flex w-fit items-center rounded-full border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-white/65 transition-colors hover:border-blue-300/50 hover:text-white"
          >
            GitHub
          </a>
        )}
      </div>
    </article>
  )
}

function getProjectDetail(project) {
  const fallbackDetail = [
    '围绕目标场景拆解页面信息架构，明确核心展示内容、交互路径和最终呈现效果。',
    '通过组件化方式组织页面结构，保留项目截图、文字说明和评分记录，便于后续迭代复盘。',
    '适合继续补充项目背景、实现过程、关键难点、最终成果和个人反思，让每张卡片都能沉淀为完整作品说明。',
  ].join('\n')
  const detailText = project.longDescription || project.detailText || fallbackDetail

  return {
    overview: project.description || project.desc || '这是一个 AI Coding 练习项目，用于记录从需求拆解、页面实现到结果复盘的完整过程。',
    detailText,
    points: detailText.split('\n').map((point) => point.trim()).filter(Boolean),
  }
}

function ProjectDetailModal({ project, isOwner, updateProject, onClose, onZoom }) {
  const detail = getProjectDetail(project)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const images = normalizeProjectImages(project)
  const panels = images.length
    ? images.map((image, index) => ({ id: `${project.id}-${index}`, image, label: `展示图 ${index + 1}` }))
    : [{ id: `${project.id}-empty`, image: '', label: '展示图' }]
  const activePanel = panels[activeImageIndex]

  const showPrevImage = () => {
    setActiveImageIndex((index) => (index === 0 ? panels.length - 1 : index - 1))
  }

  const showNextImage = () => {
    setActiveImageIndex((index) => (index === panels.length - 1 ? 0 : index + 1))
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return createPortal(
    <div
      className="project-modal-root fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" aria-hidden="true" />
      <div
        className="project-detail-shell modal-enter glass-card relative z-10 w-full max-w-6xl rounded-2xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="关闭项目详情"
        >
          <X size={18} />
        </button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="project-carousel relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <button
              type="button"
              onClick={() => activePanel.image && onZoom({ src: activePanel.image, alt: `${project.title} ${activePanel.label}` })}
              className="group relative flex aspect-video w-full items-center justify-center overflow-hidden"
            >
              {activePanel.image ? (
                <>
                  <img
                    src={activePanel.image}
                    alt={`${project.title} ${activePanel.label}`}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white/75 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    <Maximize2 size={16} />
                  </span>
                </>
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/18">
                  <Image size={36} strokeWidth={1.4} />
                  <span className="text-sm">{activePanel.label}占位</span>
                </span>
              )}
            </button>

            {images.length > 1 && (
              <span className="absolute right-4 top-4 rounded-full bg-black/45 px-3 py-1 text-sm font-medium text-white/80 backdrop-blur-sm">
                {activeImageIndex + 1}/{images.length}
              </span>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrevImage}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/55 hover:text-white"
                  aria-label="上一张展示图"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/55 hover:text-white"
                  aria-label="下一张展示图"
                >
                  <ChevronRight size={22} />
                </button>

                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur-sm">
                  {panels.map((panel, index) => (
                    <button
                      key={panel.id}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === activeImageIndex
                          ? 'w-5 bg-white'
                          : 'w-2 bg-white/45 hover:bg-white/75'
                      }`}
                      aria-label={`查看第 ${index + 1} 张展示图`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col justify-between gap-6 pr-0 md:pr-8">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-white/30">
                Project Detail
              </span>
              {isOwner ? (
                <div className="mt-3 grid gap-3">
                  <input
                    value={project.title}
                    onChange={(e) => updateProject(project.id, 'title', e.target.value)}
                    className="detail-edit-field detail-edit-field--title"
                    aria-label="编辑项目名称"
                  />
                  <textarea
                    value={project.description ?? project.desc}
                    rows={3}
                    onChange={(e) => updateProject(project.id, 'description', e.target.value)}
                    className="detail-edit-field resize-none text-sm leading-relaxed"
                    aria-label="编辑项目简介"
                  />
                </div>
              ) : (
                <>
                  <h3 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
                    {project.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-white/55">
                    {detail.overview}
                  </p>
                </>
              )}

              <div className="mt-6 grid gap-3">
                <h4 className="text-sm font-medium text-white/80">详细说明</h4>
                {isOwner ? (
                  <textarea
                    value={detail.detailText}
                    rows={8}
                    onChange={(e) => updateProject(project.id, 'longDescription', e.target.value)}
                    className="detail-edit-field resize-none text-sm leading-relaxed"
                    aria-label="编辑项目详细说明"
                  />
                ) : (
                  <ul className="space-y-2 text-sm leading-relaxed text-white/50">
                    {detail.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
              {project.githubUrl ? (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-white/65 transition-colors hover:border-blue-300/50 hover:text-white"
                >
                  GitHub
                </a>
              ) : null}
              <span className="text-xs text-white/30">
                点击左侧展示图可放大查看
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ImageZoomModal({ image, onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="关闭图片预览"
      >
        <X size={20} />
      </button>
      <img
        src={image.src}
        alt={image.alt}
        className="max-h-[88vh] max-w-[94vw] rounded-xl object-contain shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  )
}

// ========================
// 底部组件
// ========================
function Footer({ isOwner, onUnlock, onLock }) {
  return (
    <footer className="relative z-10 border-t border-white/5 py-10 text-center text-sm text-white/30">
      <div className="flex flex-col items-center gap-4">
        <p>AI Coding Journal — 用代码记录成长</p>
        <button
          onClick={isOwner ? onLock : onUnlock}
          className="flex items-center gap-1.5 text-xs text-white/20 transition-colors hover:text-white/50"
        >
          {isOwner ? (
            <>
              <Unlock size={12} className="text-blue-400" />
              <span>后台模式 · 点击退出</span>
            </>
          ) : (
            <>
              <Lock size={12} />
              <span>展示模式 · 点击编辑</span>
            </>
          )}
        </button>
      </div>
    </footer>
  )
}

// ========================
// 解锁弹窗
// ========================
function UnlockModal({ onUnlock, onClose }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('请输入密码')
      return
    }
    if (password.length < 6) {
      setError('密码长度至少 6 位')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await onUnlock(password.trim())
      if (!result.success) {
        setError(result.error || '密码错误')
        setPassword('')
      }
    } catch {
      setError('验证失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 弹窗 */}
      <div
        className="glass-card relative z-10 w-full max-w-sm rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15">
            <Lock size={28} className="text-blue-400" />
          </div>
              <h3 className="text-lg font-semibold text-white">
                输入密码进入编辑后台
              </h3>
              <p className="mt-1 text-sm text-white/40">
                通过验证后可新增、修改和删除项目
              </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="输入密码"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/25"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white py-3 text-sm font-medium text-gray-900 transition-all hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? '验证中...' : '解锁'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-white/25 transition-colors hover:text-white/50"
          >
            取消
          </button>
        </form>
      </div>
    </div>
  )
}
