export type RecurrencePattern = 
  | 'daily'      // Setiap hari
  | 'weekly'     // Setiap minggu (hari yang sama)
  | 'monthly'    // Setiap bulan (tanggal yang sama)
  | 'none'       // Tidak berulang

export type ScheduleCategory = 
  | 'academic'    // Jadwal kuliah/akademik
  | 'event'       // Event/acara
  | 'personal'    // Personal/pribadi
  | 'work'        // Kerja/meeting
  | 'other'       // Lainnya

// Raw extracted schedule from AI (before processing)
export interface ExtractedSchedule {
  id_temp: string // Temporary ID
  title: string
  day_of_week: string[] | string // Array of day names or single string
  start_time?: string // Format: "HH:MM"
  end_time?: string // Format: "HH:MM" (optional)
  date_start?: string // Format: "YYYY-MM-DD" (if specific event)
  recurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | any // Recurrence rule
  recurrence_start_date?: string // Format: "YYYY-MM-DD"
  recurrence_end_date?: string // Format: "YYYY-MM-DD"
  location?: string
  description?: string
  category?: ScheduleCategory // Category classification
  confidence: number // 0.0-1.0
  source_text: string // Source text snippet
  page_number?: number // Page number if multi-page
}

// Processed schedule (after normalization and deduplication)
export interface Schedule {
  id?: string
  title: string
  location?: string // Optional - omit if not found, don't use placeholder
  date: string // ISO date string (tanggal pertama/awal)
  timeStart: string // Format: "HH:mm"
  timeEnd: string // Format: "HH:mm"
  notes?: string
  category?: ScheduleCategory // Category classification
  
  // Recurring schedule fields
  isRecurring?: boolean
  recurrencePattern?: RecurrencePattern
  recurrenceStartDate?: string // ISO date - kapan perulangan mulai
  recurrenceEndDate?: string   // ISO date - kapan perulangan selesai
  recurrenceDaysOfWeek?: number[] // [0-6] untuk weekly: 0=Sunday, 1=Monday, etc.
  
  // Additional fields from extraction
  confidence?: number // Confidence score from AI
  source_text?: string // Source text that generated this entry
  needs_review?: boolean // Flag if confidence < 0.6
  
  // Reminder fields
  reminderEnabled?: boolean // Whether reminder is enabled
  reminderMinutesBefore?: number // Minutes before schedule to show reminder (e.g., 30, 60, 120)
  
  user_id?: string
  created_at?: string
  updated_at?: string
}

export interface UploadResponse {
  success: boolean
  fileId?: string
  fileUrl?: string
  schedules?: Schedule[]
  extractedSchedules?: ExtractedSchedule[] // Raw extracted schedules before processing
  error?: string
}

export interface ConfirmResponse {
  success: boolean
  schedules?: Schedule[]
  error?: string
}

export interface FileUploadState {
  file: File | null
  uploading: boolean
  uploadProgress: number
  error: string | null
}

