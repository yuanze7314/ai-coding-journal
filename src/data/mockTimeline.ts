import type { TimelineItem } from '../types/timeline'

export const mockTimeline: TimelineItem[] = [
  {
    id: 'timeline-current',
    phase: 'Current',
    title: '整理项目复盘与求职材料',
    description: '系统梳理经管知识背景与 AI 技能库，沉淀可复用的策略、数据分析方法和代码片段。',
    order: 40,
    isCurrent: true,
    createdAt: '2026-05-24',
    updatedAt: '2026-05-24',
  },
  {
    id: 'timeline-phase-3',
    phase: 'Phase 3',
    title: '开始搭建 AI Coding 项目展示网站',
    description: '设计并部署专属个人成长档案，将项目截图、说明、评分和简历信息整合到同一展示系统。',
    order: 30,
    isCurrent: false,
    createdAt: '2026-05-20',
    updatedAt: '2026-05-20',
  },
  {
    id: 'timeline-phase-2',
    phase: 'Phase 2',
    title: '开发 A股热点日报 Agent',
    description: '结合大模型 API 与自动化工作流，实现金融信息的数据清洗、热点提炼与策略输出。',
    order: 20,
    isCurrent: false,
    createdAt: '2026-05-12',
    updatedAt: '2026-05-12',
  },
  {
    id: 'timeline-phase-1',
    phase: 'Phase 1',
    title: '完善 AI 产品实习作品集',
    description: '探索大模型在内容生产、行业分析和学术研究中的实际落地场景。',
    order: 10,
    isCurrent: false,
    createdAt: '2026-05-01',
    updatedAt: '2026-05-01',
  },
]
