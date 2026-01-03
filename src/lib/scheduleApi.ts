import { base64Client } from './base64'
import { Schedule, UploadResponse, ConfirmResponse, ExtractedSchedule } from '../types/schedule'

const LLM_PROMPT = `You are an expert assistant that extracts schedule/class schedule data from documents using OCR and text analysis.

Your task: Extract ALL schedule entries from the document and convert them to structured JSON. CRITICAL: If a course appears multiple times per week (different days/times), create SEPARATE entries for EACH occurrence.

CRITICAL RULES:
1. SEPARATION RULE: If one line mentions multiple days (e.g., "PABW: Senin & Rabu 09:00-10:30"), create TWO separate entries: one for Senin, one for Rabu.
2. Support day name variations:
   - Indonesian: Senin/Monday, Selasa/Tuesday, Rabu/Wednesday, Kamis/Thursday, Jumat/Friday, Sabtu/Saturday, Minggu/Sunday
   - English: Mon, Tue, Wed, Thu, Fri, Sat, Sun
3. Support separators: ",", "&", "dan", "/", "-", "—"
4. Support time formats: "09.00-10.30", "9:00-10:30", "09.00 s/d 10.30", "09:00-10:30"
5. If same title appears on different lines with different days/times, create separate entries per line.
6. Extract source_text: Include the exact text snippet from document that generated this entry.
7. Set confidence: 0.0-1.0 based on how clear the information is (0.95 for clear, 0.7 for ambiguous, 0.5 for uncertain).
8. LOCATION EXTRACTION - CRITICAL - READ CAREFULLY:
   - Extract location/room information with HIGH PRECISION. Location is VERY IMPORTANT.
   - Look for location information in these patterns:
     * Room numbers: "Ruang 301", "Room 301", "R.301", "R301", "301", "Ruang 3.01"
     * Lab names: "Lab Komputer A", "Lab A", "Laboratorium A", "Lab. A", "Lab Komputer", "Lab. Komputer"
     * Building names: "Gedung A", "Building A", "Gd. A", "Gedung Teknik", "Gedung T"
     * Floor information: "Lantai 2", "Floor 2", "Lt. 2", "Lantai II"
     * Complete location: "Gedung A Lantai 2 Ruang 301", "Building A Floor 2 Room 301", "Gd. A Lt. 2 R.301"
   - Location can appear in various positions:
     * After time with comma: "Senin 08:00-10:00, Lab A" → location: "Lab A"
     * After time without comma: "Senin 08:00-10:00 Lab A" → location: "Lab A"
     * After course name: "Algoritma Lab A" → location: "Lab A"
     * Before time: "Lab A Senin 08:00" → location: "Lab A"
     * In separate column/field in table format
     * At the end of line: "PABW Senin 09:00 Ruang 201" → location: "Ruang 201"
     * In parentheses: "Algoritma (Lab A)" → location: "Lab A"
   - CRITICAL: If location is mentioned once for multiple entries (e.g., "Algoritma: Senin & Rabu 08:00, Lab A"), include it in BOTH entries
   - CRITICAL: If same course has different locations on different days, extract the CORRECT location for EACH entry
   - Common Indonesian terms: "Ruang", "Lab", "Laboratorium", "Gedung", "Lantai", "Lt.", "R.", "Gd."
   - Common English terms: "Room", "Lab", "Laboratory", "Building", "Floor", "Rm."
   - Extract location EXACTLY as written in document (preserve capitalization, spacing, punctuation)
   - If location appears in table format, match location to the correct row/entry
   - If location is clearly not mentioned or cannot be determined with confidence, omit the location field (do NOT use "TBD", "N/A", or any placeholder)
   - Be careful not to confuse location with course name or other information
9. CATEGORY CLASSIFICATION - IMPORTANT:
   - Classify each schedule entry into one of these categories:
     * "academic": University/college classes, courses, lectures, tutorials, exams, assignments
       Examples: "PABW", "Algoritma", "Kalkulus", "Ujian Midterm", "Tugas Akhir", "Kuliah", "Praktikum"
     * "event": Public events, conferences, workshops, seminars, celebrations, competitions
       Examples: "Seminar Teknologi", "Workshop", "Concert", "Graduation", "Conference", "Webinar", "Lomba"
     * "personal": Personal appointments, family events, personal tasks, hobbies
       Examples: "Dokter", "Meeting Keluarga", "Olahraga", "Hobi", "Personal Time", "Liburan"
     * "work": Work meetings, business appointments, professional tasks, job-related
       Examples: "Meeting Tim", "Presentasi", "Deadline Project", "Interview", "Training", "Review"
     * "other": Anything that doesn't fit the above categories
   - Use context clues from title, description, and location to determine category
   - Look for keywords: "kuliah", "mata kuliah", "ujian", "tugas" → academic
   - Look for keywords: "seminar", "workshop", "conference", "event" → event
   - Look for keywords: "meeting", "presentasi", "deadline", "project" → work
   - If uncertain, default to "academic" for educational context, "event" for public events, or "other"
   - Category should be included in every entry

OUTPUT FORMAT (JSON array only, no explanations):
[{
  "id_temp": "string (unique temporary ID, e.g., '1', '2', '3')",
  "title": "string (course/subject name)",
  "day_of_week": ["Monday"] OR ["Monday", "Wednesday"] OR "Monday" (array of day names or single string),
  "start_time": "HH:MM" (24-hour format, required if time available),
  "end_time": "HH:MM" (24-hour format, optional)",
  "date_start": "YYYY-MM-DD" (ISO format, if specific event date, optional)",
  "recurrence": "NONE" | "DAILY" | "WEEKLY" | "MONTHLY",
  "recurrence_start_date": "YYYY-MM-DD" (optional, for recurring schedules)",
  "recurrence_end_date": "YYYY-MM-DD" (optional, for recurring schedules)",
  "location": "string (room/building, optional)",
  "description": "string (notes/description, optional)",
  "category": "academic" | "event" | "personal" | "work" | "other" (required, classify based on context)",
  "confidence": 0.0-1.0 (float, required)",
  "source_text": "string (exact text snippet from document, required)",
  "page_number": integer (page number if multi-page document, optional)
}]

FEW-SHOT EXAMPLES:

Example 1 - Input text:
"PABW: Senin 09.00-10.30, Rabu 11.00-12.30"

Expected Output:
[
  {
    "id_temp": "1",
    "title": "PABW",
    "day_of_week": ["Monday"],
    "start_time": "09:00",
    "end_time": "10:30",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "PABW: Senin 09.00-10.30"
  },
  {
    "id_temp": "2",
    "title": "PABW",
    "day_of_week": ["Wednesday"],
    "start_time": "11:00",
    "end_time": "12:30",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "PABW: Rabu 11.00-12.30"
  }
]

Example 2 - Input text:
"MatKul A: Senin 10.00-12.00; MatKul A: Rabu 10.00-12.00"

Expected Output:
[
  {
    "id_temp": "1",
    "title": "MatKul A",
    "day_of_week": ["Monday"],
    "start_time": "10:00",
    "end_time": "12:00",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "MatKul A: Senin 10.00-12.00"
  },
  {
    "id_temp": "2",
    "title": "MatKul A",
    "day_of_week": ["Wednesday"],
    "start_time": "10:00",
    "end_time": "12:00",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "MatKul A: Rabu 10.00-12.00"
  }
]

Example 3 - Input text:
"Praktek Lab – Jumat 13:00"

Expected Output:
[
  {
    "id_temp": "1",
    "title": "Praktek Lab",
    "day_of_week": ["Friday"],
    "start_time": "13:00",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.9,
    "source_text": "Praktek Lab – Jumat 13:00"
  }
]

Example 4 - Input text:
"Algoritma: Setiap Senin & Rabu jam 08:00-10:00, Lab A"

Expected Output:
[
  {
    "id_temp": "1",
    "title": "Algoritma",
    "day_of_week": ["Monday"],
    "start_time": "08:00",
    "end_time": "10:00",
    "location": "Lab A",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "Algoritma: Setiap Senin & Rabu jam 08:00-10:00, Lab A"
  },
  {
    "id_temp": "2",
    "title": "Algoritma",
    "day_of_week": ["Wednesday"],
    "start_time": "08:00",
    "end_time": "10:00",
    "location": "Lab A",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "Algoritma: Setiap Senin & Rabu jam 08:00-10:00, Lab A"
  }
]

Example 5 - Input text with different locations:
"PABW: Senin 09.00-10.30 Ruang 301, Rabu 11.00-12.30 Gedung A Lantai 2"

Expected Output:
[
  {
    "id_temp": "1",
    "title": "PABW",
    "day_of_week": ["Monday"],
    "start_time": "09:00",
    "end_time": "10:30",
    "location": "Ruang 301",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "PABW: Senin 09.00-10.30 Ruang 301"
  },
  {
    "id_temp": "2",
    "title": "PABW",
    "day_of_week": ["Wednesday"],
    "start_time": "11:00",
    "end_time": "12:30",
    "location": "Gedung A Lantai 2",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "PABW: Rabu 11.00-12.30 Gedung A Lantai 2"
  }
]

Example 5b - Input text with location after comma:
"Algoritma: Senin 08:00-10:00, Lab Komputer A"

Expected Output:
[
  {
    "id_temp": "1",
    "title": "Algoritma",
    "day_of_week": ["Monday"],
    "start_time": "08:00",
    "end_time": "10:00",
    "location": "Lab Komputer A",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "Algoritma: Senin 08:00-10:00, Lab Komputer A"
  }
]

Example 5c - Input text with location in parentheses:
"Basis Data (Ruang 301) Selasa 10:00-12:00"

Expected Output:
[
  {
    "id_temp": "1",
    "title": "Basis Data",
    "day_of_week": ["Tuesday"],
    "start_time": "10:00",
    "end_time": "12:00",
    "location": "Ruang 301",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "Basis Data (Ruang 301) Selasa 10:00-12:00"
  }
]

Example 6 - Input text with location in table format:
"| Mata Kuliah | Hari | Jam | Ruang |
| Algoritma | Senin | 08:00-10:00 | Lab Komputer A |
| Basis Data | Selasa | 10:00-12:00 | Ruang 301 |"

Expected Output:
[
  {
    "id_temp": "1",
    "title": "Algoritma",
    "day_of_week": ["Monday"],
    "start_time": "08:00",
    "end_time": "10:00",
    "location": "Lab Komputer A",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "Algoritma | Senin | 08:00-10:00 | Lab Komputer A"
  },
  {
    "id_temp": "2",
    "title": "Basis Data",
    "day_of_week": ["Tuesday"],
    "start_time": "10:00",
    "end_time": "12:00",
    "location": "Ruang 301",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "Basis Data | Selasa | 10:00-12:00 | Ruang 301"
  }
]

Example 7 - Input text with different categories:
"PABW: Senin 09.00-10.30 Ruang 301
Seminar AI: Jumat 14:00-16:00 Auditorium
Meeting Tim: Rabu 10:00-11:00"

Expected Output:
[
  {
    "id_temp": "1",
    "title": "PABW",
    "day_of_week": ["Monday"],
    "start_time": "09:00",
    "end_time": "10:30",
    "location": "Ruang 301",
    "category": "academic",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "PABW: Senin 09.00-10.30 Ruang 301"
  },
  {
    "id_temp": "2",
    "title": "Seminar AI",
    "day_of_week": ["Friday"],
    "start_time": "14:00",
    "end_time": "16:00",
    "location": "Auditorium",
    "category": "event",
    "recurrence": "NONE",
    "confidence": 0.95,
    "source_text": "Seminar AI: Jumat 14:00-16:00 Auditorium"
  },
  {
    "id_temp": "3",
    "title": "Meeting Tim",
    "day_of_week": ["Wednesday"],
    "start_time": "10:00",
    "end_time": "11:00",
    "category": "work",
    "recurrence": "WEEKLY",
    "confidence": 0.95,
    "source_text": "Meeting Tim: Rabu 10:00-11:00"
  }
]

RULES:
- Extract ALL schedules found in the document
- CRITICAL: Create SEPARATE entries for schedules with different days or times
- If same title + same day + similar time (within 10 minutes) → still create separate entries (backend will dedupe)
- day_of_week: Use English day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- Time format: Always use "HH:MM" (24-hour format)
- Date format: Always use "YYYY-MM-DD" (ISO format)
- recurrence: "WEEKLY" for weekly schedules, "DAILY" for daily, "MONTHLY" for monthly, "NONE" for one-time events
- confidence: 0.95 for very clear, 0.8-0.9 for clear, 0.6-0.7 for ambiguous, 0.5 or below for uncertain
- source_text: Include the exact text snippet that generated this entry (helpful for verification)
- LOCATION EXTRACTION RULES - CRITICAL:
  * Extract location information with HIGH PRECISION and ACCURACY
  * Look carefully for room numbers, lab names, building names, floor information
  * Location can appear: before time, after time (with/without comma), after course name, in parentheses, in separate column
  * If location is mentioned for multiple entries, include it in all relevant entries
  * If same course has DIFFERENT locations on different days, extract the CORRECT location for EACH entry
  * Preserve the exact location text as it appears in the document (e.g., "Ruang 301", "Lab Komputer A", "Gedung A Lantai 2")
  * Match location to the correct schedule entry (especially in table format)
  * Common patterns: "Ruang [number]", "Lab [name]", "Gedung [letter] Lantai [number]", "Room [number]", "Building [letter] Floor [number]"
  * Be careful not to confuse location with course name, time, or other information
  * If location is clearly not mentioned or cannot be determined with confidence, omit the location field (do NOT use "TBD", "N/A", or any placeholder)
- If time not specified, omit start_time and end_time fields
- If location not found or unclear, omit location field (do NOT use placeholder values)
- Return empty array [] ONLY if absolutely no schedule information is found
- Do NOT include explanations, only JSON array

Output JSON only:`

/**
 * Normalize dan validasi tanggal dari berbagai format
 */
function normalizeDate(dateString: string | undefined): string | null {
  if (!dateString) return null
  
  try {
    // Jika sudah format ISO (YYYY-MM-DD), validasi dan return
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const date = new Date(dateString + 'T00:00:00')
      if (!isNaN(date.getTime())) {
        return dateString
      }
    }
    
    // Coba parse berbagai format
    let parsedDate: Date | null = null
    
    // Format DD/MM/YYYY atau DD-MM-YYYY
    const ddmmyyyy = dateString.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy
      parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`)
    }
    
    // Format YYYY/MM/DD atau YYYY-MM-DD
    const yyyymmdd = dateString.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd
      parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`)
    }
    
    // Coba parse dengan Date constructor (untuk format lain)
    if (!parsedDate) {
      parsedDate = new Date(dateString)
    }
    
    // Validasi
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear()
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
      const day = String(parsedDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    console.warn('⚠️ Could not parse date:', dateString)
    return null
  } catch (error) {
    console.error('❌ Error normalizing date:', dateString, error)
    return null
  }
}

/**
 * Normalize waktu dari berbagai format
 */
function normalizeTime(timeString: string | undefined): string {
  if (!timeString) return '09:00'
  
  try {
    // Jika sudah format HH:mm, return
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString
    }
    
    // Format HH.mm atau HH:mm:ss
    const timeMatch = timeString.match(/(\d{1,2})[.:](\d{2})/)
    if (timeMatch) {
      const [, hour, minute] = timeMatch
      const hourNum = parseInt(hour)
      if (hourNum >= 0 && hourNum <= 23) {
        return `${hour.padStart(2, '0')}:${minute}`
      }
    }
    
    // Format dengan AM/PM
    const ampmMatch = timeString.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i)
    if (ampmMatch) {
      let [, hour, minute = '00', ampm] = ampmMatch
      let hourNum = parseInt(hour)
      if (ampm.toUpperCase() === 'PM' && hourNum !== 12) {
        hourNum += 12
      } else if (ampm.toUpperCase() === 'AM' && hourNum === 12) {
        hourNum = 0
      }
      if (hourNum >= 0 && hourNum <= 23) {
        return `${String(hourNum).padStart(2, '0')}:${minute}`
      }
    }
    
    console.warn('⚠️ Could not parse time:', timeString)
    return '09:00'
  } catch (error) {
    console.error('❌ Error normalizing time:', timeString, error)
    return '09:00'
  }
}

/**
 * Convert day name (string) to day number (0-6)
 * 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 */
function dayNameToNumber(dayName: string): number | null {
  const dayMap: { [key: string]: number } = {
    // English
    'sunday': 0, 'sun': 0,
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2, 'tues': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6,
    // Indonesian
    'minggu': 0,
    'senin': 1,
    'selasa': 2,
    'rabu': 3,
    'kamis': 4,
    'jumat': 5, 'jum\'at': 5,
    'sabtu': 6,
  }
  
  const normalized = dayName.toLowerCase().trim()
  return dayMap[normalized] ?? null
}

/**
 * Convert day_of_week (string[] or string) to number array
 */
function parseDaysOfWeek(dayOfWeek: string[] | string): number[] {
  if (Array.isArray(dayOfWeek)) {
    return dayOfWeek
      .map(day => dayNameToNumber(day))
      .filter((day): day is number => day !== null)
  } else if (typeof dayOfWeek === 'string') {
    const dayNum = dayNameToNumber(dayOfWeek)
    return dayNum !== null ? [dayNum] : []
  }
  return []
}

/**
 * Convert recurrence string to RecurrencePattern
 */
function parseRecurrence(recurrence: string): 'daily' | 'weekly' | 'monthly' | 'none' {
  const normalized = (recurrence || '').toUpperCase()
  if (normalized === 'DAILY') return 'daily'
  if (normalized === 'WEEKLY') return 'weekly'
  if (normalized === 'MONTHLY') return 'monthly'
  return 'none'
}

/**
 * Calculate next occurrence date for a day of week
 */
function getNextDayDate(dayNumber: number): string {
  return getNextDayDateFromBase(dayNumber, new Date())
}

function getNextDayDateFromBase(dayNumber: number, base: Date): string {
  const currentDay = base.getDay()
  // Pakai delta 0 agar jika harinya sama dengan hari ini, jadwal bisa dimulai hari ini (tidak loncat 7 hari)
  const daysUntil = (dayNumber - currentDay + 7) % 7
  const nextDate = new Date(base)
  nextDate.setDate(base.getDate() + daysUntil)
  return formatLocalDate(nextDate)
}

function getNextDateForDays(days: number[], base: Date): string {
  if (!days.length) return formatLocalDate(base)
  let bestDate = getNextDayDateFromBase(days[0], base)
  let bestDelta = new Date(bestDate).getTime() - new Date(formatLocalDate(base)).getTime()
  for (let i = 1; i < days.length; i++) {
    const candidate = getNextDayDateFromBase(days[i], base)
    const delta = new Date(candidate).getTime() - new Date(formatLocalDate(base)).getTime()
    if (delta < bestDelta) {
      bestDelta = delta
      bestDate = candidate
    }
  }
  return bestDate
}

/**
 * Post-processing: Deduplication
 * If two or more objects have same title + same day + similar time (within 10 minutes) → merge and increase confidence
 */
function deduplicateSchedules(schedules: ExtractedSchedule[]): ExtractedSchedule[] {
  const seen = new Map<string, ExtractedSchedule>()
  
  for (const schedule of schedules) {
    const days = parseDaysOfWeek(schedule.day_of_week)
    if (days.length === 0) continue
    
    // Create key for each day separately
    for (const dayNum of days) {
      const startTime = schedule.start_time || '09:00'
      const key = `${schedule.title.toLowerCase()}_${dayNum}_${startTime}`
      
      if (seen.has(key)) {
        const existing = seen.get(key)!
        // Check if times are within 10 minutes
        const timeDiff = Math.abs(
          timeToMinutes(startTime) - timeToMinutes(existing.start_time || '09:00')
        )
        
        if (timeDiff <= 10) {
          // Merge: increase confidence
          existing.confidence = Math.min(1.0, (existing.confidence + schedule.confidence) / 2)
          // Keep longer source_text
          if (schedule.source_text.length > existing.source_text.length) {
            existing.source_text = schedule.source_text
          }
        } else {
          // Different time, keep both
          seen.set(`${key}_${schedule.id_temp}`, schedule)
        }
      } else {
        // Create new entry for this day
        const daySpecificSchedule: ExtractedSchedule = {
          ...schedule,
          day_of_week: [getDayName(dayNum)],
          id_temp: `${schedule.id_temp}_${dayNum}`,
        }
        seen.set(key, daySpecificSchedule)
      }
    }
  }
  
  return Array.from(seen.values())
}

/**
 * Helper: Convert time string to minutes
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper: format Date ke YYYY-MM-DD tanpa menggeser timezone (local/Jakarta friendly)
function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Fallback location extraction using heuristics
 * Tries to extract location from source text when AI didn't provide it
 */
function extractLocationFallback(sourceText: string, title: string, time: string): string | undefined {
  if (!sourceText) return undefined
  
  const locationKeywords = [
    'ruang', 'room', 'r.', 'r ', 'lab', 'laboratorium', 'gedung', 'building', 
    'gd.', 'lantai', 'floor', 'lt.', 'auditorium', 'aula', 'hall', 'kelas'
  ]
  
  // Pattern 1: "di [lokasi]", "@ [lokasi]", "lokasi: [lokasi]"
  const pattern1 = /(?:di|@|lokasi:)\s*([A-Za-z0-9\s\.\-]+)/i
  const match1 = sourceText.match(pattern1)
  if (match1 && match1[1]) {
    const location = match1[1].trim()
    if (location.toLowerCase() !== title.toLowerCase() && 
        !location.match(/^\d{1,2}[:\.]\d{2}/)) {
      return location
    }
  }
  
  // Pattern 2: Location keywords followed by identifier
  const pattern2 = new RegExp(`(${locationKeywords.join('|')})\\s+([A-Za-z0-9\s\.\-]+)`, 'i')
  const match2 = sourceText.match(pattern2)
  if (match2 && match2[0]) {
    const location = match2[0].trim()
    // Validate: don't take if it's title or time
    if (location.toLowerCase() !== title.toLowerCase() && 
        !location.match(/^\d{1,2}[:\.]\d{2}/) &&
        location.length > 2) {
      return location
    }
  }
  
  // Pattern 3: After time with comma or space
  const timePattern = time.replace(/:/g, '[:\\.]')
  const pattern3 = new RegExp(`${timePattern}\\s*[,]?\\s*([A-Za-z0-9\\s\\.\\-]+)`, 'i')
  const match3 = sourceText.match(pattern3)
  if (match3 && match3[1]) {
    const location = match3[1].trim()
    if (locationKeywords.some(keyword => location.toLowerCase().includes(keyword.toLowerCase()))) {
      return location
    }
  }
  
  // Pattern 4: Building/room pattern (e.g., "Gedung A", "Ruang 301")
  const pattern4 = /\b([A-Z][a-z]+\s+(?:A|B|C|1|2|3|I|II|III|\d+))\b/
  const match4 = sourceText.match(pattern4)
  if (match4 && match4[1]) {
    const location = match4[1].trim()
    if (locationKeywords.some(keyword => location.toLowerCase().includes(keyword.toLowerCase()))) {
      return location
    }
  }
  
  return undefined
}

/**
 * Helper: Get day name from day number
 */
function getDayName(dayNum: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayNum] || 'Monday'
}

/**
 * Convert ExtractedSchedule to Schedule format
 */
function convertExtractedToSchedule(extracted: ExtractedSchedule[]): Schedule[] {
  return extracted.map((item) => {
    const days = parseDaysOfWeek(item.day_of_week)
    const firstDay = days.length > 0 ? days[0] : 1 // Default to Monday
    
    // PRIORITAS: date_start dari AI > normalize date_start > next day sesuai day_of_week (termasuk hari ini)
    let date: string
    if (item.date_start) {
      const normalized = normalizeDate(item.date_start)
      date = normalized || item.date_start
    } else if (days.length > 0) {
      date = getNextDateForDays(days, new Date())
    } else {
      date = getNextDayDate(firstDay)
    }
    
    // Log untuk debugging
    console.log(`📅 Date calculation for "${item.title}":`, {
      date_start: item.date_start,
      normalized: date,
      day_of_week: item.day_of_week,
      calculated_from_day: firstDay
    })
    
    // Calculate recurrence dates
    const recurrencePattern = parseRecurrence(item.recurrence)
    const isRecurring = recurrencePattern !== 'none'
    const recurrenceStartDate = item.recurrence_start_date
      || (isRecurring && days.length > 0 ? getNextDateForDays(days, new Date()) : date)
    const recurrenceEndDate = item.recurrence_end_date || (() => {
      const end = new Date(recurrenceStartDate || date)
      end.setMonth(end.getMonth() + 3)
      return formatLocalDate(end)
    })()
    
    // Normalize times
    const timeStart = normalizeTime(item.start_time) || '09:00'
    const timeEnd = normalizeTime(item.end_time) || (() => {
      const [hours, minutes] = timeStart.split(':').map(Number)
      const endTime = new Date()
      endTime.setHours(hours + 1, minutes)
      return `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`
    })()
    
    // Preserve location from AI if it exists, with fallback to heuristics
    let location = item.location && item.location.trim() ? item.location.trim() : undefined
    if (!location && item.source_text) {
      location = extractLocationFallback(item.source_text, item.title, timeStart)
      if (location) {
        console.log(`📍 Fallback location extraction for "${item.title}":`, location)
      }
    }
    
    return {
      title: item.title,
      location: location, // Preserve location from AI extraction or fallback
      date,
      timeStart,
      timeEnd,
      notes: item.description,
      category: item.category || 'academic', // Preserve category from AI, default to academic
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : undefined,
      recurrenceStartDate: isRecurring ? recurrenceStartDate : undefined,
      recurrenceEndDate: isRecurring ? recurrenceEndDate : undefined,
      recurrenceDaysOfWeek: isRecurring && recurrencePattern === 'weekly' ? days : undefined,
      confidence: item.confidence,
      source_text: item.source_text,
      needs_review: item.confidence < 0.6,
    }
  })
}

export const scheduleApi = {
  /**
   * Upload file dan scan dengan AI
   */
  async uploadAndScan(file: File): Promise<UploadResponse> {
    try {
      // 1. Upload file ke Base64 Storage
      const uploadResult = await base64Client.uploadFile(file)
      
      if (!uploadResult.success || !uploadResult.data) {
        return {
          success: false,
          error: uploadResult.error || 'Failed to upload file',
        }
      }

      const { fileId, fileUrl } = uploadResult.data

      // 2. Invoke LLM untuk extract schedule
      console.log('🤖 Invoking LLM to extract schedules...')
      const llmResult = await base64Client.invokeLLM(LLM_PROMPT, fileId)

      if (!llmResult.success) {
        console.error('❌ LLM failed:', llmResult.error)
        return {
          success: false,
          error: llmResult.error || 'Failed to analyze document',
          fileId,
          fileUrl,
        }
      }

      // 3. Parse LLM response
      console.log('📊 LLM Response:', llmResult.data)
      console.log('📊 Response type:', typeof llmResult.data)
      
      let extractedSchedules: ExtractedSchedule[] = []
      let schedules: Schedule[] = []
      
      try {
        // LLM response bisa berupa string JSON atau object
        let responseData: any
        
        if (typeof llmResult.data === 'string') {
          // Coba parse JSON, handle jika ada markdown code blocks
          let jsonString = llmResult.data.trim()
          
          // Remove markdown code blocks jika ada
          if (jsonString.startsWith('```')) {
            jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
          }
          
          responseData = JSON.parse(jsonString)
        } else {
          responseData = llmResult.data
        }

        console.log('📊 Parsed response:', responseData)
        console.log('📊 Is array?', Array.isArray(responseData))

        if (Array.isArray(responseData)) {
          // Parse as ExtractedSchedule format
          extractedSchedules = responseData.map((item: any) => {
            const extracted = {
              id_temp: item.id_temp || String(Date.now() + Math.random()),
              title: item.title || 'Untitled',
              day_of_week: item.day_of_week || [],
              start_time: item.start_time,
              end_time: item.end_time,
              date_start: item.date_start,
              recurrence: item.recurrence || 'NONE',
              recurrence_start_date: item.recurrence_start_date,
              recurrence_end_date: item.recurrence_end_date,
              location: item.location, // Preserve location from AI (can be string or undefined)
              description: item.description,
              category: item.category || 'academic', // Default to academic if not provided
              confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
              source_text: item.source_text || '',
              page_number: item.page_number,
            }
            // Log location and category extraction for debugging
            if (extracted.location) {
              console.log(`📍 Extracted location for "${extracted.title}":`, extracted.location)
            } else {
              console.log(`⚠️ No location extracted for "${extracted.title}"`)
            }
            console.log(`🏷️ Category for "${extracted.title}":`, extracted.category)
            return extracted
          })
          
          console.log('✅ Extracted raw schedules:', extractedSchedules.length, 'items')
          if (extractedSchedules.length > 0) {
            console.log('📋 Sample extracted schedule:', {
              title: extractedSchedules[0].title,
              location: extractedSchedules[0].location,
              day: extractedSchedules[0].day_of_week,
              time: extractedSchedules[0].start_time,
            })
          }
          
          // Post-processing: Deduplication
          const deduplicated = deduplicateSchedules(extractedSchedules)
          console.log('✅ After deduplication:', deduplicated.length, 'items')
          
          // Convert ExtractedSchedule to Schedule
          schedules = convertExtractedToSchedule(deduplicated)
          
          console.log('✅ Converted to Schedule format:', schedules.length, 'items')
          if (schedules.length > 0) {
            console.log('📅 First schedule:', schedules[0])
            console.log('📍 Location in first schedule:', schedules[0].location || 'NOT SET')
          }
        } else {
          console.warn('⚠️ Response is not an array:', responseData)
          // Coba extract array dari object jika ada
          if (responseData && typeof responseData === 'object') {
            const possibleArray = Object.values(responseData).find((v: any) => Array.isArray(v))
            if (possibleArray) {
              console.log('✅ Found array in response object')
              extractedSchedules = (possibleArray as any[]).map((item: any) => {
                const extracted = {
                  id_temp: item.id_temp || String(Date.now() + Math.random()),
                  title: item.title || 'Untitled',
                  day_of_week: item.day_of_week || [],
                  start_time: item.start_time,
                  end_time: item.end_time,
                  date_start: item.date_start,
                  recurrence: item.recurrence || 'NONE',
                  recurrence_start_date: item.recurrence_start_date,
                  recurrence_end_date: item.recurrence_end_date,
                  location: item.location, // Preserve location from AI
                  description: item.description,
                  confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
                  source_text: item.source_text || '',
                  page_number: item.page_number,
                }
                if (extracted.location) {
                  console.log(`📍 Extracted location for "${extracted.title}":`, extracted.location)
                }
                return extracted
              })
              
              const deduplicated = deduplicateSchedules(extractedSchedules)
              schedules = convertExtractedToSchedule(deduplicated)
            }
          }
        }
      } catch (parseError: any) {
        console.error('❌ Error parsing LLM response:', parseError)
        console.error('❌ Raw response:', llmResult.data)
        return {
          success: false,
          error: 'Failed to parse AI response. The document might not contain schedule information, or the format is not recognized. Please try again with a clearer schedule document.',
          fileId,
          fileUrl,
        }
      }

      return {
        success: true,
        fileId,
        fileUrl,
        schedules,
        extractedSchedules, // Include raw extracted for review
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unexpected error occurred',
      }
    }
  },

  /**
   * Konfirmasi dan simpan jadwal ke database
   */
  async confirmSchedules(schedules: Schedule[]): Promise<ConfirmResponse> {
    try {
      const { supabase } = await import('./supabase')
      
      // Pastikan session ter-load dengan benar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        return {
          success: false,
          error: 'Failed to get session: ' + sessionError.message,
        }
      }

      if (!session?.user) {
        console.error('❌ No session or user found')
        return {
          success: false,
          error: 'User not authenticated. Please login again.',
        }
      }

      console.log('✅ User authenticated:', session.user.id)

      // Insert schedules - untuk recurring, hanya 1 entry dengan flag recurrence
      const allSchedules: any[] = []

      for (const schedule of schedules) {
        // CRITICAL: Gunakan schedule.date (detected/edited date), BUKAN tanggal hari ini
        console.log(`📅 Saving schedule "${schedule.title}" with date:`, {
          originalDate: schedule.date,
          recurrenceStartDate: schedule.recurrenceStartDate,
          isRecurring: schedule.isRecurring
        })
        
        // Validasi dan normalisasi tanggal - GUNAKAN schedule.date yang asli
        let scheduleDate = schedule.date
        if (!scheduleDate) {
          console.warn(`⚠️ Schedule "${schedule.title}" has no date, using today as fallback`)
          scheduleDate = new Date().toISOString().split('T')[0]
        }
        
        if (schedule.isRecurring && schedule.recurrencePattern && schedule.recurrencePattern !== 'none') {
          // Untuk jadwal berulang, hanya insert 1 entry dengan flag recurrence
          // CRITICAL: date field harus menggunakan schedule.date (tanggal yang terdeteksi/diedit)
          // recurrence_start_date bisa berbeda (untuk menentukan kapan recurrence mulai)
          const recurrenceStart = schedule.recurrenceStartDate || scheduleDate
          const endDate = schedule.recurrenceEndDate || (() => {
            // Default: 3 bulan dari tanggal mulai recurrence
            const end = new Date(recurrenceStart)
            end.setMonth(end.getMonth() + 3)
            return formatLocalDate(end)
          })()
          
          console.log('🔄 Inserting recurring schedule (single entry):', schedule.title)
          console.log('📅 Recurrence dates:', { 
            scheduleDate: scheduleDate, // Tanggal yang akan disimpan di field 'date' (detected/edited)
            recurrenceStartDate: recurrenceStart, // Tanggal mulai recurrence
            recurrenceEndDate: endDate, 
            pattern: schedule.recurrencePattern 
          })
          
          allSchedules.push({
            title: schedule.title,
            location: schedule.location || null,
            category: schedule.category || 'academic',
            date: scheduleDate, // GUNAKAN schedule.date (detected/edited date), BUKAN recurrenceStartDate
            time_start: schedule.timeStart,
            time_end: schedule.timeEnd,
            notes: schedule.notes || null,
            is_recurring: true,
            recurrence_pattern: schedule.recurrencePattern,
            recurrence_start_date: recurrenceStart, // Bisa berbeda dari date jika user set manual
            recurrence_end_date: endDate,
            recurrence_days_of_week: schedule.recurrenceDaysOfWeek || null,
            reminder_enabled: schedule.reminderEnabled || false,
            reminder_minutes_before: schedule.reminderMinutesBefore || null,
            user_id: session.user.id,
          })
          console.log('📍 Recurring schedule location:', schedule.location || 'NOT SET')
          console.log('🏷️ Recurring schedule category:', schedule.category || 'NOT SET')
          console.log('✅ Inserted recurring schedule with date:', scheduleDate)
        } else {
          // Single schedule entry (non-recurring)
          // GUNAKAN schedule.date (detected/edited date), BUKAN tanggal hari ini
          allSchedules.push({
            title: schedule.title,
            location: schedule.location || null,
            category: schedule.category || 'academic',
            date: scheduleDate, // GUNAKAN schedule.date (detected/edited date)
            time_start: schedule.timeStart,
            time_end: schedule.timeEnd,
            notes: schedule.notes || null,
            is_recurring: false,
            recurrence_pattern: null,
            recurrence_start_date: null,
            recurrence_end_date: null,
            recurrence_days_of_week: null,
            reminder_enabled: schedule.reminderEnabled || false,
            reminder_minutes_before: schedule.reminderMinutesBefore || null,
            user_id: session.user.id,
          })
          console.log('📍 Single schedule location:', schedule.location || 'NOT SET')
          console.log('🏷️ Single schedule category:', schedule.category || 'NOT SET')
          console.log('📅 Single schedule date (detected):', scheduleDate)
        }
      }

      console.log('📝 Inserting schedules:', allSchedules.length, 'items (1 entry per schedule, recurring schedules will repeat automatically)')
      if (allSchedules.length > 0) {
        console.log('📝 First schedule sample:', allSchedules[0])
      }

      const { data, error } = await supabase
        .from('schedules')
        .insert(allSchedules)
        .select()

      if (error) {
        console.error('❌ Insert error:', error)
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        return {
          success: false,
          error: error.message || 'Failed to save schedules',
        }
      }

      console.log('✅ Schedules inserted successfully:', data?.length || 0, 'items')

      // Map snake_case from database back to camelCase for frontend
      const mappedSchedules: Schedule[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        location: item.location,
        date: item.date,
        timeStart: item.time_start,
        timeEnd: item.time_end,
        notes: item.notes || undefined,
        isRecurring: item.is_recurring || false,
        recurrencePattern: item.recurrence_pattern || undefined,
        recurrenceStartDate: item.recurrence_start_date || undefined,
        recurrenceEndDate: item.recurrence_end_date || undefined,
        recurrenceDaysOfWeek: item.recurrence_days_of_week || undefined,
        user_id: item.user_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }))

      return {
        success: true,
        schedules: mappedSchedules,
      }
    } catch (error: any) {
      console.error('❌ Unexpected error:', error)
      return {
        success: false,
        error: error.message || 'Unexpected error occurred',
      }
    }
  },

  /**
   * Helper function untuk generate recurring entries
   */
  generateRecurringEntries(schedule: Schedule, userId: string): any[] {
    const entries: any[] = []
    
    if (!schedule.recurrenceStartDate || !schedule.recurrenceEndDate || !schedule.recurrencePattern) {
      return entries
    }

    const startDate = new Date(schedule.recurrenceStartDate)
    const endDate = new Date(schedule.recurrenceEndDate)
    const currentDate = new Date(startDate)

    // Set time to start of day untuk perbandingan
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    currentDate.setHours(0, 0, 0, 0)

    while (currentDate <= endDate) {
      let shouldInclude = false

      if (schedule.recurrencePattern === 'daily') {
        shouldInclude = true
      } else if (schedule.recurrencePattern === 'weekly') {
        const dayOfWeek = currentDate.getDay()
        shouldInclude = schedule.recurrenceDaysOfWeek?.includes(dayOfWeek) || false
      } else if (schedule.recurrencePattern === 'monthly') {
        // Same day of month
        shouldInclude = currentDate.getDate() === startDate.getDate()
      }

      if (shouldInclude) {
        entries.push({
          title: schedule.title,
          location: schedule.location,
          date: currentDate.toISOString().split('T')[0],
          time_start: schedule.timeStart,
          time_end: schedule.timeEnd,
          notes: schedule.notes || null,
          is_recurring: true,
          recurrence_pattern: schedule.recurrencePattern,
          recurrence_start_date: schedule.recurrenceStartDate,
          recurrence_end_date: schedule.recurrenceEndDate,
          recurrence_days_of_week: schedule.recurrenceDaysOfWeek || null,
          user_id: userId,
        })
      }

      // Move to next occurrence
      if (schedule.recurrencePattern === 'daily') {
        currentDate.setDate(currentDate.getDate() + 1)
      } else if (schedule.recurrencePattern === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7)
      } else if (schedule.recurrencePattern === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1)
        // Handle edge case: jika tanggal tidak ada di bulan berikutnya (e.g., 31 Jan -> 28 Feb)
        if (currentDate.getDate() !== startDate.getDate()) {
          currentDate.setDate(0) // Set ke hari terakhir bulan sebelumnya
        }
      }
    }

    return entries
  },
}

