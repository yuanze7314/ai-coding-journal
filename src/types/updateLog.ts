export type UpdateLogType = 'feature' | 'project' | 'design' | 'system'

export type UpdateLog = {
  id: string
  title: string
  content: string
  date: string
  type: UpdateLogType
  projectId?: string
}

