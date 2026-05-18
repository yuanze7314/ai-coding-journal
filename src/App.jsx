import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload,
  Star,
  Image,
  ArrowRight,
  Plus,
  Menu,
  X,
  Sparkles,
  Trash2,
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'

// ========================
// 默认项目数据
// ========================
const defaultProjects = [
  {
    id: 1,
    title: 'AI Coding 项目 01',
    desc: '用于展示本次 AI Coding 练习的核心页面、功能效果和个人评分。',
    rating: 4,
    image: '',
  },
  {
    id: 2,
    title: 'AI Coding 项目 02',
    desc: '可以上传项目截图，并补充项目目的、实现方式和展示亮点。',
    rating: 3,
    image: '',
  },
  {
    id: 3,
    title: 'AI Coding 项目 03',
    desc: '适合记录网页、App 原型、小工具或自动化脚本等练习成果。',
    rating: 5,
    image: '',
  },
]

// ========================
// localStorage 工具函数
// ========================
const STORAGE_KEY = 'ai-coding-projects'
const PASSWORD_KEY = 'ai-coding-password'

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('读取本地数据失败', e)
  }
  return defaultProjects
}

function saveProjects(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch (e) {
    console.warn('保存本地数据失败', e)
  }
}

// 简易密码哈希（不可逆，仅用于本地校验）
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode('aicj-' + password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function getStoredHash() {
  try {
    return localStorage.getItem(PASSWORD_KEY)
  } catch {
    return null
  }
}

function setStoredHash(hash) {
  try {
    localStorage.setItem(PASSWORD_KEY, hash)
  } catch {
    // ignore
  }
}

// ========================
// 主 App 组件
// ========================
export default function App() {
  const [projects, setProjects] = useState(() => loadProjects())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [ownerChecked, setOwnerChecked] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)

  const nextIdRef = useRef(
    Math.max(...loadProjects().map((p) => p.id), 0) + 1
  )

  // 首次加载时检查是否已保存密码（如有则默认只读）
  useEffect(() => {
    const hash = getStoredHash()
    if (!hash) {
      // 未设置密码 → 任何人都可以编辑（首次使用）
      setIsOwner(true)
    }
    setOwnerChecked(true)
  }, [])

  // 每次 projects 变化自动保存
  useEffect(() => {
    if (isOwner) {
      saveProjects(projects)
    }
  }, [projects, isOwner])

  // ---- owner 相关 ----

  const handleUnlock = useCallback(async (password) => {
    const storedHash = getStoredHash()
    if (!storedHash) {
      // 首次设置密码
      const hash = await hashPassword(password)
      setStoredHash(hash)
      setIsOwner(true)
      setShowUnlockModal(false)
      return { success: true }
    }
    const hash = await hashPassword(password)
    if (hash === storedHash) {
      setIsOwner(true)
      setShowUnlockModal(false)
      // 重新加载最新数据
      setProjects(loadProjects())
      return { success: true }
    }
    return { success: false, error: '密码错误' }
  }, [])

  const handleLock = useCallback(() => {
    setIsOwner(false)
    // 退出编辑模式后，刷新显示只读内容
    setProjects(loadProjects())
  }, [])

  // ---- 核心操作函数 ----

  const updateProject = useCallback((id, key, value) => {
    if (!isOwner) return
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [key]: value } : p))
    )
  }, [isOwner])

  const handleImageUpload = useCallback(
    (id, file) => {
      if (!isOwner || !file || !file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        updateProject(id, 'image', e.target.result)
      }
      reader.readAsDataURL(file)
    },
    [isOwner, updateProject]
  )

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
        rating: 0,
        image: '',
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

  if (!ownerChecked) return null

  return (
    <div className="bg-glow relative min-h-screen bg-gray-950 text-white/90 overflow-x-hidden">
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
      <HeroSection scrollTo={scrollTo} addProject={addProject} isOwner={isOwner} />

      {/* ========== 项目效果展示区 ========== */}
      <ShowcaseSection isOwner={isOwner} />

      {/* ========== 项目卡片区 ========== */}
      <ProjectsSection
        projects={projects}
        updateProject={updateProject}
        handleImageUpload={handleImageUpload}
        addProject={addProject}
        deleteProject={deleteProject}
        isOwner={isOwner}
      />

      {/* ========== 底部 ========== */}
      <Footer
        isOwner={isOwner}
        onUnlock={() => setShowUnlockModal(true)}
        onLock={handleLock}
      />

      {/* ========== 解锁弹窗 ========== */}
      {showUnlockModal && (
        <UnlockModal
          onUnlock={handleUnlock}
          onClose={() => setShowUnlockModal(false)}
          isFirstSetup={!getStoredHash()}
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
    { label: '概览', target: 'hero' },
    { label: '项目展示', target: 'showcase' },
    { label: '项目卡片', target: 'projects' },
  ]

  return (
    <nav className="glass fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <button
          onClick={() => scrollTo('hero')}
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white"
        >
          <Sparkles size={20} className="text-blue-400" />
          AI Coding Journal
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
function HeroSection({ scrollTo, addProject, isOwner }) {
  return (
    <section
      id="hero"
      className="relative z-10 mx-auto flex min-h-[90vh] max-w-7xl flex-col items-center justify-center px-6 pt-24 md:flex-row md:gap-16"
    >
      {/* 左侧文字 */}
      <div className="flex-1 text-center md:text-left">
        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
          用一个网站记录Yz的
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            AI Coding 成长轨迹
          </span>
          。
        </h1>

        <p className="mb-10 max-w-lg text-base leading-relaxed text-white/50 md:text-lg">
          这是一个用于展示 AI Coding
          练习成果的个人项目页，重点呈现项目名称、项目简介、最终效果截图和主观星级评分。页面支持在本地上传图片、编辑文字介绍并记录评分，不需要上传到云端。
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row md:justify-start">
          <button
            onClick={() => scrollTo('showcase')}
            className="flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-medium text-gray-900 transition-all hover:bg-white/90 hover:shadow-lg hover:shadow-white/10"
          >
            <span>查看项目展示</span>
            <ArrowRight size={16} />
          </button>

          {isOwner && (
            <button
              onClick={addProject}
              className="flex items-center gap-2 rounded-full border border-white/15 px-7 py-3 text-sm font-medium text-white/80 transition-all hover:border-white/30 hover:text-white"
            >
              <Plus size={16} />
              <span>添加项目卡片</span>
            </button>
          )}
        </div>
      </div>

      {/* 右侧预览卡片 */}
      <div className="mt-14 flex-1 md:mt-0 flex justify-center">
        <div className="glass-card w-full max-w-sm rounded-2xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-shadow duration-500 hover:shadow-[0_32px_100px_rgba(59,130,246,0.15)]">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
              <Sparkles size={16} className="text-blue-400" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-white/30">
              Project Snapshot
            </span>
          </div>

          <h3 className="mb-3 text-xl font-semibold text-white">
            AI Coding Dashboard
          </h3>

          <p className="mb-5 text-sm leading-relaxed text-white/45">
            适合放置项目最终页面截图、App 原型图或 AI Coding
            生成结果，用一张图快速传达项目完成效果。
          </p>

          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
            <div className="flex flex-col items-center gap-2 text-white/20">
              <Image size={36} />
              <span className="text-xs">预览占位</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ========================
// 项目效果展示区组件
// ========================
function ShowcaseSection({ isOwner }) {
  const [showcaseImage, setShowcaseImage] = useState(() => {
    try {
      return localStorage.getItem('ai-coding-showcase') || ''
    } catch {
      return ''
    }
  })

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOwner) {
      try {
        localStorage.setItem('ai-coding-showcase', showcaseImage)
      } catch {
        // ignore
      }
    }
  }, [showcaseImage, isOwner])

  const handleShowcaseUpload = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setShowcaseImage(e.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <section id="showcase" className="relative z-10 py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-white md:text-5xl">
            项目效果展示
          </h2>
          <p className="text-white/40">
            这里放置一张核心项目截图即可，用于展示 AI Coding
            生成结果或最终页面效果。
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
          {isOwner && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleShowcaseUpload(e.target.files[0])
                }
                e.target.value = ''
              }}
            />
          )}

          {showcaseImage ? (
            <div
              className={`relative ${isOwner ? 'cursor-pointer' : ''}`}
              onClick={() => isOwner && fileInputRef.current?.click()}
            >
              <img
                src={showcaseImage}
                alt="项目效果图"
                className="w-full aspect-video object-cover"
              />
              {isOwner && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-sm text-white/80">点击替换图片</span>
                </div>
              )}
            </div>
          ) : (
            isOwner ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full aspect-video flex-col items-center justify-center gap-3 text-white/25 transition-colors hover:text-white/45"
              >
                <Image size={48} strokeWidth={1} />
                <div className="text-center">
                  <p className="text-base font-medium">项目截图展示区</p>
                  <p className="mt-1 text-sm">将此区域替换为项目最终效果图</p>
                </div>
              </button>
            ) : (
              <div className="flex w-full aspect-video flex-col items-center justify-center gap-3 text-white/15">
                <Image size={48} strokeWidth={1} />
                <div className="text-center">
                  <p className="text-base font-medium">暂无项目截图</p>
                  <p className="mt-1 text-sm">等待项目所有者上传</p>
                </div>
              </div>
            )
          )}
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
  updateProject,
  handleImageUpload,
  addProject,
  deleteProject,
  isOwner,
}) {
  return (
    <section id="projects" className="relative z-10 py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="mb-3 text-3xl font-bold text-white md:text-5xl">
              项目卡片
            </h2>
            <p className="text-white/40">
              {isOwner
                ? '每张卡片都可以在本地上传一张项目截图、编辑文字介绍，并用星标记录项目评分。数据会保存在当前浏览器本地。'
                : '浏览已完成的 AI Coding 项目，查看项目截图、介绍和评分。'}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={addProject}
              className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-sm text-white/70 transition-all hover:border-white/30 hover:text-white"
            >
              <Plus size={16} />
              <span>添加项目卡片</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              updateProject={updateProject}
              handleImageUpload={handleImageUpload}
              deleteProject={deleteProject}
              isOwner={isOwner}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// ========================
// 单张项目卡片组件
// ========================
function ProjectCard({ project, updateProject, handleImageUpload, deleteProject, isOwner }) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      handleImageUpload(project.id, e.target.files[0])
    }
    e.target.value = ''
  }

  return (
    <div className="glass-card group flex flex-col rounded-2xl overflow-hidden relative shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_32px_100px_rgba(59,130,246,0.20)]">
      {/* ---- 删除按钮 ---- */}
      {isOwner && (
        <button
          onClick={() => deleteProject(project.id)}
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
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {project.image ? (
        <div
          className={`relative overflow-hidden ${isOwner ? 'cursor-pointer' : ''}`}
          onClick={() => isOwner && fileInputRef.current?.click()}
        >
          <img
            src={project.image}
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
            onClick={() => fileInputRef.current?.click()}
            className="flex h-48 w-full flex-col items-center justify-center gap-2 border-b border-white/5 bg-white/[0.01] text-white/25 transition-colors hover:text-white/45"
          >
            <Upload size={28} strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-sm font-medium">点击上传项目图片</p>
              <p className="mt-0.5 text-xs">图片仅保存在本地浏览器</p>
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
              onClick={() => onChange(star)}
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
function UnlockModal({ onUnlock, onClose, isFirstSetup }) {
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
    if (password.length < 4 && !isFirstSetup) {
      setError('密码长度至少 4 位')
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
      onClick={!isFirstSetup ? onClose : undefined}
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
            {isFirstSetup ? (
              <ShieldCheck size={28} className="text-blue-400" />
            ) : (
              <Lock size={28} className="text-blue-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">
            {isFirstSetup ? '设置访问密码' : '输入密码解锁'}
          </h3>
          <p className="mt-1 text-sm text-white/40">
            {isFirstSetup
              ? '设置密码后，只有你能编辑内容'
              : '解锁后可编辑项目内容'}
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
              placeholder={isFirstSetup ? '设置一个密码（至少4位）' : '输入密码'}
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
            {loading ? '验证中...' : isFirstSetup ? '设置密码' : '解锁'}
          </button>

          {!isFirstSetup && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-white/25 transition-colors hover:text-white/50"
            >
              取消
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
