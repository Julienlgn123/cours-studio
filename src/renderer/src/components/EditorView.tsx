import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Save, History, Mic, Check, Trash2, FileUp } from 'lucide-react'
import { useStore } from '../store'
import Editor from './Editor'
import RecordingBar from './RecordingBar'
import VersionPanel from './VersionPanel'
import MediaPanel from './MediaPanel'
import ImportDocumentModal from './ImportDocumentModal'

export default function EditorView() {
  const { courses, subjects, activeCourseId, setView, updateCourse, deleteCourse, showToast } = useStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const course = courses.find((c) => c.id === activeCourseId)
  const subject = course ? subjects.find((s) => s.id === course.subjectId) : undefined

  const [title, setTitle] = useState(course?.title ?? '')
  const [content, setContent] = useState(course?.content ?? '')
  const [saved, setSaved] = useState(true)
  const [showRecording, setShowRecording] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'versions' | 'media'>('editor')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (course) {
      setTitle(course.title)
      setContent(course.content)
    }
  }, [activeCourseId])

  const save = useCallback(async (t: string, c: string) => {
    if (!activeCourseId) return
    await updateCourse(activeCourseId, { title: t, content: c })
    setSaved(true)
  }, [activeCourseId, updateCourse])

  function scheduleAutoSave(t: string, c: string) {
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(t, c), 1500)
  }

  function handleTitleChange(v: string) {
    setTitle(v)
    scheduleAutoSave(v, content)
  }

  function handleContentChange(v: string) {
    setContent(v)
    scheduleAutoSave(title, v)
  }

  async function forceSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await save(title, content)
    showToast('Cours sauvegardé', 'success')
  }

  function goBack() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    save(title, content)
    setView(subject ? 'subject' : 'home')
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); forceSave() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [title, content])

  if (!course) return null

  const hasMedia = !!(course.audioPath || course.videoPath)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header" style={{ padding: '10px 16px' }}>
        <div className="page-header-left">
          <button className="icon-btn" onClick={goBack} data-tooltip="Retour">
            <ArrowLeft size={16} />
          </button>
          {subject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 14 }}>{subject.emoji}</span>
              <span style={{ fontSize: 12, color: subject.color, fontWeight: 500 }}>{subject.name}</span>
            </div>
          )}
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: saved ? 'var(--text-tertiary)' : 'var(--warning)' }}>
            {saved
              ? <><Check size={12} /> Sauvegardé</>
              : <><span className="spinner" style={{ width: 12, height: 12 }} /> Sauvegarde...</>
            }
          </div>
          <button
            className="icon-btn"
            onClick={() => setShowImport(true)}
            data-tooltip="Importer le cours du professeur (PDF, Word, ODT...)"
            data-tooltip-dir="left"
          >
            <FileUp size={15} />
          </button>
          <button
            className={`icon-btn ${showRecording ? 'active' : ''}`}
            onClick={() => setShowRecording(!showRecording)}
            data-tooltip="Enregistrement audio/vidéo"
            data-tooltip-dir="left"
          >
            <Mic size={15} />
          </button>
          <button
            className={`icon-btn ${activeTab === 'versions' ? 'active' : ''}`}
            onClick={() => setActiveTab(activeTab === 'versions' ? 'editor' : 'versions')}
            data-tooltip="Historique des versions"
            data-tooltip-dir="left"
          >
            <History size={15} />
          </button>
          <button className="icon-btn" onClick={forceSave} data-tooltip="Sauvegarder (Ctrl+S)" data-tooltip-dir="left">
            <Save size={15} />
          </button>
          <button className="icon-btn" onClick={() => setShowDeleteConfirm(true)} data-tooltip="Supprimer ce cours" data-tooltip-dir="left" style={{ color: 'var(--danger, #ef4444)' }}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {showImport && (
        <ImportDocumentModal
          onClose={() => setShowImport(false)}
          onInsert={(html) => {
            const newContent = content ? `${content}\n${html}` : html
            setContent(newContent)
            scheduleAutoSave(title, newContent)
            showToast('Cours du professeur ajouté aux notes', 'success')
          }}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, minWidth: 320, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Supprimer le cours ?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              « {course?.title} » sera définitivement supprimé. Cette action est irréversible.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
              <button className="btn" style={{ background: 'var(--danger, #ef4444)', color: '#fff' }} onClick={async () => {
                if (!activeCourseId) return
                await deleteCourse(activeCourseId)
                setView(subject ? 'subject' : 'home')
                showToast('Cours supprimé', 'success')
              }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        <div className={`tab ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>Notes</div>
        <div className={`tab ${activeTab === 'versions' ? 'active' : ''}`} onClick={() => setActiveTab('versions')}>
          Versions
          {course.versions.length > 0 && (
            <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--bg-overlay)', padding: '1px 5px', borderRadius: 'var(--radius-full)', color: 'var(--text-tertiary)' }}>
              {course.versions.length}
            </span>
          )}
        </div>
        {hasMedia && (
          <div className={`tab ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>
            Médias
            <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--recording-dim)', padding: '1px 5px', borderRadius: 'var(--radius-full)', color: 'var(--recording)' }}>
              {(course.audioPath ? 1 : 0) + (course.videoPath ? 1 : 0)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {activeTab === 'editor' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="editor-area" style={{ flex: 1, overflow: 'auto', paddingTop: 24 }}>
              <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
                <input
                  className="editor-title-input"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Titre du cours..."
                />
                <Editor content={content} onChange={handleContentChange} />
              </div>
            </div>
            {showRecording && (
              <RecordingBar
                courseId={activeCourseId!}
                subjectId={course.subjectId}
                subjectName={subject?.name ?? 'Cours'}
                courseName={course.title}
                onSaved={(type, path) => {
                  updateCourse(activeCourseId!, type === 'audio' ? { audioPath: path } : { videoPath: path })
                  showToast('Enregistrement sauvegardé', 'success')
                  if (activeTab !== 'media') setActiveTab('media')
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <VersionPanel
            course={course}
            currentContent={content}
            onRestore={(v) => {
              setContent(v.content)
              scheduleAutoSave(title, v.content)
              setActiveTab('editor')
              showToast('Version restaurée', 'success')
            }}
          />
        )}

        {activeTab === 'media' && (
          <MediaPanel course={course} />
        )}
      </div>
    </div>
  )
}
