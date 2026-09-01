import { contextBridge, ipcRenderer } from 'electron'

const api = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },
  subjects: {
    get: () => ipcRenderer.invoke('subjects:get'),
    create: (data: unknown) => ipcRenderer.invoke('subjects:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('subjects:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('subjects:delete', id)
  },
  courses: {
    bySubject: (subjectId: string) => ipcRenderer.invoke('courses:bySubject', subjectId),
    get: (id: string) => ipcRenderer.invoke('courses:get', id),
    create: (data: unknown) => ipcRenderer.invoke('courses:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('courses:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('courses:delete', id),
    all: () => ipcRenderer.invoke('courses:all')
  },
  versions: {
    get: (courseId: string) => ipcRenderer.invoke('versions:get', courseId),
    create: (data: unknown) => ipcRenderer.invoke('versions:create', data)
  },
  recording: {
    getSources: () => ipcRenderer.invoke('recording:getSources'),
    save: (data: { subjectName: string; courseName: string; type: 'audio' | 'video'; buffer: number[] }) => ipcRenderer.invoke('recording:save', data),
    reveal: (filePath: string) => ipcRenderer.invoke('recording:reveal', filePath)
  },
  media: {
    url: (filePath: string): Promise<string> => ipcRenderer.invoke('media:url', filePath)
  },
  ai: {
    // Streaming: returns a cleanup function
    stream: (
      data: unknown,
      onChunk: (chunk: string) => void,
      onDone: () => void,
      onError: (err: string) => void
    ): (() => void) => {
      const handleChunk = (_: unknown, chunk: string) => onChunk(chunk)
      const handleDone = () => onDone()
      const handleError = (_: unknown, err: string) => onError(err)

      ipcRenderer.on('ai:chunk', handleChunk)
      ipcRenderer.on('ai:done', handleDone)
      ipcRenderer.on('ai:error', handleError)

      ipcRenderer.invoke('ai:stream', data)

      return () => {
        ipcRenderer.removeListener('ai:chunk', handleChunk)
        ipcRenderer.removeListener('ai:done', handleDone)
        ipcRenderer.removeListener('ai:error', handleError)
      }
    },
    // Non-streaming completion, used by the quiz generator to get a single JSON response
    complete: (data: unknown): Promise<string> => ipcRenderer.invoke('ai:complete', data)
  },
  documents: {
    // Opens a native file picker (pdf/docx/odt/txt) and returns the extracted plain text
    import: (): Promise<{ fileName: string; text: string } | null> => ipcRenderer.invoke('documents:import')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (data: unknown) => ipcRenderer.invoke('settings:set', data)
  },
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    checkUpdate: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: () => ipcRenderer.invoke('update:download'),
    installUpdate: () => ipcRenderer.invoke('update:install'),
    onUpdateAvailable: (cb: (info: { version: string; releaseNotes: string }) => void) => {
      const handler = (_: unknown, info: { version: string; releaseNotes: string }) => cb(info)
      ipcRenderer.on('update:available', handler)
      return () => ipcRenderer.removeListener('update:available', handler)
    },
    onUpdateNotAvailable: (cb: () => void) => {
      ipcRenderer.on('update:not-available', cb)
      return () => ipcRenderer.removeListener('update:not-available', cb)
    },
    onUpdateProgress: (cb: (pct: number) => void) => {
      const handler = (_: unknown, pct: number) => cb(pct)
      ipcRenderer.on('update:progress', handler)
      return () => ipcRenderer.removeListener('update:progress', handler)
    },
    onUpdateDownloaded: (cb: () => void) => {
      ipcRenderer.on('update:downloaded', cb)
      return () => ipcRenderer.removeListener('update:downloaded', cb)
    },
    onUpdateError: (cb: (err: string) => void) => {
      const handler = (_: unknown, err: string) => cb(err)
      ipcRenderer.on('update:error', handler)
      return () => ipcRenderer.removeListener('update:error', handler)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
export type Api = typeof api
