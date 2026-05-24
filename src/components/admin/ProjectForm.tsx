import { useMemo, useRef, useState } from 'react'
import { projectService } from '../../services/projectService'
import type { Project, ProjectInput } from '../../types/project'

type ProjectFormProps = {
  project?: Project
  onSubmit: (input: ProjectInput) => void | Promise<void>
  onCancel?: () => void
}

const emptyInput: ProjectInput = {
  title: '',
  subtitle: '',
  description: '',
  longDescription: '',
  coverImage: '',
  images: [],
  techStack: [],
  tags: [],
  githubUrl: '',
  demoUrl: '',
  status: 'published',
  priority: 0,
  featured: true,
  rating: 0,
}

export function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
  const initialValue = useMemo<ProjectInput>(() => {
    if (!project) return emptyInput

    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = project
    const images = project.images?.length ? project.images : [project.coverImage].filter(Boolean)
    return { ...input, images, coverImage: images[0] ?? project.coverImage ?? '' }
  }, [project])

  const [form, setForm] = useState<ProjectInput>(initialValue)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

  const updateField = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/') && file.size <= 3 * 1024 * 1024)
    if (!imageFiles.length) return

    setIsUploading(true)
    setUploadError('')
    try {
      const nextImages = await projectService.uploadProjectImages(project?.id ?? 'draft', imageFiles)
      setForm((current) => {
        const images = [...current.images, ...nextImages].filter(Boolean)
        return { ...current, images, coverImage: images[0] ?? '' }
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '图片上传失败')
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setForm((current) => {
      const images = current.images.filter((_, imageIndex) => imageIndex !== index)
      return { ...current, images, coverImage: images[0] ?? '' }
    })
  }

  return (
    <form
      className="admin-panel admin-form-panel grid gap-5 rounded-2xl border border-white/10 bg-white/[0.05] p-6"
      onSubmit={(event) => {
        event.preventDefault()
        const images = form.images.filter(Boolean)
        onSubmit({
          ...form,
          images,
          coverImage: images[0] ?? form.coverImage,
          status: 'published',
          featured: true,
        })
      }}
    >
      <label className="grid gap-2 text-sm text-white/60">
        标题
        <input value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
      </label>

      <label className="grid gap-2 text-sm text-white/60">
        简介
        <textarea rows={3} value={form.description} onChange={(event) => updateField('description', event.target.value)} />
      </label>

      <label className="grid gap-2 text-sm text-white/60">
        详细说明
        <textarea rows={6} value={form.longDescription} onChange={(event) => updateField('longDescription', event.target.value)} />
      </label>

      <label className="grid gap-2 text-sm text-white/60">
        GitHub 链接
        <input value={form.githubUrl} onChange={(event) => updateField('githubUrl', event.target.value)} />
      </label>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/60">项目图片</p>
            <p className="mt-1 text-xs text-white/35">支持多张图片，上传到服务器 uploads 目录；第一张作为卡片封面。</p>
          </div>
          <button type="button" className="admin-button admin-button-secondary" onClick={() => imageInputRef.current?.click()}>
            {isUploading ? '上传中...' : '添加图片'}
          </button>
        </div>
        {uploadError && <p className="text-xs text-red-200/80">{uploadError}</p>}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            addImages(event.target.files)
            event.target.value = ''
          }}
        />

        {form.images.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {form.images.map((image, index) => (
              <div key={`${image}-${index}`} className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
                <img src={image} alt={`项目图片 ${index + 1}`} className="h-full w-full object-contain" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-sm text-white/75 transition-colors hover:bg-red-500/70 hover:text-white"
                  aria-label={`删除第 ${index + 1} 张图片`}
                >
                  ×
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/70">
                    封面
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.035] px-5 py-8 text-center text-sm text-white/35">
            暂无图片，点击“添加图片”选择本地图片。
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <button type="button" className="admin-button admin-button-secondary" onClick={onCancel}>
            取消
          </button>
        )}
        <button type="submit" className="admin-button">
          保存项目
        </button>
      </div>
    </form>
  )
}
