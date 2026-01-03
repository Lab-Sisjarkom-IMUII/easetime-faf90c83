import { Schedule } from './schedule'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system' | 'preview'
  content: string
  timestamp: Date
  schedulePreview?: ParsedSchedule
  clarificationQuestion?: string
}

export interface ParsedSchedule {
  title: string
  dateStart: string // YYYY-MM-DD
  timeStart: string // HH:mm
  dateEnd?: string | null
  timeEnd?: string // HH:mm
  timezone: string // default: "Asia/Jakarta"
  repeatType: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
  repeatRule?: {
    byDay?: string[] // ["MO", "WE"] untuk weekly
    interval?: number
  } | null
  earlyReminderMinutes?: number // default: 30
  location?: string | null
  description?: string | null
  ambiguousFields: string[] // fields yang perlu klarifikasi
  rawNlText?: string // original user message
}

export interface ParseResponse {
  success: boolean
  schedules: ParsedSchedule[] // Array untuk multi-schedule
  clarificationQuestion?: string // Jika ada ambiguous fields
  error?: string
}

export interface ConfirmRequest {
  schedules: ParsedSchedule[]
}

export interface ConfirmResponse {
  success: boolean
  schedules?: Schedule[]
  error?: string
}

export interface ChatHistory {
  id: string
  userId: string
  message: string
  response: string
  createdAt: string
  schedules?: Schedule[]
}

