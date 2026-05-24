export type DossierEducation = {
  school: string
  major: string
  period: string
  active?: boolean
}

export type DossierAward = {
  title: string
  level: string
}

export type DossierSkill = {
  label: string
  value: string
}

export type Dossier = {
  name: string
  status: string[]
  phone: string
  email: string
  education: DossierEducation[]
  highlights: string[]
  awards: DossierAward[]
  skills: DossierSkill[]
  updatedAt?: string
}
