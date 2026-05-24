import type { Dossier } from '../types/dossier'

export const mockDossier: Dossier = {
  name: '袁 泽',
  status: ['立刻到岗', '出勤五天', '六个月以上'],
  phone: '18732865855',
  email: 'yzz7314@163.com',
  education: [
    { school: '中国海洋大学', major: '区域经济学', period: '2025.09 - 2028.06', active: true },
    { school: '中国石油大学（北京）', major: '经济学', period: '2021.09 - 2025.06' },
  ],
  highlights: [
    '快手主站 - 热点运营中心策略产品经理：负责热词挖掘策略与热点 push 看板。',
    'AI 系统搭建：搭建多 Agent 长文本播客自动化生产系统，覆盖 PDF 解析、脚本生成、质检与 TTS 合成。',
    '数据分析建模：完成评论数据分析、问卷建模、动态定价补货等数据分析与建模项目。',
  ],
  awards: [
    { title: '美国大学生数学建模竞赛', level: '国家级一等奖' },
    { title: '“正大杯”全国大学生市场调查与分析大赛', level: '国家级三等奖' },
    { title: '中国国际大学生创新大赛（2024）', level: '国家级三等奖' },
    { title: '全国大学生数学建模竞赛', level: '省级特等奖' },
  ],
  skills: [
    { label: 'Data Analytics', value: '熟悉 Python、SQL，能够完成数据清洗、建模分析与结果解读。' },
    { label: 'AI Application', value: '持续使用 ChatGPT、Gemini、DeepSeek 等工具提升信息处理和方案产出效率。' },
    { label: 'AI Coding', value: '熟悉 Claude Code、Codex、Cursor、Trae、Coze，具备将想法快速落地为原型的能力。' },
  ],
}
