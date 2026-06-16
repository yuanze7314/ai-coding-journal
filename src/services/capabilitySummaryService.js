export const defaultCapabilitySummary = {
  heading: '个人总结',
  summary: '把 AI Coding、Agent 工作流与数据分析的实践拆成可复用能力，记录从想法到原型、从数据到策略的成长路径。',
  items: [
    {
      label: 'AI Coding',
      title: '把想法快速做成可展示原型',
      description: '用 React、Vite、Node 和 AI 编程工具，把需求拆成页面、数据和交互闭环。',
      proof: '个人作品集、后台编辑、项目详情弹窗',
    },
    {
      label: 'Agent Workflow',
      title: '搭建多 Agent 内容生产链路',
      description: '把长文本处理拆成解析、结构化、脚本生成、润色、质检和合成等协作步骤。',
      proof: '长文本播客自动化生产系统',
    },
    {
      label: 'Data Analytics',
      title: '用数据建模支撑策略判断',
      description: '结合评论挖掘、问卷建模、时间序列预测和优化模型形成业务建议。',
      proof: '市场调研、动态定价、数学建模',
    },
  ],
}

const CAPABILITY_SUMMARY_STORAGE_KEY = 'ai-coding-capability-summary'
const isBrowser = typeof window !== 'undefined'

function normalizeCapabilitySummary(input = {}) {
  const sourceItems = Array.isArray(input.items) ? input.items : defaultCapabilitySummary.items

  return {
    heading: input.heading || defaultCapabilitySummary.heading,
    summary: input.summary || defaultCapabilitySummary.summary,
    items: sourceItems.map((item, index) => ({
      label: item.label || defaultCapabilitySummary.items[index]?.label || `Summary ${index + 1}`,
      title: item.title || '',
      description: item.description || '',
      proof: item.proof || '',
    })),
  }
}

function readLocalCapabilitySummary() {
  if (!isBrowser) return defaultCapabilitySummary

  try {
    const raw = window.localStorage.getItem(CAPABILITY_SUMMARY_STORAGE_KEY)
    return raw ? normalizeCapabilitySummary(JSON.parse(raw)) : defaultCapabilitySummary
  } catch (error) {
    console.warn('读取个人总结本地数据失败', error)
    return defaultCapabilitySummary
  }
}

function writeLocalCapabilitySummary(nextSummary) {
  if (!isBrowser) return

  try {
    window.localStorage.setItem(CAPABILITY_SUMMARY_STORAGE_KEY, JSON.stringify(normalizeCapabilitySummary(nextSummary)))
  } catch (error) {
    console.warn('保存个人总结本地数据失败', error)
  }
}

export const capabilitySummaryService = {
  getSummary() {
    return Promise.resolve(readLocalCapabilitySummary())
  },

  updateSummary(nextSummary) {
    const normalized = normalizeCapabilitySummary(nextSummary)
    writeLocalCapabilitySummary(normalized)
    return Promise.resolve(normalized)
  },
}
