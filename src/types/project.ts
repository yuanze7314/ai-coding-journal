export type ProjectStatus = 'draft' | 'building' | 'published' | 'archived'

export type Project = {
  id: string
  title: string
  subtitle: string
  description: string
  longDescription: string
  coverImage: string
  images: string[]
  techStack: string[]
  tags: string[]
  githubUrl: string
  demoUrl: string
  status: ProjectStatus
  priority: number
  featured: boolean
  createdAt: string
  updatedAt: string
  rating?: number
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
