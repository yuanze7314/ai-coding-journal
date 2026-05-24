export type TimelineInput = {
  phase: string
  title: string
  description: string
  order: number
  isCurrent: boolean
}

export type TimelineItem = TimelineInput & {
  id: string
  createdAt: string
  updatedAt: string
}
