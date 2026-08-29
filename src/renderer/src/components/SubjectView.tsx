import { useMemo, useState } from 'react'
import { Plus, Search, ArrowLeft, Clock, Mic, Monitor, Edit2, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import NewCourseModal from './NewCourseModal'
import CourseEditModal from './CourseEditModal'
import ContextMenu from './ContextMenu'
import type { Course } from '../../../shared/types'

export default function SubjectView() {
  const { subjects, courses, activeSubjectId, setView, setActiveCourse, setActiveSubject, loadCourses, deleteCourse, searchQuery, setSearchQuery, showToast } = useStore()
  const [showNew, setShowNew] = useState(false)
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; course: Course } | null>(null)

  const subject = subjects.find((s) => s.id === activeSubjectId)
  const subjectCourses = useMemo(() => {
    const filtered = courses.filter((c) => c.subjectId === activeSubjectId)
    if (!searchQuery) return filtered
    const q = searchQuery.toLowerCase()
    return filtered.filter((c) => c.title.toLowerCase().includes(q) || c.content.toLowerCase().includes(q))
  }, [courses, activeSubjectId, searchQuery])

  function openCourse(id: string) {
    setActiveCourse(id)
    setView('editor')
  }

  async function handleDelete(id: string) {
    await deleteCourse(id)
    setContextMenu(null)
    showToast('Cours supprimé', 'success')
  }

  if (!subject) return null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="page-header">
        <div className="page-header-left">
          <button className="icon-btn" onClick={() => { setActiveSubject(null); setView('home') }}>
            <ArrowLeft size={16} />
          </button>
          <span style={{ fontSize: 20 }}>{subject.emoji}</span>
          <h1 className="page-header-title" style={{ color: subject.color }}>{subject.name}</h1>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', background: 'var(--bg-overlay)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            {subjectCourses.length} cours
          </span>
        </div>
        <div className="page-header-right">
          <div className="search-bar" style={{ width: 220 }}>
            <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
            />
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Nouveau cours
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {subjectCourses.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-state-icon">{subject.emoji}</div>
            <div className="empty-state-title">Aucun cours</div>
            <div className="empty-state-desc">Lance le premier cours de {subject.name}.</div>
            <button className="btn btn-primary" onClick={() => setShowNew(true)} style={{ marginTop: 8 }}>
              <Plus size={14} /> Nouveau cours
            </button>
          </div>
        ) : (
          <div className="course-grid">
            {subjectCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                subject={subject}
                onClick={() => openCourse(c.id)}
                onEdit={() => setEditCourse(c)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, course: c }) }}
              />
            ))}
          </div>
        )}
      </div>

      {showNew && <NewCourseModal subjectId={activeSubjectId!} onClose={() => setShowNew(false)} />}
      {editCourse && <CourseEditModal course={editCourse} onClose={() => setEditCourse(null)} />}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'Ouvrir', icon: <Edit2 size={14} />, onClick: () => openCourse(contextMenu.course.id) },
            { label: 'Renommer', icon: <Edit2 size={14} />, onClick: () => { setEditCourse(contextMenu.course); setContextMenu(null) } },
            { label: 'Supprimer', icon: <Trash2 size={14} />, danger: true, onClick: () => handleDelete(contextMenu.course.id) }
          ]}
        />
      )}
    </div>
  )
}

function CourseCard({ course, subject, onClick, onEdit, onContextMenu }: {
  course: Course
  subject: import('../../../shared/types').Subject
  onClick: () => void
  onEdit: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const [hover, setHover] = useState(false)
  const plainText = course.content.replace(/<[^>]+>/g, '').slice(0, 100)

  return (
    <div
      className="course-card"
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative' }}
    >
      {/* Edit button on hover */}
      {hover && (
        <button
          className="icon-btn"
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          title="Modifier"
        >
          <Edit2 size={13} />
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{course.emoji ?? '📝'}</span>
        <div className="course-card-title" style={{ flex: 1 }}>{course.title}</div>
      </div>

      {plainText && <div className="course-card-preview">{plainText}</div>}

      <div className="course-card-meta">
        <Clock size={11} style={{ color: 'var(--text-tertiary)' }} />
        <span className="course-card-date">{format(new Date(course.updatedAt), 'dd MMM yyyy', { locale: fr })}</span>
        <div className="course-card-badges" style={{ marginLeft: 'auto' }}>
          {course.audioPath && <Mic size={12} style={{ color: 'var(--success)' }} />}
          {course.videoPath && <Monitor size={12} style={{ color: 'var(--accent)' }} />}
          {course.versions.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-overlay)', padding: '1px 5px', borderRadius: 'var(--radius-full)' }}>
              {course.versions.length}v
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
