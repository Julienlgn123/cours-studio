import { create } from 'zustand'
import type { Subject, Course, CourseVersion } from '../../../shared/types'

export interface AITask {
  courseId: string
  courseTitle: string
  courseEmoji: string
  action: string
  actionLabel: string
  status: 'running' | 'done' | 'error'
  result?: string
  error?: string
}

interface AppStore {
  subjects: Subject[]
  courses: Course[]
  activeCourseId: string | null
  activeSubjectId: string | null

  view: 'home' | 'subject' | 'editor' | 'ai'
  sidebarCollapsed: boolean
  searchQuery: string
  settings: { mistralApiKey?: string; mistralModel?: string }

  toast: { message: string; type: 'success' | 'error' | 'info' } | null

  // Global AI task banner
  aiTask: AITask | null

  loadSubjects: () => Promise<void>
  loadCourses: (subjectId?: string) => Promise<void>
  createSubject: (data: Omit<Subject, 'id' | 'createdAt'>) => Promise<Subject>
  updateSubject: (id: string, data: Partial<Omit<Subject, 'id' | 'createdAt'>>) => Promise<void>
  deleteSubject: (id: string) => Promise<void>
  createCourse: (data: { subjectId: string; title?: string; emoji?: string; content?: string; audioPath?: string; videoPath?: string }) => Promise<Course>
  updateCourse: (id: string, data: Partial<{ title: string; emoji: string; content: string; subjectId: string; audioPath: string; videoPath: string }>) => Promise<void>
  deleteCourse: (id: string) => Promise<void>
  setActiveCourse: (id: string | null) => void
  setActiveSubject: (id: string | null) => void
  setView: (view: AppStore['view']) => void
  setSearchQuery: (q: string) => void
  loadSettings: () => Promise<void>
  saveSettings: (s: AppStore['settings']) => Promise<void>
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  hideToast: () => void

  // AI task banner
  startAITask: (task: Omit<AITask, 'status'>) => void
  completeAITask: (result: string) => void
  failAITask: (error: string) => void
  dismissAITask: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (window as any).api

export const useStore = create<AppStore>((set, get) => ({
  subjects: [],
  courses: [],
  activeCourseId: null,
  activeSubjectId: null,
  view: 'home',
  sidebarCollapsed: false,
  searchQuery: '',
  settings: {},
  toast: null,
  aiTask: null,

  loadSubjects: async () => {
    const subjects = await api.subjects.get()
    set({ subjects })
    const courses = await api.courses.all()
    set({ courses })
  },

  loadCourses: async (subjectId?: string) => {
    const courses = subjectId ? await api.courses.bySubject(subjectId) : await api.courses.all()
    set({ courses })
  },

  createSubject: async (data) => {
    const subject = await api.subjects.create(data)
    set((s) => ({ subjects: [subject, ...s.subjects] }))
    return subject
  },

  updateSubject: async (id, data) => {
    await api.subjects.update(id, data)
    set((s) => ({ subjects: s.subjects.map((sub) => sub.id === id ? { ...sub, ...data } : sub) }))
  },

  deleteSubject: async (id) => {
    await api.subjects.delete(id)
    set((s) => ({
      subjects: s.subjects.filter((sub) => sub.id !== id),
      courses: s.courses.filter((c) => c.subjectId !== id),
      activeSubjectId: s.activeSubjectId === id ? null : s.activeSubjectId,
      view: s.activeSubjectId === id ? 'home' : s.view
    }))
  },

  createCourse: async (data) => {
    const course = await api.courses.create(data)
    set((s) => ({ courses: [course, ...s.courses] }))
    return course
  },

  updateCourse: async (id, data) => {
    await api.courses.update(id, data)
    set((s) => ({ courses: s.courses.map((c) => c.id === id ? { ...c, ...data, updatedAt: Date.now() } : c) }))
  },

  deleteCourse: async (id) => {
    await api.courses.delete(id)
    set((s) => ({ courses: s.courses.filter((c) => c.id !== id), activeCourseId: s.activeCourseId === id ? null : s.activeCourseId }))
  },

  setActiveCourse: (id) => set({ activeCourseId: id }),
  setActiveSubject: (id) => set({ activeSubjectId: id }),
  setView: (view) => set({ view }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  loadSettings: async () => { const settings = await api.settings.get(); set({ settings }) },
  saveSettings: async (settings) => { await api.settings.set(settings); set({ settings }) },

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })
    setTimeout(() => get().hideToast(), 3000)
  },
  hideToast: () => set({ toast: null }),

  startAITask: (task) => set({ aiTask: { ...task, status: 'running' } }),
  completeAITask: (result) => set((s) => s.aiTask ? { aiTask: { ...s.aiTask, status: 'done', result } } : {}),
  failAITask: (error) => set((s) => s.aiTask ? { aiTask: { ...s.aiTask, status: 'error', error } } : {}),
  dismissAITask: () => set({ aiTask: null })
}))
