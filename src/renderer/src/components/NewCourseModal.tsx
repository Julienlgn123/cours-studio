import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store'

interface Props {
  subjectId?: string
  onClose: () => void
}

export default function NewCourseModal({ subjectId, onClose }: Props) {
  const { subjects, createCourse, setActiveCourse, setView, showToast } = useStore()
  const [title, setTitle] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId ?? subjects[0]?.id ?? '')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!selectedSubjectId) return
    setLoading(true)
    try {
      const course = await createCourse({
        subjectId: selectedSubjectId,
        title: title.trim() || 'Sans titre'
      })
      setActiveCourse(course.id)
      setView('editor')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Nouveau cours</span>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="field-label">Titre (optionnel)</label>
            <input
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Sans titre — tu pourras le changer après"
              autoFocus
            />
          </div>

          {!subjectId && subjects.length > 0 && (
            <div className="field">
              <label className="field-label">Matière</label>
              <select
                className="field-input"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                ))}
              </select>
            </div>
          )}

          {subjects.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              Crée d'abord une matière dans la barre latérale.
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={loading || subjects.length === 0 || !selectedSubjectId}
          >
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
            Commencer
          </button>
        </div>
      </div>
    </div>
  )
}
