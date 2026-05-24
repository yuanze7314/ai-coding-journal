import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload,
  Star,
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
import { projects as publicProjects } from './data/projects'

// ========================
// 公开项目数据来自仓库静态文件，Vercel 部署后所有浏览器读取同一份内容。
// ========================
const PUBLIC_PROJECTS = publicProjects.map((project) => ({
  ...project,
  desc: project.description,
  detailText: project.summary,
  image: project.image,
  images: project.images?.length ? project.images : [project.image].filter(Boolean),
}))

// ========================
// localStorage 仅用于本地草稿，不作为线上公开数据源。
// ========================
const PROJECT_DRAFT_STORAGE_KEY = 'ai-coding-project-drafts'
const TIMELINE_STORAGE_KEY = 'ai-coding-timeline'
const OWNER_PASSWORD = '123456'

// TODO: 若后续需要真正的在线后台新增项目，接入 Vercel Postgres/Neon/Supabase
// 保存项目元数据，接入 Vercel Blob 保存项目图片，并通过受管理员登录保护的
// API Routes 处理新增、编辑和删除。

const defaultTimeline = [
  {
    phase: 'Current',
    title: '整理项目复盘与求职材料',
    desc: '系统梳理经管知识背景与 AI 技能库，沉淀可复用的策略、数据分析方法和代码片段。',
    active: true,
  },
  {
    phase: 'Phase 3',
    title: '开始搭建 AI Coding 项目展示网站',
    desc: '设计并部署专属个人成长档案，将项目截图、说明、评分和简历信息整合到同一展示系统。',
  },
  {
    phase: 'Phase 2',
    title: '开发 A股热点日报 Agent',
    desc: '结合大模型 API 与自动化工作流，实现金融信息的数据清洗、热点提炼与策略输出。',
  },
  {
    phase: 'Phase 1',
    title: '完善 AI 产品实习作品集',
    desc: '探索大模型在内容生产、行业分析和学术研究中的实际落地场景。',
  },
]

function loadProjectDrafts() {
  try {
    const raw = localStorage.getItem(PROJECT_DRAFT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('读取本地项目草稿失败', e)
  }
  return PUBLIC_PROJECTS
}

function saveProjectDrafts(projects) {
  try {
    localStorage.setItem(PROJECT_DRAFT_STORAGE_KEY, JSON.stringify(projects))
  } catch (e) {
    console.warn('保存本地项目草稿失败', e)
  }
}

function loadTimeline() {
  try {
    const raw = localStorage.getItem(TIMELINE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.warn('读取时间线失败', e)
  }
  return defaultTimeline
}

function saveTimeline(timeline) {
  try {
    localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(timeline))
  } catch (e) {
    console.warn('保存时间线失败', e)
  }
}

function normalizeProjectImages(project) {
  if (Array.isArray(project.images)) {
    return project.images.filter(Boolean)
  }
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
  const [projects, setProjects] = useState(() => PUBLIC_PROJECTS)
  const [timeline, setTimeline] = useState(() => loadTimeline())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)

  const nextIdRef = useRef(
    Math.max(...PUBLIC_PROJECTS.map((p) => p.id), 0) + 1
  )

  // 本地编辑仅保存为当前浏览器草稿，不会影响线上公开展示。
  useEffect(() => {
    if (isOwner) {
      saveProjectDrafts(projects)
    }
  }, [projects, isOwner])

  useEffect(() => {
    if (isOwner) {
      saveTimeline(timeline)
    }
  }, [timeline, isOwner])

  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal')
    const observer = new IntersectionObserver(
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

    revealElements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [projects.length])

  // ---- owner 相关 ----

  const handleUnlock = useCallback((password) => {
    if (password === OWNER_PASSWORD) {
      setIsOwner(true)
      setShowUnlockModal(false)
      // 解锁后进入本地草稿编辑模式。公开页面仍使用仓库静态数据。
      const drafts = loadProjectDrafts()
      nextIdRef.current = Math.max(...drafts.map((p) => p.id), 0) + 1
      setProjects(drafts)
      setTimeline(loadTimeline())
      return { success: true }
    }
    return { success: false, error: '密码错误' }
  }, [])

  const handleLock = useCallback(() => {
    setIsOwner(false)
    // 退出编辑模式后恢复线上公开数据，避免公开展示依赖本地草稿。
    setProjects(PUBLIC_PROJECTS)
    setTimeline(loadTimeline())
  }, [])

  // ---- 核心操作函数 ----

  const updateProject = useCallback((id, key, value) => {
    if (!isOwner) return
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [key]: value } : p))
    )
  }, [isOwner])

  const handleImageUpload = useCallback(
    async (id, files) => {
      if (!isOwner || !files) return
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
      if (!imageFiles.length) return
      const uploadedImages = await Promise.all(imageFiles.map(readImageFile))

      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== id) return project
          const images = [...normalizeProjectImages(project), ...uploadedImages]
          return { ...project, images, image: images[0] || '' }
        })
      )
    },
    [isOwner]
  )

  const updateTimelineItem = useCallback((index, key, value) => {
    if (!isOwner) return
    setTimeline((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    )
  }, [isOwner])

  const addProject = useCallback(() => {
    if (!isOwner) return
    const newId = nextIdRef.current
    nextIdRef.current += 1
    const count = newId
    setProjects((prev) => [
      ...prev,
      {
        id: newId,
        title: `AI Coding 项目 ${String(count).padStart(2, '0')}`,
        desc: '用于展示本次 AI Coding 练习的核心页面、功能效果和个人评分。',
        description: '用于展示本次 AI Coding 练习的核心页面、功能效果和个人评分。',
        subtitle: 'Local Draft',
        techStack: [],
        rating: 0,
        image: '',
        images: [],
        summary: '本项目当前仅保存在本机浏览器草稿中，不会自动同步到线上公开网站。',
        demoUrl: '',
        githubUrl: '',
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ])
  }, [isOwner])

  const deleteProject = useCallback((id) => {
    if (!isOwner) return
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }, [isOwner])

  // ---- 平滑滚动 ----
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
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
          <DossierSection />
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
            title={isOwner ? '锁定为只读模式' : '输入密码解锁编辑'}
          >
            {isOwner ? (
              <>
                <Unlock size={14} className="text-blue-400" />
                <span className="hidden lg:inline">已解锁</span>
              </>
            ) : (
              <>
                <Lock size={14} />
                <span className="hidden lg:inline">只读</span>
              </>
            )}
          </button>
        </div>

        {/* 移动端 */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={isOwner ? onLock : onUnlock}
            className="text-white/30 hover:text-white/60"
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
  updateProject,
  handleImageUpload,
  addProject,
  deleteProject,
  isOwner,
}) {
  const [selectedProject, setSelectedProject] = useState(null)
  const [zoomImage, setZoomImage] = useState(null)
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

        {projects.length > 0 ? (
          <div className="project-grid grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                revealDelay={`${index * 0.08}s`}
                updateProject={updateProject}
                handleImageUpload={handleImageUpload}
                deleteProject={deleteProject}
                isOwner={isOwner}
                onOpen={() => setSelectedProject(project)}
              />
            ))}
            {isOwner && (
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
          <EmptyProjectsState isOwner={isOwner} onAdd={addProject} />
        )}
      </div>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          isOwner={isOwner}
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
      <h3 className="text-xl font-medium text-white">暂无公开项目</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/45">
        公开作品集数据应写入仓库内的静态数据文件，并使用 Vercel 可访问的图片路径。
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

function TimelineSection({ timeline, updateTimelineItem, isOwner }) {
  return (
    <section id="timeline" className="timeline-section relative z-10 px-6 py-20 md:px-12">
      <h2 className="reveal mb-10 text-2xl font-light tracking-wide text-white">
        Growth Timeline
      </h2>
      <div className="relative ml-3 space-y-8 border-l border-white/10 pb-4">
        {timeline.map((item, index) => (
          <div
            key={item.phase}
            className="reveal relative pl-8"
            style={{ transitionDelay: `${index * 0.1}s` }}
          >
            <span
              className={`absolute -left-[6.5px] top-1.5 h-3 w-3 rounded-full ${
                item.active ? 'bg-blue-300 shadow-[0_0_16px_rgba(147,197,253,0.9)]' : 'bg-white/25'
              }`}
            />
            <div className={`mb-1 font-mono text-xs ${item.active ? 'text-blue-200' : 'text-white/35'}`}>
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
                  <p className="mt-2 text-sm leading-relaxed text-white/45">{item.desc}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DossierSection() {
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
              <div className="mb-2 font-mono text-xs uppercase tracking-widest text-white/35">
                Personal Resume
              </div>
              <h3 className="text-4xl font-semibold tracking-widest text-white">袁 泽</h3>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-xs text-white/45">
              <span className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                立刻到岗
              </span>
              <span className="rounded border border-white/10 bg-white/5 px-2 py-1">出勤五天</span>
              <span className="rounded border border-white/10 bg-white/5 px-2 py-1">六个月以上</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 font-mono text-sm text-white/70 md:flex-row md:gap-6">
            <span className="flex items-center gap-2 transition-colors hover:text-white">
              <Phone size={16} className="text-white/35" />
              18732865855
            </span>
            <span className="flex items-center gap-2 transition-colors hover:text-white">
              <Mail size={16} className="text-white/35" />
              yzz7314@163.com
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-10">
          <DossierBlock title="Education">
            <div className="space-y-4">
              <DossierRow title="中国海洋大学" meta="2025.09 - 2028.06" desc="区域经济学" active />
              <DossierRow title="中国石油大学（北京）" meta="2021.09 - 2025.06" desc="经济学" />
            </div>
          </DossierBlock>

          <DossierBlock title="Experience Highlights">
            <ul className="ml-1 space-y-3 border-l border-white/10 pl-2 text-sm leading-relaxed text-white/65">
              <li className="relative pl-4 before:absolute before:-left-[5px] before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-white/20">
                <span className="font-medium text-white">快手主站 - 热点运营中心策略产品经理：</span>
                负责热词挖掘策略与热点 push 看板。
              </li>
              <li className="relative pl-4 before:absolute before:-left-[5px] before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-white/20">
                <span className="font-medium text-white">AI 系统搭建：</span>
                搭建多 Agent 长文本播客自动化生产系统，覆盖 PDF 解析、脚本生成、质检与 TTS 合成。
              </li>
              <li className="relative pl-4 before:absolute before:-left-[5px] before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-white/20">
                <span className="font-medium text-white">数据分析建模：</span>
                完成评论数据分析、问卷建模、动态定价补货等数据分析与建模项目。
              </li>
            </ul>
          </DossierBlock>

          <DossierBlock title="Awards">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ['美国大学生数学建模竞赛', '国家级一等奖'],
                ['“正大杯”全国大学生市场调查与分析大赛', '国家级三等奖'],
                ['中国国际大学生创新大赛（2024）', '国家级三等奖'],
                ['全国大学生数学建模竞赛', '省级特等奖'],
              ].map(([name, result]) => (
                <div
                  key={name}
                  className="rounded border border-white/5 bg-white/5 p-3 text-xs text-white/60 transition-colors hover:border-blue-400/30"
                >
                  {name}
                  <span className="mt-1 block text-white">{result}</span>
                </div>
              ))}
            </div>
          </DossierBlock>

          <DossierBlock title="Core Skills">
            <div className="space-y-4 text-sm text-white/65">
              <SkillLine label="Data Analytics">熟悉 Python、SQL，能够完成数据清洗、建模分析与结果解读。</SkillLine>
              <SkillLine label="AI Application">持续使用 ChatGPT、Gemini、DeepSeek 等工具提升信息处理和方案产出效率。</SkillLine>
              <SkillLine label="AI Coding">熟悉 Claude Code、Codex、Cursor、Trae、Coze，具备将想法快速落地为原型的能力。</SkillLine>
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
      <div className={`mt-1 font-mono text-xs md:mt-0 ${active ? 'text-blue-300' : 'text-white/35'}`}>
        {meta}
      </div>
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

// ========================
// 单张项目卡片组件
// ========================
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
          className={`relative overflow-hidden ${isOwner ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            if (!isOwner) return
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
        >
          <img
            src={coverImage}
            alt={project.title}
            className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105"
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
            className="flex h-48 w-full flex-col items-center justify-center gap-2 border-b border-white/5 bg-white/[0.01] text-white/25 transition-colors hover:text-white/45"
          >
            <Upload size={28} strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-sm font-medium">点击上传项目图片</p>
              <p className="mt-0.5 text-xs">Mission Cover</p>
            </div>
          </button>
        ) : (
          <div className="flex h-48 w-full flex-col items-center justify-center gap-2 border-b border-white/5 bg-white/[0.01] text-white/12">
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
            value={project.desc}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateProject(project.id, 'desc', e.target.value)}
            rows={3}
            className="w-full resize-none bg-transparent text-sm leading-relaxed text-white/50 placeholder-white/15 outline-none"
            placeholder="输入项目介绍..."
          />
        ) : (
          <p className="text-sm leading-relaxed text-white/45">{project.desc}</p>
        )}

        <StarRating
          rating={project.rating}
          onChange={(val) => updateProject(project.id, 'rating', val)}
          interactive={isOwner}
        />
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
  const detailText = project.detailText || fallbackDetail

  return {
    overview: project.desc || '这是一个 AI Coding 练习项目，用于记录从需求拆解、页面实现到结果复盘的完整过程。',
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

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="project-detail-shell glass-card relative w-full max-w-6xl rounded-2xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:p-6"
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
              className="group relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden md:aspect-[5/4] lg:aspect-[4/5]"
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

            <span className="absolute right-4 top-4 rounded-full bg-black/45 px-3 py-1 text-sm font-medium text-white/80 backdrop-blur-sm">
              {images.length ? activeImageIndex + 1 : 0}/{images.length}
            </span>

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
                    value={project.desc}
                    rows={3}
                    onChange={(e) => updateProject(project.id, 'desc', e.target.value)}
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
                    onChange={(e) => updateProject(project.id, 'detailText', e.target.value)}
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
              <StarRating
                rating={project.rating}
                onChange={(val) => updateProject(project.id, 'rating', val)}
                interactive={isOwner}
              />
              <span className="text-xs text-white/30">
                点击左侧展示图可放大查看
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImageZoomModal({ image, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm"
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
    </div>
  )
}

// ========================
// 星标评分组件
// ========================
function StarRating({ rating, onChange, interactive = true }) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {stars.map((star) =>
          interactive ? (
            <button
              key={star}
              onClick={(e) => {
                e.stopPropagation()
                onChange(star)
              }}
              className="star-btn p-0.5"
              title={`${star} 星`}
            >
              <Star
                size={20}
                fill={star <= rating ? '#fff' : 'none'}
                className={star <= rating ? 'text-white' : 'text-white/15'}
              />
            </button>
          ) : (
            <span key={star} className="p-0.5">
              <Star
                size={20}
                fill={star <= rating ? '#fff' : 'none'}
                className={star <= rating ? 'text-white' : 'text-white/15'}
              />
            </span>
          )
        )}
      </div>
      <span className="text-sm font-medium text-white/50 tabular-nums">
        {rating.toFixed(1)} / 5.0
      </span>
    </div>
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
              <span>编辑模式 · 点击锁定</span>
            </>
          ) : (
            <>
              <Lock size={12} />
              <span>只读模式 · 点击解锁</span>
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
            输入密码解锁
          </h3>
          <p className="mt-1 text-sm text-white/40">
            解锁后可编辑项目内容
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
