import { ScheduleCategory } from './schedule'

export type RecommendationSource = 'AI_SCAN' | 'AI_CHATBOT' | 'SYSTEM' | 'MANUAL'
export type RecommendationStatus = 'PENDING' | 'SAVED' | 'DISMISSED'
export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface Recommendation {
  id: string
  userId: string
  title: string
  description?: string | null
  suggestedStart: string // ISO datetime string
  suggestedEnd?: string | null // ISO datetime string
  category: ScheduleCategory
  recurrence: RecurrenceType
  remindBefore?: number | null // minutes
  source: RecommendationSource
  metadata?: Record<string, any>
  status: RecommendationStatus
  createdAt: string
  updatedAt: string
}

export interface RecommendationEdits {
  title?: string
  suggestedStart?: string
  suggestedEnd?: string
  category?: ScheduleCategory
  recurrence?: RecurrenceType
  remindBefore?: number
  description?: string
}

export interface GenerateRecommendationsRequest {
  userId: string
  context: {
    events: Array<{
      title: string
      start: string // ISO datetime
      end: string // ISO datetime
      recurrence?: string
      category?: string
    }>
    preferences?: {
      workingHours?: { start: string; end: string }
      busyDays?: string[]
      preferredDays?: string[]
      minGapMinutes?: number
      maxDailyNewEvents?: number
    }
  }
  trigger: 'manual' | 'upload' | 'chatbot' | 'cron'
}

export interface GenerateRecommendationsResponse {
  success: boolean
  recommendations?: Recommendation[]
  error?: string
}

export interface ConfirmRecommendationRequest {
  edits?: RecommendationEdits
  overrideConflict?: boolean
}

export interface ConfirmRecommendationResponse {
  success: boolean
  scheduleId?: string
  error?: string
  conflict?: {
    existingEventId: string
    overlapWindow: { start: string; end: string }
  }
}


