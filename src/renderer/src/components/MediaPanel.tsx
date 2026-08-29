import { Mic, Monitor, FolderOpen } from 'lucide-react'
import type { Course } from '../../../shared/types'
import MediaPlayer from './MediaPlayer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (window as any).api

interface Props {
  course: Course
}

export default function MediaPanel({ course }: Props) {
  const hasAudio = !!course.audioPath
  const hasVideo = !!course.videoPath

  if (!hasAudio && !hasVideo) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎙️</div>
        <div className="empty-state-title">Aucun enregistrement</div>
        <div className="empty-state-desc">Lance un enregistrement audio ou vidéo via le bouton 🎤 en haut.</div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Enregistrements de ce cours
        </div>

        {hasAudio && course.audioPath && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mic size={13} /> Audio
            </div>
            <MediaPlayer type="audio" filePath={course.audioPath} />
          </div>
        )}

        {hasVideo && course.videoPath && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Monitor size={13} /> Enregistrement écran
            </div>
            <MediaPlayer type="video" filePath={course.videoPath} />
          </div>
        )}

        <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderOpen size={13} />
          Les fichiers sont conservés localement et ne seront jamais effacés automatiquement.
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', fontSize: 11 }}
            onClick={() => api.recording.reveal(course.audioPath ?? course.videoPath)}
          >
            Ouvrir le dossier
          </button>
        </div>
      </div>
    </div>
  )
}
