import type { UpdateLog } from '../types/updateLog'

export const updateLogs: UpdateLog[] = [
  {
    id: 'cloud-ready-architecture',
    title: '抽象项目数据层与 service 层',
    content: '将项目展示数据迁移到统一 Project 类型和 projectService，保留 mock fallback，后续可替换为 CloudBase 数据库。',
    date: '2026-05-24',
    type: 'system',
    projectId: 'ai-coding-archive',
  },
  {
    id: 'static-public-data',
    title: '修复跨浏览器公开展示',
    content: '公开项目数据不再依赖 localStorage，所有访客默认读取仓库内的项目数据与 /projects/ 静态图片。',
    date: '2026-05-24',
    type: 'feature',
    projectId: 'ai-coding-archive',
  },
  {
    id: 'portfolio-visual-upgrade',
    title: '升级高端科技视觉风格',
    content: '保留深色航天背景、玻璃质感项目卡片和左右分栏档案布局，形成更完整的作品集展示体验。',
    date: '2026-05-20',
    type: 'design',
  },
]

