import { forwardRef } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'

export const MiniResumeCard = forwardRef(function MiniResumeCard({ data, onOpen }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="mini-resume-card"
      onClick={onOpen}
      aria-label="打开 Yz 的个人档案"
    >
      <span className="mini-resume-card-kicker">Personal file</span>
      <span className="mini-resume-card-main">
        <span className="mini-resume-avatar" aria-hidden="true">
          <img className="mini-resume-avatar-image" src={data.avatar} alt="" />
        </span>
        <span className="mini-resume-name-row">
          <span>
            <strong>{data.name}</strong>
            <small>{data.identity}</small>
          </span>
          <Sparkles size={15} aria-hidden="true" />
        </span>
      </span>
      <span className="mini-resume-summary">{data.summary}</span>
      <span className="mini-resume-signal">
        查看完整档案
        <ArrowRight size={15} aria-hidden="true" />
      </span>
    </button>
  )
})
