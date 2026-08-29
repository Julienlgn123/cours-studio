import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Clock, Mic, Monitor, Edit2 } from 'lucide-react'
import { useStore } from '../store'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import NewCourseModal from './NewCourseModal'
import CourseEditModal from './CourseEditModal'
import type { Course } from '../../../shared/types'

export default function HomeView() {
  const { subjects, courses, setView, setActiveCourse, loadCourses, searchQuery, setSearchQuery } = useStore()
  const [showNew, setShowNew] = useState(false)
  const [editCourse, setEditCourse] = useState<Course | null>(null)

  useEffect(() => { loadCourses() }, [])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (!q) return courses.slice(0, 20)
    return courses.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.content.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [courses, searchQuery])

  const recentCourses = courses.slice(0, 6)

  function openCourse(id: string) {
    setActiveCourse(id)
    setView('editor')
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Hero header */}
      <div style={{
        padding: '32px 32px 24px',
        background: 'linear-gradient(180deg, rgba(124,111,247,0.06) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Bonjour 👋</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {courses.length} cours · {subjects.length} matière{subjects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={15} />
            Nouveau cours
          </button>
        </div>

        {/* Search */}
        <div className="search-bar">
          <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les cours..."
          />
          {searchQuery && (
            <button className="icon-btn btn-sm" onClick={() => setSearchQuery('')} style={{ width: 20, height: 20 }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        {searchQuery ? (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} pour « {searchQuery} »
            </p>
            <div className="course-grid" style={{ padding: 0 }}>
              {filtered.map((c) => {
                const subject = subjects.find((s) => s.id === c.subjectId)
                return <CourseCard key={c.id} course={c} subject={subject} onClick={() => openCourse(c.id)} onEdit={() => setEditCourse(c)} />
              })}
            </div>
            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">Aucun cours trouvé</div>
                <div className="empty-state-desc">Essaie un autre mot-clé</div>
              </div>
            )}
          </>
        ) : (
          <>
            {courses.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <div className="empty-state-icon">📓</div>
                <div className="empty-state-title">Aucun cours pour l'instant</div>
                <div className="empty-state-desc">Crée ta première matière dans la barre latérale, puis commence un cours.</div>
                <button className="btn btn-primary" onClick={() => setShowNew(true)} style={{ marginTop: 8 }}>
                  <Plus size={14} /> Nouveau cours
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                  Récents
                </h2>
                <div className="course-grid" style={{ padding: 0 }}>
                  {recentCourses.map((c) => {
                    const subject = subjects.find((s) => s.id === c.subjectId)
                    return <CourseCard key={c.id} course={c} subject={subject} onClick={() => openCourse(c.id)} onEdit={() => setEditCourse(c)} />
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showNew && <NewCourseModal onClose={() => setShowNew(false)} />}
      {editCourse && <CourseEditModal course={editCourse} onClose={() => setEditCourse(null)} />}
    </div>
  )
}

function CourseCard({ course, subject, onClick, onEdit }: {
  course: Course
  subject?: import('../../../shared/types').Subject
  onClick: () => void
  onEdit: () => void
}) {
  const [hover, setHover] = useState(false)
  const plainText = course.content.replace(/<[^>]+>/g, '').slice(0, 120)

  return (
    <div
      className="course-card"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative' }}
    >
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
      {subject && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>{subject.emoji}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: subject.color }}>{subject.name}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 17 }}>{course.emoji ?? '📝'}</span>
        <div className="course-card-title">{course.title}</div>
      </div>
      {plainText && <div className="course-card-preview">{plainText}</div>}
      <div className="course-card-meta">
        <Clock size={11} style={{ color: 'var(--text-tertiary)' }} />
        <span className="course-card-date">
          {format(new Date(course.updatedAt), 'dd MMM yyyy', { locale: fr })}
        </span>
        <div className="course-card-badges" style={{ marginLeft: 'auto' }}>
          {course.audioPath && (
            <span style={{ color: 'var(--success)', display: 'flex' }}><Mic size={12} /></span>
          )}
          {course.videoPath && (
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Monitor size={12} /></span>
          )}
          {course.versions.length > 0 && (
            <span className="badge" style={{ background: 'var(--bg-overlay)', color: 'var(--text-tertiary)', fontSize: 11 }}>
              {course.versions.length}v
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
