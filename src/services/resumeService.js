import { resumeData } from '../components/resume/ResumeData'

const RESUME_STORAGE_KEY = 'ai-coding-resume-data'
const isBrowser = typeof window !== 'undefined'

function asArray(value, fallback) {
  return Array.isArray(value) ? value : fallback
}

function normalizeResume(input = {}) {
  return {
    ...resumeData,
    ...input,
    info: asArray(input.info, resumeData.info),
    skillGroups: asArray(input.skillGroups, resumeData.skillGroups),
    timeline: asArray(input.timeline, resumeData.timeline),
    education: asArray(input.education, resumeData.education),
    internships: asArray(input.internships, resumeData.internships),
    contacts: asArray(input.contacts, resumeData.contacts),
  }
}

function readLocalResume() {
  if (!isBrowser) return resumeData

  try {
    const raw = window.localStorage.getItem(RESUME_STORAGE_KEY)
    return raw ? normalizeResume(JSON.parse(raw)) : resumeData
  } catch (error) {
    console.warn('读取简历本地数据失败', error)
    return resumeData
  }
}

function writeLocalResume(nextResume) {
  if (!isBrowser) return

  try {
    window.localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(normalizeResume(nextResume)))
  } catch (error) {
    console.warn('保存简历本地数据失败', error)
  }
}

export const resumeService = {
  getResume() {
    return Promise.resolve(readLocalResume())
  },

  updateResume(nextResume) {
    const normalized = normalizeResume(nextResume)
    writeLocalResume(normalized)
    return Promise.resolve(normalized)
  },

  resetResume() {
    if (isBrowser) window.localStorage.removeItem(RESUME_STORAGE_KEY)
    return Promise.resolve(resumeData)
  },
}
