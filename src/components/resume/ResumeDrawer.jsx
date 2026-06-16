import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Briefcase, ChevronRight, GraduationCap, Plus, Trash2, X } from 'lucide-react'
import { ResumeTag } from './ResumeTag'
import { ResumeTimeline } from './ResumeTimeline'

function ResumeSection({ title, children }) {
  return (
    <section className="resume-drawer-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

const RESUME_LIST_DEFAULTS = {
  info: { label: '新标签', value: '填写内容' },
  education: { school: '教育阶段', major: '专业 / 方向', description: '补充学习重点或成果。' },
  internships: { period: '时间', role: '岗位 / 方向', organization: '组织 / 项目', description: '补充经历说明。' },
  timeline: { time: '年份', title: '项目标题', description: '补充项目经历说明。' },
  skillGroups: { label: '能力类别', items: ['新能力'] },
}

function splitSkillItems(value) {
  return value
    .split(/[\n,，、]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function EditableField({ label, value, onChange, multiline = false, rows = 2 }) {
  return (
    <label className="resume-edit-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value ?? ''}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  )
}

function EditListToolbar({ label, onAdd }) {
  return (
    <button type="button" className="resume-edit-add" onClick={onAdd}>
      <Plus size={14} aria-hidden="true" />
      {label}
    </button>
  )
}

function RemoveItemButton({ label, onRemove }) {
  return (
    <button type="button" className="resume-edit-remove" onClick={onRemove} aria-label={label}>
      <Trash2 size={14} aria-hidden="true" />
    </button>
  )
}

export function ResumeDrawer({ data, isOpen, isOwner = false, onUpdate, onClose, onNavigate, returnFocusRef }) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState(isOpen ? 'entered' : 'closed')
  const closeButtonRef = useRef(null)

  useEffect(() => {
    let timeoutId
    let openTimerId
    let phaseTimeoutId

    if (isOpen) {
      setMounted(true)
      setVisible(false)
      setPhase('opening')
      openTimerId = window.setTimeout(() => setVisible(true), 24)
      phaseTimeoutId = window.setTimeout(() => {
        setVisible(true)
        setPhase('entered')
      }, 620)
    } else {
      if (!mounted) {
        setVisible(false)
        setPhase('closed')
        return undefined
      }
      setPhase('closing')
      setVisible(false)
      timeoutId = window.setTimeout(() => {
        setMounted(false)
        setPhase('closed')
        returnFocusRef?.current?.focus({ preventScroll: true })
      }, 560)
    }

    return () => {
      if (openTimerId) window.clearTimeout(openTimerId)
      if (timeoutId) window.clearTimeout(timeoutId)
      if (phaseTimeoutId) window.clearTimeout(phaseTimeoutId)
    }
  }, [isOpen, returnFocusRef])

  useEffect(() => {
    if (!mounted) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted || !isOpen) return undefined

    const focusTimeoutId = window.setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    }, 360)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimeoutId)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mounted, isOpen, onClose])

  const handleNavigate = (target) => {
    onNavigate?.(target)
  }

  const updateResume = (recipe) => {
    if (!isOwner || !onUpdate) return
    onUpdate(recipe)
  }

  const updateField = (key, value) => {
    updateResume((current) => ({ ...current, [key]: value }))
  }

  const updateListItem = (listKey, index, key, value) => {
    updateResume((current) => ({
      ...current,
      [listKey]: (current[listKey] || []).map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }))
  }

  const addListItem = (listKey) => {
    updateResume((current) => ({
      ...current,
      [listKey]: [...(current[listKey] || []), RESUME_LIST_DEFAULTS[listKey]],
    }))
  }

  const removeListItem = (listKey, index) => {
    updateResume((current) => ({
      ...current,
      [listKey]: (current[listKey] || []).filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const updateSkillItems = (index, value) => {
    updateResume((current) => ({
      ...current,
      skillGroups: (current.skillGroups || []).map((group, groupIndex) => (
        groupIndex === index ? { ...group, items: splitSkillItems(value) } : group
      )),
    }))
  }

  const contacts = data.contacts || []
  const internships = data.internships || []
  const emailContact = contacts.find((contact) => contact.label === 'Email')

  if (!mounted) return null

  return createPortal(
    <div
      className={`resume-drawer-root ${visible ? 'is-open' : ''} is-${phase} ${isOwner ? 'is-editing' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div className="resume-drawer-backdrop" aria-hidden="true" />
      <aside
        className="resume-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="resume-drawer-close"
          onClick={onClose}
          aria-label="关闭个人档案"
        >
          <X size={16} />
        </button>

        <header className="resume-drawer-hero">
          <div className="resume-q-avatar" aria-label="Yz pixel rabbit avatar">
            <img className="resume-q-avatar-image" src={data.avatar} alt="" />
          </div>
          <div className="resume-drawer-intro">
            <span className="resume-drawer-kicker">{isOwner ? 'Edit profile' : data.avatarCaption}</span>
            <h2 id="resume-drawer-title">{isOwner ? '编辑个人档案' : data.name}</h2>
            {isOwner ? (
              <div className="resume-hero-editor">
                <span className="resume-edit-mode">编辑模式</span>
                <EditableField label="姓名" value={data.name} onChange={(value) => updateField('name', value)} />
                <EditableField label="身份" value={data.identity} onChange={(value) => updateField('identity', value)} />
                <EditableField label="简介" value={data.summary} multiline rows={3} onChange={(value) => updateField('summary', value)} />
                <EditableField label="头像路径" value={data.avatar} onChange={(value) => updateField('avatar', value)} />
                <EditableField label="头像标识" value={data.avatarCaption} onChange={(value) => updateField('avatarCaption', value)} />
              </div>
            ) : (
              <>
                <p className="resume-drawer-identity">{data.identity}</p>
                <p className="resume-drawer-summary">{data.summary}</p>
              </>
            )}
            <div className="resume-drawer-actions">
              <button type="button" className="resume-drawer-action-primary" onClick={() => handleNavigate('missions')}>
                查看项目
                <ChevronRight size={15} aria-hidden="true" />
              </button>
              <a className="resume-drawer-action-secondary" href={emailContact?.href || 'mailto:yzz7314@163.com'}>
                联系我
              </a>
            </div>
          </div>
        </header>

        <div className="resume-drawer-body">
          <ResumeSection title="个人信息">
            {isOwner ? (
              <div className="resume-edit-list">
                {(data.info || []).map((item, index) => (
                  <article key={`${item.label}-${index}`} className="resume-edit-card">
                    <RemoveItemButton label={`删除个人信息 ${item.label}`} onRemove={() => removeListItem('info', index)} />
                    <EditableField label="标签" value={item.label} onChange={(value) => updateListItem('info', index, 'label', value)} />
                    <EditableField label="内容" value={item.value} multiline rows={2} onChange={(value) => updateListItem('info', index, 'value', value)} />
                  </article>
                ))}
                <EditListToolbar label="新增个人信息" onAdd={() => addListItem('info')} />
              </div>
            ) : (
              <dl className="resume-info-list">
                {(data.info || []).map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </ResumeSection>

          <ResumeSection title="教育背景">
            {isOwner ? (
              <div className="resume-edit-list">
                {(data.education || []).map((item, index) => (
                  <article key={`${item.school}-${index}`} className="resume-edit-card">
                    <RemoveItemButton label={`删除教育背景 ${item.school}`} onRemove={() => removeListItem('education', index)} />
                    <EditableField label="学校 / 阶段" value={item.school} onChange={(value) => updateListItem('education', index, 'school', value)} />
                    <EditableField label="专业 / 方向" value={item.major} onChange={(value) => updateListItem('education', index, 'major', value)} />
                    <EditableField label="说明" value={item.description} multiline rows={3} onChange={(value) => updateListItem('education', index, 'description', value)} />
                  </article>
                ))}
                <EditListToolbar label="新增教育背景" onAdd={() => addListItem('education')} />
              </div>
            ) : (
              <div className="resume-education-list">
                {(data.education || []).map((item) => (
                  <article key={`${item.school}-${item.major}`}>
                    <GraduationCap size={17} aria-hidden="true" />
                    <div>
                      <h4>{item.school}</h4>
                      <p>{item.major}</p>
                      <span>{item.description}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </ResumeSection>

          <ResumeSection title="实习经历">
            {isOwner ? (
              <div className="resume-edit-list">
                {internships.map((item, index) => (
                  <article key={`${item.period}-${index}`} className="resume-edit-card">
                    <RemoveItemButton label={`删除实习经历 ${item.role}`} onRemove={() => removeListItem('internships', index)} />
                    <EditableField label="时间" value={item.period} onChange={(value) => updateListItem('internships', index, 'period', value)} />
                    <EditableField label="岗位 / 方向" value={item.role} onChange={(value) => updateListItem('internships', index, 'role', value)} />
                    <EditableField label="组织 / 项目" value={item.organization} onChange={(value) => updateListItem('internships', index, 'organization', value)} />
                    <EditableField label="说明" value={item.description} multiline rows={3} onChange={(value) => updateListItem('internships', index, 'description', value)} />
                  </article>
                ))}
                <EditListToolbar label="新增实习经历" onAdd={() => addListItem('internships')} />
              </div>
            ) : (
              <div className="resume-experience-list">
                {internships.map((item) => (
                  <article key={`${item.period}-${item.role}`}>
                    <Briefcase size={17} aria-hidden="true" />
                    <div>
                      <span>{item.period}</span>
                      <h4>{item.role}</h4>
                      <p>{item.organization}</p>
                      <small>{item.description}</small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </ResumeSection>

          <ResumeSection title="项目经历时间轴">
            {isOwner ? (
              <div className="resume-edit-list">
                {(data.timeline || []).map((item, index) => (
                  <article key={`${item.time}-${index}`} className="resume-edit-card">
                    <RemoveItemButton label={`删除项目经历 ${item.title}`} onRemove={() => removeListItem('timeline', index)} />
                    <EditableField label="时间" value={item.time} onChange={(value) => updateListItem('timeline', index, 'time', value)} />
                    <EditableField label="标题" value={item.title} onChange={(value) => updateListItem('timeline', index, 'title', value)} />
                    <EditableField label="说明" value={item.description} multiline rows={3} onChange={(value) => updateListItem('timeline', index, 'description', value)} />
                  </article>
                ))}
                <EditListToolbar label="新增项目经历" onAdd={() => addListItem('timeline')} />
              </div>
            ) : (
              <ResumeTimeline items={data.timeline || []} />
            )}
          </ResumeSection>

          <ResumeSection title="核心能力">
            {isOwner ? (
              <div className="resume-edit-list">
                {(data.skillGroups || [{ label: 'Core', items: data.skills || [] }]).map((group, index) => (
                  <article key={`${group.label}-${index}`} className="resume-edit-card">
                    <RemoveItemButton label={`删除能力分组 ${group.label}`} onRemove={() => removeListItem('skillGroups', index)} />
                    <EditableField label="类别" value={group.label} onChange={(value) => updateListItem('skillGroups', index, 'label', value)} />
                    <EditableField
                      label="能力标签（逗号或换行分隔）"
                      value={(group.items || []).join('，')}
                      multiline
                      rows={3}
                      onChange={(value) => updateSkillItems(index, value)}
                    />
                  </article>
                ))}
                <EditListToolbar label="新增能力分组" onAdd={() => addListItem('skillGroups')} />
              </div>
            ) : (
              <div className="resume-skill-groups">
                {(data.skillGroups || [{ label: 'Core', items: data.skills || [] }]).map((group) => (
                  <div key={group.label} className="resume-skill-group">
                    <span>{group.label}</span>
                    <div className="resume-tag-list">
                      {(group.items || []).map((skill) => (
                        <ResumeTag key={`${group.label}-${skill}`}>{skill}</ResumeTag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ResumeSection>
        </div>
      </aside>
    </div>,
    document.body
  )
}
