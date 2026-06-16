export function ResumeTimeline({ items }) {
  return (
    <ol className="resume-timeline" aria-label="项目经历时间轴">
      {items.map((item) => (
        <li key={`${item.time}-${item.title}`} className="resume-timeline-item">
          <span className="resume-timeline-dot" aria-hidden="true" />
          <div>
            <span className="resume-timeline-time">{item.time}</span>
            <h4>{item.title}</h4>
            <p>{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
