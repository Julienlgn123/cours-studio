import { app, BrowserWindow, shell, ipcMain, desktopCapturer, protocol, net } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { initDb, getSubjects, createSubject, updateSubject, deleteSubject,
  getCoursesBySubject, getCourse, createCourse, updateCourse, deleteCourse,
  getAllCourses, getVersions, createVersion } from './db'
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { join as pathJoin } from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
let ffmpegPath: string = require('ffmpeg-static')

// When packaged via electron-builder, native modules are in app.asar.unpacked
if (app.isPackaged) {
  const unpacked = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
  if (existsSync(unpacked)) ffmpegPath = unpacked
  else {
    // extraResources fallback
    const extra = pathJoin(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe')
    if (existsSync(extra)) ffmpegPath = extra
  }
}

ffmpeg.setFfmpegPath(ffmpegPath)

let mainWindow: BrowserWindow

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, stream: true } }
])

function sanitize(str: string): string {
  return str.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60) || 'sans-titre'
}

function convertToMp3(input: string, output: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .audioCodec('libmp3lame')
      .audioBitrate(192)
      .format('mp3')
      .on('end', () => { try { unlinkSync(input) } catch { /* ok */ }; resolve(output) })
      .on('error', (err) => reject(err))
      .save(output)
  })
}

function convertToMp4(input: string, output: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset fast', '-crf 23', '-movflags +faststart'])
      .format('mp4')
      .on('end', () => { try { unlinkSync(input) } catch { /* ok */ }; resolve(output) })
      .on('error', (err) => reject(err))
      .save(output)
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    show: false, frame: false, titleBarStyle: 'hidden', backgroundColor: '#0d0d0f',
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, contextIsolation: true }
  })
  mainWindow.on('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.cours-studio')
  app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))

  protocol.handle('media', (request) => {
    const path = request.url.slice('media://'.length)
    return net.fetch(`file://${path}`)
  })

  initDb()
  registerIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

  // Auto-updater (only when packaged)
  if (app.isPackaged) {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info) => {
      mainWindow.webContents.send('update:available', { version: info.version, releaseNotes: info.releaseNotes })
    })
    autoUpdater.on('update-not-available', () => {
      mainWindow.webContents.send('update:not-available')
    })
    autoUpdater.on('download-progress', (progress) => {
      mainWindow.webContents.send('update:progress', Math.round(progress.percent))
    })
    autoUpdater.on('update-downloaded', () => {
      mainWindow.webContents.send('update:downloaded')
    })
    autoUpdater.on('error', (err) => {
      mainWindow.webContents.send('update:error', err.message)
    })

    // Check 3 seconds after launch
    setTimeout(() => autoUpdater.checkForUpdates(), 3000)
  }
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

function getRecordingsDir(): string {
  const dir = join(app.getPath('userData'), 'recordings')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function registerIpc(): void {
  ipcMain.handle('window:minimize', () => mainWindow.minimize())
  ipcMain.handle('window:maximize', () => { mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize() })
  ipcMain.handle('window:close', () => mainWindow.close())

  ipcMain.handle('subjects:get', () => getSubjects())
  ipcMain.handle('subjects:create', (_, d) => createSubject(d))
  ipcMain.handle('subjects:update', (_, id, d) => { updateSubject(id, d); return true })
  ipcMain.handle('subjects:delete', (_, id) => { deleteSubject(id); return true })

  ipcMain.handle('courses:bySubject', (_, id) => getCoursesBySubject(id))
  ipcMain.handle('courses:get', (_, id) => getCourse(id))
  ipcMain.handle('courses:create', (_, d) => createCourse(d))
  ipcMain.handle('courses:update', (_, id, d) => { updateCourse(id, d); return true })
  ipcMain.handle('courses:delete', (_, id) => { deleteCourse(id); return true })
  ipcMain.handle('courses:all', () => getAllCourses())

  ipcMain.handle('versions:get', (_, id) => getVersions(id))
  ipcMain.handle('versions:create', (_, d) => createVersion(d))

  ipcMain.handle('recording:getSources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] })
    return sources.map((s) => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }))
  })

  // Save + convert to MP3 or MP4
  ipcMain.handle('recording:save', async (_, { subjectName, courseName, type, buffer }: {
    subjectName: string; courseName: string; type: 'audio' | 'video'; buffer: number[]
  }) => {
    const folderName = `${sanitize(subjectName)} - ${sanitize(courseName)}`
    const dir = join(getRecordingsDir(), folderName)
    mkdirSync(dir, { recursive: true })

    const date = new Date().toISOString().slice(0, 10)
    const ts = Date.now()

    // Write raw WebM first
    const rawPath = join(dir, `${type}-${date}-${ts}.webm`)
    writeFileSync(rawPath, Buffer.from(buffer))

    // Convert: audio → MP3, video → MP4
    if (type === 'audio') {
      const mp3Path = join(dir, `audio-${date}-${ts}.mp3`)
      try {
        return await convertToMp3(rawPath, mp3Path)
      } catch {
        // ffmpeg failed: keep the webm as fallback
        return rawPath
      }
    } else {
      const mp4Path = join(dir, `video-${date}-${ts}.mp4`)
      try {
        return await convertToMp4(rawPath, mp4Path)
      } catch {
        return rawPath
      }
    }
  })

  ipcMain.handle('media:url', (_, filePath: string) => {
    const normalized = filePath.split('\\').join('/')
    return `media://${normalized.startsWith('/') ? '' : '/'}${normalized}`
  })

  ipcMain.handle('recording:reveal', (_, filePath: string) => shell.showItemInFolder(filePath))

  // Mistral streaming — use model from settings or fallback to mistral-small-latest
  ipcMain.handle('ai:stream', async (event, { apiKey, messages, model }: {
    apiKey: string; messages: unknown[]; model?: string
  }) => {
    const selectedModel = model || 'open-mistral-7b'
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: selectedModel, messages, temperature: 0.7, max_tokens: 4096, stream: true })
      })

      if (!response.ok) {
        let errText = await response.text()
        // Try to extract friendly message
        try {
          const parsed = JSON.parse(errText) as { message?: string }
          if (parsed.message) errText = parsed.message
        } catch { /* keep raw */ }
        event.sender.send('ai:error', errText)
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { event.sender.send('ai:done'); return }
          try {
            const parsed = JSON.parse(data) as { choices: Array<{ delta: { content?: string } }> }
            const delta = parsed.choices[0]?.delta?.content
            if (delta) event.sender.send('ai:chunk', delta)
          } catch { /* skip */ }
        }
      }
      event.sender.send('ai:done')
    } catch (err) {
      event.sender.send('ai:error', err instanceof Error ? err.message : String(err))
    }
  })

  const settingsPath = join(app.getPath('userData'), 'settings.json')
  ipcMain.handle('settings:get', () => { try { return JSON.parse(readFileSync(settingsPath, 'utf-8')) } catch { return {} } })
  ipcMain.handle('settings:set', (_, d) => { writeFileSync(settingsPath, JSON.stringify(d, null, 2)); return true })
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('update:check', () => { if (app.isPackaged) autoUpdater.checkForUpdates() })
  ipcMain.handle('update:download', () => { if (app.isPackaged) autoUpdater.downloadUpdate() })
  ipcMain.handle('update:install', () => { if (app.isPackaged) { autoUpdater.quitAndInstall(false, true) } })
}
