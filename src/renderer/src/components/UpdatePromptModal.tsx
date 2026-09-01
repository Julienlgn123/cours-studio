import { useEffect, useState } from 'react'
import { Download, Sparkles, CheckCircle } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (window as any).api

type Step = 'hidden' | 'prompt' | 'downloading' | 'downloaded' | 'error'

export default function UpdatePromptModal() {
  const [step, setStep] = useState<Step>('hidden')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const cleanups = [
      api.app.onUpdateAvailable(({ version }: { version: string }) => {
        setVersion(version)
        if (!dismissed) setStep('prompt')
      }),
      api.app.onUpdateProgress((pct: number) => { setProgress(pct); setStep('downloading') }),
      api.app.onUpdateDownloaded(() => setStep('downloaded')),
      api.app.onUpdateError((err: string) => { setError(err); setStep('error') })
    ]
    return () => cleanups.forEach((c) => c())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function acceptUpdate() {
    setStep('downloading')
    setProgress(0)
    api.app.downloadUpdate()
  }

  function declineUpdate() {
    setDismissed(true)
    setStep('hidden')
  }

  if (step === 'hidden') return null

  return (
    <div className="modal-overlay" onClick={step === 'prompt' ? declineUpdate : undefined}>
      <div className="modal fade-in" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-body" style={{ paddingTop: 24, textAlign: 'center' }}>
          {step === 'prompt' && (
            <>
              <Sparkles size={28} style={{ color: 'var(--accent)', marginBottom: 10 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Nouvelle version disponible</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                La version {version} de Cours Studio est prête à être installée. Tu veux la mettre à jour maintenant ?
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={declineUpdate}>Plus tard</button>
                <button className="btn btn-primary" onClick={acceptUpdate}>
                  <Download size={14} /> Mettre à jour
                </button>
              </div>
            </>
          )}

          {step === 'downloading' && (
            <>
              <Download size={28} style={{ color: 'var(--accent)', marginBottom: 10 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Téléchargement...</div>
              <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{progress}%</div>
            </>
          )}

          {step === 'downloaded' && (
            <>
              <CheckCircle size={28} style={{ color: 'var(--success)', marginBottom: 10 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Mise à jour prête</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                L'application va redémarrer pour installer la version {version}.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={declineUpdate}>Plus tard</button>
                <button className="btn btn-primary" onClick={() => api.app.installUpdate()}>
                  Installer et redémarrer
                </button>
              </div>
            </>
          )}

          {step === 'error' && (
            <>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--danger)' }}>Échec de la mise à jour</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{error}</div>
              <button className="btn btn-secondary" onClick={declineUpdate}>Fermer</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
