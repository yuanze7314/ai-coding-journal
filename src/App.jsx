import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Briefcase,
  Upload,
  Image,
  Plus,
  X,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Phone,
  Mail,
  GitBranch,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { AdminPage } from './pages/AdminPage'
import { adminAuth, projectService } from './services/projectService'
import { capabilitySummaryService, defaultCapabilitySummary } from './services/capabilitySummaryService'
import { resumeService } from './services/resumeService'
import { MiniResumeCard } from './components/resume/MiniResumeCard'
import { ResumeDrawer } from './components/resume/ResumeDrawer'
import { resumeData } from './components/resume/ResumeData'

const OWNER_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '123456'
const PAGE_SECTION_IDS = ['hero', 'capabilities', 'missions', 'contact']

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

function useEscapeToClose(onClose, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onClose])
}

// ========================
// 主 App 组件
// ========================
export default function App() {
  const [projects, setProjects] = useState([])
  const [isProjectsLoading, setIsProjectsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('hero')
  const [isOwner, setIsOwner] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [isResumeDrawerOpen, setIsResumeDrawerOpen] = useState(false)
  const [portfolioResumeData, setPortfolioResumeData] = useState(resumeData)
  const [capabilitySummary, setCapabilitySummary] = useState(defaultCapabilitySummary)
  const resumeLoadedRef = useRef(false)
  const capabilitySummaryLoadedRef = useRef(false)
  const resumeTriggerRef = useRef(null)
  const activeSectionRef = useRef(activeSection)

  useEffect(() => {
    activeSectionRef.current = activeSection
  }, [activeSection])

  const loadDisplayData = useCallback(async () => {
    setIsProjectsLoading(true)
    try {
      const nextProjects = await projectService.getFeaturedProjects()
      setProjects(nextProjects)
    } catch (error) {
      console.warn('加载展示数据失败', error)
    } finally {
      setIsProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    setIsProjectsLoading(true)
    projectService.getFeaturedProjects().then((nextProjects) => {
      if (!mounted) return
      setProjects(nextProjects)
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
    let mounted = true

    resumeService.getResume().then((nextResume) => {
      if (!mounted) return
      resumeLoadedRef.current = true
      setPortfolioResumeData(nextResume)
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!resumeLoadedRef.current) return
    resumeService.updateResume(portfolioResumeData).catch((error) => {
      console.warn('保存简历数据失败', error)
    })
  }, [portfolioResumeData])

  useEffect(() => {
    let mounted = true

    capabilitySummaryService.getSummary().then((nextSummary) => {
      if (!mounted) return
      capabilitySummaryLoadedRef.current = true
      setCapabilitySummary(nextSummary)
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!capabilitySummaryLoadedRef.current) return
    capabilitySummaryService.updateSummary(capabilitySummary).catch((error) => {
      console.warn('保存个人总结数据失败', error)
    })
  }, [capabilitySummary])

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
  }, [isAdminMode, projects.length, isProjectsLoading])

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

  const handleReturnHomeFromAdmin = useCallback(() => {
    setIsAdminMode(false)
    setShowUnlockModal(false)
    loadDisplayData().catch((error) => {
      console.warn('重新加载展示数据失败', error)
    })
  }, [loadDisplayData])

  const updateResumeData = useCallback((updater) => {
    setPortfolioResumeData((current) => (
      typeof updater === 'function' ? updater(current) : updater
    ))
  }, [])

  const updateCapabilitySummary = useCallback((updater) => {
    setCapabilitySummary((current) => (
      typeof updater === 'function' ? updater(current) : updater
    ))
  }, [])

  // ---- 核心操作函数 ----

  const updateProject = useCallback(() => {}, [])
  const handleImageUpload = useCallback(() => {}, [])

  const updateTimelineItem = useCallback(() => {}, [])

  const addProject = useCallback(() => {}, [])
  const deleteProject = useCallback(() => {}, [])

  // ---- 平滑滚动 ----
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    activeSectionRef.current = id
    setActiveSection(id)
  }

  const handleResumeNavigate = (id) => {
    setIsResumeDrawerOpen(false)
    window.setTimeout(() => scrollTo(id), 220)
  }

  useEffect(() => {
    if (isAdminMode) return undefined

    const scroller = document.getElementById('scroll-container')

    if (!scroller) return undefined

    const updateActiveSection = () => {
      const scrollerRect = scroller.getBoundingClientRect()
      const activationOffset = Math.min(Math.max(scrollerRect.height * 0.28, 132), 260)
      const sections = PAGE_SECTION_IDS.map((id) => {
        const element = document.getElementById(id)
        if (!element) return null
        const rect = element.getBoundingClientRect()
        return {
          id,
          top: rect.top - scrollerRect.top,
          bottom: rect.bottom - scrollerRect.top,
        }
      }).filter(Boolean)

      const containingSections = sections.filter(
        (section) => section.top <= activationOffset && section.bottom > activationOffset
      )
      const currentVisibleSection = containingSections.find((section) => section.id === activeSectionRef.current)
      const latestPassedSection = sections.reduce(
        (latest, section) => (section.top <= activationOffset ? section : latest),
        null
      )
      const nextSection = currentVisibleSection?.id
        || containingSections[0]?.id
        || latestPassedSection?.id
        || PAGE_SECTION_IDS[0]

      if (nextSection !== activeSectionRef.current) {
        activeSectionRef.current = nextSection
        setActiveSection(nextSection)
      }
    }

    let frameId = 0
    const scheduleActiveSectionUpdate = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateActiveSection()
      })
    }

    updateActiveSection()
    scroller.addEventListener('scroll', scheduleActiveSectionUpdate, { passive: true })
    window.addEventListener('scroll', scheduleActiveSectionUpdate, { passive: true })
    window.addEventListener('resize', scheduleActiveSectionUpdate)

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      scroller.removeEventListener('scroll', scheduleActiveSectionUpdate)
      window.removeEventListener('scroll', scheduleActiveSectionUpdate)
      window.removeEventListener('resize', scheduleActiveSectionUpdate)
    }
  }, [isAdminMode, projects.length, isProjectsLoading])

  return (
    isAdminMode ? (
      <AdminPage authenticated onExit={handleReturnHomeFromAdmin} />
    ) : (
      <div className="mission-shell claude-code-theme relative min-h-screen overflow-hidden bg-black text-white/90">
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <div className="game-bg" aria-hidden="true" />
      <div className="bg-overlay-left" aria-hidden="true" />

      <div className="scroll-panel" id="scroll-container">
        {/* ========== 顶部导航栏 ========== */}
        <Navbar
          scrollTo={scrollTo}
          isOwner={isOwner}
          onUnlock={() => setShowUnlockModal(true)}
          onLock={handleLock}
        />

        {/* ========== Hero 区 ========== */}
          <div className="doc-layout">
            <LeftSidebar activeSection={activeSection} scrollTo={scrollTo} />

            <main id="main-content" className="main-content">
        <HeroSection scrollTo={scrollTo} />

        <CapabilityProofSection
          data={capabilitySummary}
          isOwner={isOwner}
          onUpdate={updateCapabilitySummary}
        />

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

        <ContactSection contacts={portfolioResumeData.contacts} />

        {/* ========== 底部 ========== */}
        <Footer
          isOwner={isOwner}
          onUnlock={() => setShowUnlockModal(true)}
          onLock={handleLock}
        />
            </main>

            <aside className="resume-rail" aria-label="Mini resume entry">
              <MiniResumeCard ref={resumeTriggerRef} data={portfolioResumeData} onOpen={() => setIsResumeDrawerOpen(true)} />
            </aside>
          </div>
      </div>

      {/* ========== 解锁弹窗 ========== */}
      <ResumeDrawer
        data={portfolioResumeData}
        isOpen={isResumeDrawerOpen}
        isOwner={isOwner}
        onUpdate={updateResumeData}
        onClose={() => setIsResumeDrawerOpen(false)}
        onNavigate={handleResumeNavigate}
        returnFocusRef={resumeTriggerRef}
      />

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
function LeftSidebar({ activeSection, scrollTo }) {
  const groups = [
    {
      title: 'Platform',
      items: [
        { label: '能力总览', target: 'capabilities' },
        { label: '项目展示', target: 'missions' },
        { label: '联系方式', target: 'contact' },
      ],
    },
  ]

  return (
    <aside className="left-sidebar" aria-label="页面栏目导航">
      <button
        type="button"
        className={`side-link side-link-home ${activeSection === 'hero' ? 'active' : ''}`}
        onClick={() => scrollTo('hero')}
      >
        Overview
      </button>
      {groups.map((group) => (
        <div key={group.title} className="side-group">
          <div className="side-group-title">{group.title}</div>
          {group.items.map((item) => (
            <button
              key={item.target}
              type="button"
              className={`side-link ${activeSection === item.target ? 'active' : ''}`}
              onClick={() => scrollTo(item.target)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </aside>
  )
}

function Navbar({ scrollTo, isOwner, onUnlock, onLock }) {
  return (
    <nav className="glass sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4 md:px-12">
        {/* Logo */}
        <button
          onClick={() => scrollTo('hero')}
          className="brand-mark flex min-h-11 items-center gap-2 font-mono text-sm tracking-[0.22em] text-white"
          aria-label="回到首页"
        >
          <span>YZ</span>
          <span className="text-white/35">// SYSTEM.OS</span>
        </button>

        {/* 桌面导航 */}
        <div className="hidden items-center gap-8 md:flex">
          {/* 锁定/解锁状态 */}
          <button
            onClick={isOwner ? onLock : onUnlock}
            className="ml-2 flex min-h-11 items-center gap-1.5 text-xs text-white/30 transition-colors hover:text-white/60"
            title={isOwner ? '退出后台管理' : '输入密码进入编辑后台'}
            aria-label={isOwner ? '退出编辑后台' : '进入编辑后台'}
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
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-white/30 hover:text-white/60"
            aria-label={isOwner ? '退出编辑后台' : '进入编辑后台'}
          >
            {isOwner ? <Unlock size={16} className="text-blue-400" /> : <Lock size={16} />}
          </button>
        </div>
      </div>

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
        <div className="hero-kicker reveal mb-5 font-mono text-xs uppercase text-blue-200/80">
          Personal AI Portfolio
        </div>
        <h1 className="reveal mb-8 text-6xl font-semibold leading-tight tracking-tight text-white md:text-[5.5rem]">
          <span className="hero-title-accent">Yz AI Coding</span>
          <span className="hero-title-main">个人项目档案</span>
        </h1>

        <p className="reveal mb-10 max-w-2xl text-xl font-light leading-relaxed text-white/50 md:text-2xl">
          记录我如何用 AI 编程、数据分析和自动化 Agent，把分散的想法变成可展示的项目系统。
        </p>

        <div className="hero-actions reveal flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => scrollTo('missions')}
            className="cta-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-medium"
          >
            查看项目
            <ChevronRight size={17} className="ml-2" />
          </button>
        </div>
      </div>
    </section>
  )
}

function CapabilityProofSection({ data, isOwner, onUpdate }) {
  const items = Array.isArray(data.items) ? data.items : []

  const updateHeading = (value) => {
    onUpdate?.((current) => ({ ...current, heading: value }))
  }

  const updateSummary = (value) => {
    onUpdate?.((current) => ({ ...current, summary: value }))
  }

  const updateItem = (index, key, value) => {
    onUpdate?.((current) => ({
      ...current,
      items: (current.items || []).map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }))
  }

  return (
    <section id="capabilities" className="capability-section relative z-10 px-6 py-12 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="capability-section-header mb-10">
          {isOwner ? (
            <div className="capability-edit-heading">
              <label>
                <span>区块标题</span>
                <input
                  value={data.heading}
                  onChange={(event) => updateHeading(event.target.value)}
                  aria-label="编辑个人总结标题"
                />
              </label>
              <label>
                <span>说明文字</span>
                <textarea
                  value={data.summary || ''}
                  rows={2}
                  onChange={(event) => updateSummary(event.target.value)}
                  aria-label="编辑个人总结说明文字"
                />
              </label>
            </div>
          ) : (
            <>
              <h2 className="section-heading">
                {data.heading}
              </h2>
              {data.summary && (
                <p className="section-lead capability-summary-lead">
                  {data.summary}
                </p>
              )}
            </>
          )}
        </div>
        <div className="capability-grid grid gap-4 md:grid-cols-3">
          {items.map((item, index) => (
            <article
              key={`capability-summary-${index}`}
              className={`capability-card reveal glass-card rounded-2xl p-5 ${isOwner ? 'is-editing' : ''}`}
              style={{ transitionDelay: `${index * 0.08}s` }}
            >
              {isOwner ? (
                <div className="capability-edit-card">
                  <label>
                    <span>分类标识</span>
                    <input
                      value={item.label}
                      onChange={(event) => updateItem(index, 'label', event.target.value)}
                      aria-label={`编辑第 ${index + 1} 张总结卡分类`}
                    />
                  </label>
                  <label>
                    <span>标题</span>
                    <textarea
                      value={item.title}
                      rows={2}
                      onChange={(event) => updateItem(index, 'title', event.target.value)}
                      aria-label={`编辑第 ${index + 1} 张总结卡标题`}
                    />
                  </label>
                  <label>
                    <span>描述</span>
                    <textarea
                      value={item.description}
                      rows={4}
                      onChange={(event) => updateItem(index, 'description', event.target.value)}
                      aria-label={`编辑第 ${index + 1} 张总结卡描述`}
                    />
                  </label>
                  <label>
                    <span>代表项目</span>
                    <textarea
                      value={item.proof}
                      rows={2}
                      onChange={(event) => updateItem(index, 'proof', event.target.value)}
                      aria-label={`编辑第 ${index + 1} 张总结卡代表项目`}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-semibold leading-snug text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/52">{item.description}</p>
                  <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/38">
                    代表项目：{item.proof}
                  </p>
                </>
              )}
            </article>
          ))}
        </div>
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
        <div className="projects-section-header mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="projects-section-heading">
              <h2 className="section-heading">
                项目展示
              </h2>
              <p className="section-lead">
                按能力路径浏览项目：AI 原型、Agent 工作流、数据分析和建模优化。
              </p>
            </div>

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
      <h3 className="text-xl font-medium text-white">暂无项目</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/45">
        当前筛选下还没有可展示项目，可以切换分类继续查看。
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
        关于我
      </h2>

      <div className="resume-panel reveal glass-card group relative overflow-hidden rounded-2xl border border-white/10 p-8 transition-colors hover:border-blue-400/30 md:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl transition-all group-hover:bg-blue-500/10" />

        <div className="relative z-10 mb-8 border-b border-white/10 pb-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 font-mono text-xs uppercase tracking-widest text-white/35">Personal Profile</div>
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
          <DossierBlock title="教育经历">
            <div className="space-y-4">
              {education.map((item) => (
                <DossierRow key={`${item.school}-${item.period}`} title={item.school} meta={item.period} desc={item.major} active={item.active} />
              ))}
            </div>
          </DossierBlock>

          <DossierBlock title="经历亮点">
            <ul className="ml-1 space-y-3 border-l border-white/10 pl-2 text-sm leading-relaxed text-white/65">
              {highlights.map((item) => (
                <li key={item} className="relative pl-4 before:absolute before:-left-[5px] before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-white/20">
                  {item}
                </li>
              ))}
            </ul>
          </DossierBlock>

          <DossierBlock title="奖项成果">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {awards.map((item) => (
                <div key={`${item.title}-${item.level}`} className="rounded border border-white/5 bg-white/5 p-3 text-xs text-white/60 transition-colors hover:border-blue-400/30">
                  {item.title}
                  <span className="mt-1 block text-white">{item.level}</span>
                </div>
              ))}
            </div>
          </DossierBlock>

          <DossierBlock title="能力栈">
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
  const githubHref = typeof project.githubUrl === 'string' ? project.githubUrl.trim() : ''

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      handleImageUpload(project.id, e.target.files)
    }
    e.target.value = ''
  }

  return (
    <article
      className="project-card ai-writing-card reveal glass-card group flex flex-col rounded-2xl overflow-hidden relative shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_100px_rgba(59,130,246,0.20)]"
      style={{ transitionDelay: revealDelay }}
    >
      {/* ---- 删除按钮 ---- */}
      {isOwner && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            deleteProject(project.id)
          }}
          className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/40 backdrop-blur-sm transition-all hover:bg-red-500/30 hover:text-red-300"
          title="删除此卡片"
          aria-label={`删除项目：${project.title}`}
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
          className={`project-card-media relative aspect-video overflow-hidden border-b border-white/5 bg-black/30 ${isOwner ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            if (!isOwner) return
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
        >
          <img
            src={coverImage}
            alt={project.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
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
            className="project-card-media flex aspect-video w-full flex-col items-center justify-center gap-2 border-b border-white/5 bg-white/[0.01] text-white/25 transition-colors hover:text-white/45"
          >
            <Upload size={28} strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-sm font-medium">点击上传项目图片</p>
              <p className="mt-0.5 text-xs">Mission Cover</p>
            </div>
          </button>
        ) : (
          <div className="project-card-media flex aspect-video w-full flex-col items-center justify-center gap-2 border-b border-white/5 bg-white/[0.01] text-white/12">
            <Image size={28} strokeWidth={1} />
            <p className="text-xs">暂无图片</p>
          </div>
        )
      )}

      {/* ---- 卡片内容 ---- */}
      <div className="project-card-body flex flex-1 flex-col gap-5 p-5 bg-white/[0.05] border-t border-white/10">
        <div className="project-card-toolbar" aria-hidden="true">
          <span />
          <span />
          <span />
          <i />
        </div>
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
          <p
            className="project-card-description text-sm leading-relaxed text-white/45"
            title={project.description ?? project.desc}
          >
            {project.description ?? project.desc}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onOpen}
            className="detail-link inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-xs font-medium"
          >
            查看详情
            <ChevronRight size={15} className="detail-icon ml-1.5" />
          </button>

          {githubHref && (
            <a
              href={githubHref}
              target="_blank"
              rel="noreferrer"
              className="github-link inline-flex min-h-11 w-fit items-center rounded-full border px-4 py-2 text-xs font-medium"
              aria-label={`打开 ${project.title} 的 GitHub 相关页面`}
            >
              <GitBranch size={14} aria-hidden="true" />
              GitHub
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

function getProjectDetail(project) {
  const detailText = project.longDescription || project.detailText || ''

  return {
    overview: project.description || project.desc || '这是一个 AI Coding 练习项目，用于记录从需求拆解、页面实现到结果复盘的完整过程。',
    detailText,
    points: detailText.split('\n').map((point) => point.trim()).filter(Boolean),
  }
}

function ProjectDetailModal({ project, isOwner, updateProject, onClose, onZoom }) {
  const detail = getProjectDetail(project)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const closeButtonRef = useRef(null)
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

  useEscapeToClose(onClose)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return createPortal(
    <div
      className="project-modal-root fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-detail-title"
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" aria-hidden="true" />
      <div
        className="project-detail-shell modal-enter glass-card relative z-10 w-full max-w-6xl rounded-2xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="关闭项目详情"
        >
          <X size={18} />
        </button>

        <div className="project-detail-layout grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
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
                    loading="lazy"
                    decoding="async"
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

          <div className="project-detail-content flex flex-col justify-between gap-6 pr-0 md:pr-8">
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
                  <h3 id="project-detail-title" className="mt-3 text-2xl font-semibold text-white md:text-3xl">
                    {project.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-white/55">
                    {detail.overview}
                  </p>
                </>
              )}

              <div className="project-story-grid mt-7 grid gap-3">
                <h4 className="text-sm font-medium text-white/80">项目详细说明</h4>
                {isOwner ? (
                  <textarea
                    value={detail.detailText}
                    rows={8}
                    onChange={(e) => updateProject(project.id, 'longDescription', e.target.value)}
                    className="detail-edit-field resize-none text-sm leading-relaxed"
                    aria-label="编辑项目详细说明"
                  />
                ) : (
                  <div className="project-detail-copy rounded-xl border border-white/8 bg-white/[0.035] p-4">
                    {detail.points.length > 0 ? (
                      detail.points.map((point, index) => (
                        <p key={`${project.id}-detail-${index}`} className="text-sm leading-relaxed text-white/58">
                          {point}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm leading-relaxed text-white/42">暂无项目详细说明。</p>
                    )}
                  </div>
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
  const closeButtonRef = useRef(null)

  useEscapeToClose(onClose)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="关闭图片预览"
      >
        <X size={20} />
      </button>
      <img
        src={image.src}
        alt={image.alt}
        decoding="async"
        className="max-h-[88vh] max-w-[94vw] rounded-xl object-contain shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  )
}

function ContactSection({ contacts = [] }) {
  return (
    <section id="contact" className="contact-section site-bottom-contact relative z-10 px-6 py-16 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="contact-section-header mb-8">
          <h2 className="section-heading">
            联系方式
          </h2>
        </div>

        <div className="site-contact-list">
          {contacts.map((contact) => {
            const Icon = contact.label === 'Email'
              ? Mail
              : contact.label === 'Phone'
                ? Phone
                : contact.label === 'GitHub'
                  ? GitBranch
                  : Briefcase

            return (
              <a
                key={contact.label}
                href={contact.href}
                target={contact.href.startsWith('http') ? '_blank' : undefined}
                rel={contact.href.startsWith('http') ? 'noreferrer' : undefined}
                className="site-contact-item"
              >
                <Icon size={18} aria-hidden="true" />
                <span>
                  <strong>{contact.label}</strong>
                  <small>{contact.value}</small>
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </section>
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
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs text-white/20 transition-colors hover:text-white/50"
          aria-label={isOwner ? '退出编辑后台' : '进入编辑后台'}
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

  useEscapeToClose(onClose)

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-modal-title"
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
              <h3 id="unlock-modal-title" className="text-lg font-semibold text-white">
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
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/25 hover:text-white/50"
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
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
