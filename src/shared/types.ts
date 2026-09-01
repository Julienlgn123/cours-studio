export interface Subject {
  id: string
  name: string
  emoji: string
  color: string
  createdAt: number
}

export interface CourseVersion {
  id: string
  courseId: string
  content: string
  label: string
  source: 'manual' | 'ai'
  aiAction?: string
  createdAt: number
}

export interface Course {
  id: string
  subjectId: string
  title: string
  emoji: string
  content: string
  audioPath?: string
  videoPath?: string
  versions: CourseVersion[]
  createdAt: number
  updatedAt: number
}

export interface Recording {
  type: 'audio' | 'video' | 'both'
  state: 'idle' | 'recording' | 'paused' | 'stopped'
  duration: number
  audioPath?: string
  videoPath?: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export type AIAction =
  | 'improve'
  | 'summarize'
  | 'explain'
  | 'reorganize'
  | 'merge'
  | 'chat'

export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}
