import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import type { Subject, Course, CourseVersion } from '../shared/types'

let db: Database.Database

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function initDb(): void {
  // Must be called after app.whenReady() so app.getPath works correctly
  const dbPath = join(app.getPath('userData'), 'cours-studio.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '📚',
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Sans titre',
      emoji TEXT NOT NULL DEFAULT '📝',
      content TEXT NOT NULL DEFAULT '',
      audio_path TEXT,
      video_path TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS course_versions (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      label TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      ai_action TEXT,
      created_at INTEGER NOT NULL
    );
  `)

  // Migration: add emoji column to courses if it doesn't exist yet
  const cols = db.prepare("PRAGMA table_info(courses)").all() as Array<{ name: string }>
  if (!cols.find((c) => c.name === 'emoji')) {
    db.exec("ALTER TABLE courses ADD COLUMN emoji TEXT NOT NULL DEFAULT '📝'")
  }
}

// ─── Subjects ──────────────────────────────────────────────────────────────

export function getSubjects(): Subject[] {
  return (db.prepare('SELECT * FROM subjects ORDER BY created_at DESC').all() as DbSubject[]).map(rowToSubject)
}

export function createSubject(data: Omit<Subject, 'id' | 'createdAt'>): Subject {
  const id = generateId()
  const now = Date.now()
  db.prepare('INSERT INTO subjects (id, name, emoji, color, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, data.name, data.emoji, data.color, now)
  return { id, ...data, createdAt: now }
}

export function updateSubject(id: string, data: Partial<Omit<Subject, 'id' | 'createdAt'>>): void {
  const fields: string[] = []
  const values: unknown[] = []
  if (data.name !== undefined)  { fields.push('name = ?');  values.push(data.name) }
  if (data.emoji !== undefined) { fields.push('emoji = ?'); values.push(data.emoji) }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color) }
  if (!fields.length) return
  values.push(id)
  db.prepare(`UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteSubject(id: string): void {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(id)
}

// ─── Courses ───────────────────────────────────────────────────────────────

export function getCoursesBySubject(subjectId: string): Course[] {
  return (db.prepare('SELECT * FROM courses WHERE subject_id = ? ORDER BY created_at DESC').all(subjectId) as DbCourse[])
    .map(rowToCourse)
}

export function getCourse(id: string): Course | null {
  const row = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as DbCourse | undefined
  return row ? rowToCourse(row) : null
}

export function createCourse(data: {
  subjectId: string; title?: string; emoji?: string; content?: string; audioPath?: string; videoPath?: string
}): Course {
  const id = generateId()
  const now = Date.now()
  db.prepare(
    'INSERT INTO courses (id, subject_id, title, emoji, content, audio_path, video_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, data.subjectId, data.title ?? 'Sans titre', data.emoji ?? '📝', data.content ?? '', data.audioPath ?? null, data.videoPath ?? null, now, now)
  return { id, subjectId: data.subjectId, title: data.title ?? 'Sans titre', emoji: data.emoji ?? '📝', content: data.content ?? '', audioPath: data.audioPath, videoPath: data.videoPath, versions: [], createdAt: now, updatedAt: now }
}

export function updateCourse(id: string, data: Partial<{ title: string; emoji: string; content: string; subjectId: string; audioPath: string; videoPath: string }>): void {
  const fields: string[] = ['updated_at = ?']
  const values: unknown[] = [Date.now()]
  if (data.title !== undefined)     { fields.push('title = ?');      values.push(data.title) }
  if (data.emoji !== undefined)     { fields.push('emoji = ?');      values.push(data.emoji) }
  if (data.content !== undefined)   { fields.push('content = ?');    values.push(data.content) }
  if (data.subjectId !== undefined) { fields.push('subject_id = ?'); values.push(data.subjectId) }
  if (data.audioPath !== undefined) { fields.push('audio_path = ?'); values.push(data.audioPath) }
  if (data.videoPath !== undefined) { fields.push('video_path = ?'); values.push(data.videoPath) }
  values.push(id)
  db.prepare(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteCourse(id: string): void {
  db.prepare('DELETE FROM courses WHERE id = ?').run(id)
}

export function getAllCourses(): Course[] {
  return (db.prepare('SELECT * FROM courses ORDER BY created_at DESC').all() as DbCourse[]).map(rowToCourse)
}

// ─── Versions ──────────────────────────────────────────────────────────────

export function getVersions(courseId: string): CourseVersion[] {
  return (db.prepare('SELECT * FROM course_versions WHERE course_id = ? ORDER BY created_at DESC').all(courseId) as DbVersion[])
    .map(rowToVersion)
}

export function createVersion(data: Omit<CourseVersion, 'id' | 'createdAt'>): CourseVersion {
  const id = generateId()
  const now = Date.now()
  db.prepare('INSERT INTO course_versions (id, course_id, content, label, source, ai_action, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, data.courseId, data.content, data.label, data.source, data.aiAction ?? null, now)
  return { id, ...data, createdAt: now }
}

// ─── Row types & mappers ────────────────────────────────────────────────────

interface DbSubject { id: string; name: string; emoji: string; color: string; created_at: number }
interface DbCourse  { id: string; subject_id: string; title: string; emoji: string; content: string; audio_path: string | null; video_path: string | null; created_at: number; updated_at: number }
interface DbVersion { id: string; course_id: string; content: string; label: string; source: string; ai_action: string | null; created_at: number }

function rowToSubject(row: DbSubject): Subject {
  return { id: row.id, name: row.name, emoji: row.emoji, color: row.color, createdAt: row.created_at }
}

function rowToCourse(row: DbCourse): Course {
  const versions = (db.prepare('SELECT * FROM course_versions WHERE course_id = ? ORDER BY created_at DESC').all(row.id) as DbVersion[]).map(rowToVersion)
  return { id: row.id, subjectId: row.subject_id, title: row.title, emoji: row.emoji ?? '📝', content: row.content, audioPath: row.audio_path ?? undefined, videoPath: row.video_path ?? undefined, versions, createdAt: row.created_at, updatedAt: row.updated_at }
}

function rowToVersion(row: DbVersion): CourseVersion {
  return { id: row.id, courseId: row.course_id, content: row.content, label: row.label, source: row.source as 'manual' | 'ai', aiAction: row.ai_action ?? undefined, createdAt: row.created_at }
}
