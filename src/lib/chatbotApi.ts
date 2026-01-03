import { supabase } from './supabase'
import { ParseResponse, ConfirmResponse, ParsedSchedule } from '../types/chatbot'
import { Schedule } from '../types/schedule'

const BASE64_API_URL = import.meta.env.VITE_BASE64_API_URL || ''
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

// Validasi environment variable
if (!BASE64_API_URL && !OPENAI_API_KEY) {
  console.warn('⚠️ VITE_BASE64_API_URL atau VITE_OPENAI_API_KEY belum dikonfigurasi!')
  console.warn('⚠️ Silakan tambahkan salah satu di file .env')
}

// Helper: dapatkan tanggal “hari ini” di timezone Jakarta
const getJakartaToday = () => {
  const jakartaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  jakartaNow.setHours(0, 0, 0, 0)
  return jakartaNow
}

const toISODate = (d: Date) => {
  const year = d.getFullYear()
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getNextDateForDay = (targetDay: number, baseDate: Date) => {
  const delta = (targetDay - baseDate.getDay() + 7) % 7
  const result = new Date(baseDate)
  result.setDate(baseDate.getDate() + delta)
  return result
}

// Helper untuk convert ParsedSchedule ke Schedule format
const convertParsedToSchedule = (parsed: ParsedSchedule): Partial<Schedule> => {
  // Calculate timeEnd if not provided (default 1 hour duration)
  const timeEnd = parsed.timeEnd || (() => {
    const [hours, minutes] = parsed.timeStart.split(':').map(Number)
    const endTime = new Date()
    endTime.setHours(hours + 1, minutes, 0, 0)
    return `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
  })()

  // Convert repeatRule.byDay to recurrenceDaysOfWeek
  let recurrenceDaysOfWeek: number[] | undefined
  if (parsed.repeatRule?.byDay && parsed.repeatType === 'WEEKLY') {
    const dayMap: Record<string, number> = {
      'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6, 'SU': 0
    }
    recurrenceDaysOfWeek = parsed.repeatRule.byDay.map(day => dayMap[day]).filter((d) => d !== undefined) as number[]
  }

  // Tentukan tanggal start untuk weekly agar jatuh ke hari terdekat berikutnya
  let dateStart = parsed.dateStart
  if (parsed.repeatType === 'WEEKLY' && recurrenceDaysOfWeek?.length) {
    const todayJakarta = getJakartaToday()
    const nextDates = recurrenceDaysOfWeek.map((d) => getNextDateForDay(d, todayJakarta))
    // pilih tanggal terdekat (delta paling kecil)
    let chosen = nextDates[0]
    for (const dt of nextDates) {
      if (dt.getTime() < chosen.getTime()) {
        chosen = dt
      }
    }
    dateStart = toISODate(chosen)
  }

  return {
    title: parsed.title,
    // Jika location kosong, gunakan 'TBD' sebagai default untuk menghindari NOT NULL constraint error
    location: parsed.location && parsed.location.trim() !== '' ? parsed.location.trim() : 'TBD',
    date: dateStart,
    timeStart: parsed.timeStart,
    timeEnd: timeEnd,
    notes: parsed.description || undefined,
    isRecurring: parsed.repeatType !== 'NONE',
    recurrencePattern: parsed.repeatType === 'NONE' ? undefined : 
      parsed.repeatType.toLowerCase() as 'daily' | 'weekly' | 'monthly',
    recurrenceStartDate: parsed.repeatType !== 'NONE' ? dateStart : undefined,
    recurrenceEndDate: parsed.repeatType !== 'NONE' ? 
      (parsed.dateEnd || undefined) : undefined,
    recurrenceDaysOfWeek: recurrenceDaysOfWeek,
    reminderEnabled: parsed.earlyReminderMinutes !== undefined && parsed.earlyReminderMinutes > 0,
    reminderMinutesBefore: parsed.earlyReminderMinutes || 30,
  }
}

// Helper function untuk parse dengan OpenAI langsung
const parseWithOpenAI = async (
  message: string,
  timezone: string = 'Asia/Jakarta'
): Promise<ParseResponse> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key belum dikonfigurasi. Silakan set VITE_OPENAI_API_KEY di file .env')
  }

  const SYSTEM_PROMPT = `Kamu adalah parser bahasa natural khusus Bahasa Indonesia yang mengekstrak jadwal/pengingat dari teks ringkas.

Output harus JSON sesuai schema: { 
  "schedules": [
    {
      "title": string, 
      "dateStart": "YYYY-MM-DD", 
      "timeStart": "HH:mm", 
      "dateEnd": null atau "YYYY-MM-DD", 
      "timeEnd": "HH:mm" atau null,
      "timezone": "${timezone}", 
      "repeatType": "NONE" | "DAILY" | "WEEKLY" | "MONTHLY", 
      "repeatRule": { "byDay": ["MO","WE"] } atau null, 
      "earlyReminderMinutes": number (default 30), 
      "location": string atau null, 
      "description": string atau null, 
      "ambiguousFields": [] 
    }
  ]
}

RULES - PENTING:
1. Relative dates dengan konteks hari:
   - "besok" → hari berikutnya dari hari ini
   - "lusa" → 2 hari dari hari ini
   - "hari jumat besok" → jika hari ini Kamis, berarti Jumat (besok). Jika hari ini Jumat, berarti Jumat berikutnya (7 hari lagi)
   - "hari jumat" tanpa "besok" → Jumat terdekat yang akan datang
   - "senin depan" → Senin berikutnya (bukan besok jika besok bukan Senin)

2. Kombinasi relative date + day name (SANGAT PENTING):
   - "hari jumat besok" → prioritaskan "besok", lalu cek apakah besok adalah Jumat. Jika ya, gunakan besok. Jika tidak, gunakan Jumat berikutnya.
   - "besok hari jumat" → sama dengan "hari jumat besok"
   - Contoh: Jika hari ini Kamis → "hari jumat besok" = Jumat (besok, karena besok adalah Jumat)
   - Contoh: Jika hari ini Rabu → "hari jumat besok" = Jumat (2 hari lagi, karena besok adalah Kamis, bukan Jumat)
   - Contoh: Jika hari ini Jumat → "hari jumat besok" = Jumat berikutnya (7 hari lagi)

3. Timezone: Gunakan timezone ${timezone} untuk menghitung tanggal relatif. Tanggal saat ini di timezone ini adalah: ${new Date().toLocaleDateString('id-ID', { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

4. Time: Jika waktu tidak lengkap (e.g., "9"), asumsikan "09:00"

5. JANGAN ubah tanggal yang sudah benar. Jika user bilang "besok", dan kamu sudah menghitung besok dengan benar, jangan tambahkan hari lagi.

6. Jika parsing ambiguous, tambahkan field names ke ambiguousFields array

7. Untuk weekly repeat, gunakan byDay: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]

8. Jika multiple schedules terdeteksi (e.g., "Senin & Rabu"), return multiple items dalam schedules array

9. Output harus pure JSON object dengan "schedules" array, no extra text

CONTOH:
- Input: "ingatkan saya seminar fsd hari jumat besok jam 15.00" (jika hari ini Kamis)
  Output: { "schedules": [{ "title": "seminar fsd", "dateStart": "YYYY-MM-DD" (besok, yang adalah Jumat), "timeStart": "15:00", ... }] }

- Input: "ingatkan saya meeting besok jam 10.00" (jika hari ini Kamis)
  Output: { "schedules": [{ "title": "meeting", "dateStart": "YYYY-MM-DD" (Jumat, besok), "timeStart": "10:00", ... }] }`

  try {
    // Get current date in Jakarta timezone for context
    const now = new Date()
    const jakartaNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const todayStr = jakartaNow.toLocaleDateString('id-ID', { 
      timeZone: timezone, 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const todayISO = jakartaNow.toISOString().split('T')[0]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Hari ini adalah ${todayStr} (${todayISO}). Parse pesan ini: "${message}"` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'OpenAI API error' }))
      throw new Error(errorData.error?.message || 'Gagal memproses dengan OpenAI')
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    if (!content) {
      throw new Error('Tidak ada response dari OpenAI')
    }

    const parsed = JSON.parse(content)
    
    // Handle both single schedule and array
    let schedules = parsed.schedules || []
    if (!Array.isArray(schedules)) {
      schedules = [schedules]
    }
    
    // Validate dates - JANGAN ubah tanggal yang sudah di-parse oleh AI
    // AI sudah menghitung relative dates dengan benar berdasarkan konteks
    // Reuse jakartaNow yang sudah dihitung di atas
    const jakartaTime = jakartaNow
    
    const processedSchedules: ParsedSchedule[] = schedules.map((schedule: any) => {
      // Ensure all required fields
      if (!schedule.dateStart || !schedule.timeStart) {
        throw new Error('Schedule tidak lengkap: missing dateStart atau timeStart')
      }

      // Validasi tanggal - hanya log warning jika terlalu jauh di masa lalu (kemungkinan parsing error)
      const scheduleDate = new Date(`${schedule.dateStart}T${schedule.timeStart}`)
      const oneYearAgo = new Date(jakartaTime)
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      // Hanya log warning jika tanggal lebih dari 1 tahun di masa lalu (kemungkinan parsing error)
      // JANGAN ubah tanggal, biarkan AI parsing yang benar
      if (scheduleDate < oneYearAgo && schedule.repeatType === 'NONE') {
        console.warn('⚠️ Tanggal terlalu jauh di masa lalu, kemungkinan parsing error:', {
          dateStart: schedule.dateStart,
          timeStart: schedule.timeStart,
          rawNlText: message,
        })
        // Jangan ubah, biarkan user edit manual jika salah
      }
      
      // Set defaults
      return {
        title: schedule.title || 'Jadwal',
        dateStart: schedule.dateStart,
        timeStart: schedule.timeStart,
        dateEnd: schedule.dateEnd || null,
        timeEnd: schedule.timeEnd || null,
        timezone: schedule.timezone || timezone,
        repeatType: schedule.repeatType || 'NONE',
        repeatRule: schedule.repeatRule || null,
        earlyReminderMinutes: schedule.earlyReminderMinutes || 30,
        location: schedule.location || null,
        description: schedule.description || null,
        ambiguousFields: schedule.ambiguousFields || [],
        rawNlText: message,
      }
    })

    // Check for clarification needed
    const needsClarification = processedSchedules.some((s: ParsedSchedule) => s.ambiguousFields?.length > 0)
    const clarificationQuestion = needsClarification 
      ? 'Apakah maksud Anda jam 9 pagi atau 9 malam?'
      : undefined

    return {
      success: true,
      schedules: processedSchedules,
      clarificationQuestion,
    }
  } catch (error: any) {
    console.error('Error parsing with OpenAI:', error)
    throw error
  }
}

export const chatbotApi = {
  // Parse natural language message
  parseMessage: async (
    message: string,
    timezone: string = 'Asia/Jakarta'
  ): Promise<ParseResponse> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      // Try backend first if configured and not Supabase URL
      if (BASE64_API_URL && !BASE64_API_URL.includes('supabase.co')) {
        try {
          const response = await fetch(`${BASE64_API_URL}/chatbot/parse`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              userId: session.user.id,
              message,
              timezone,
            }),
          })

          if (response.ok) {
            const data: ParseResponse = await response.json()
            return data
          }
        } catch (backendError) {
          console.warn('Backend tidak tersedia, menggunakan OpenAI langsung:', backendError)
          // Fallback to OpenAI
        }
      }

      // Fallback: Use OpenAI directly
      if (OPENAI_API_KEY) {
        return await parseWithOpenAI(message, timezone)
      }

      throw new Error('Backend API URL belum dikonfigurasi dan OpenAI API key juga tidak tersedia. Silakan set VITE_BASE64_API_URL atau VITE_OPENAI_API_KEY di file .env')
    } catch (error: any) {
      console.error('Error parsing message:', error)
      
      // Handle different error types
      let errorMessage = 'Gagal memproses pesan'
      
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        if (OPENAI_API_KEY) {
          // Try OpenAI as fallback
          try {
            return await parseWithOpenAI(message, timezone)
          } catch (openaiError: any) {
            errorMessage = 'Tidak dapat terhubung ke server. Pastikan VITE_OPENAI_API_KEY sudah dikonfigurasi dengan benar di file .env'
          }
        } else {
          errorMessage = 'Tidak dapat terhubung ke server. Pastikan backend API sudah dikonfigurasi (VITE_BASE64_API_URL) atau OpenAI API key (VITE_OPENAI_API_KEY) di file .env'
        }
      } else if (error.message?.includes('belum dikonfigurasi')) {
        errorMessage = error.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        schedules: [],
        error: errorMessage,
      }
    }
  },

  // Confirm and save schedules
  confirmSchedules: async (
    schedules: ParsedSchedule[]
  ): Promise<ConfirmResponse> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      if (!BASE64_API_URL) {
        throw new Error('Backend API URL belum dikonfigurasi. Silakan set VITE_BASE64_API_URL di file .env')
      }

      // Convert ParsedSchedule to Schedule format
      const scheduleData = schedules.map(convertParsedToSchedule)

      // Save to database using existing scheduleApi
      const { scheduleApi } = await import('../services/api')
      const savedSchedules: Schedule[] = []

      for (const schedule of scheduleData) {
        const saved = await scheduleApi.createSchedule(schedule as Omit<Schedule, 'id' | 'created_at' | 'updated_at'>)
        savedSchedules.push(saved)
      }

      // Call backend to create reminders (optional, skip if backend not available)
      if (BASE64_API_URL && !BASE64_API_URL.includes('supabase.co')) {
        try {
          await fetch(`${BASE64_API_URL}/chatbot/confirm`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              userId: session.user.id,
              schedules: savedSchedules.map(s => ({
                id: s.id,
                reminderEnabled: s.reminderEnabled,
                reminderMinutesBefore: s.reminderMinutesBefore,
              })),
            }),
          })
        } catch (error) {
          console.warn('Failed to call backend confirm endpoint, continuing without it:', error)
          // Continue anyway, reminders will be handled by reminderScheduler
        }
      }

      return {
        success: true,
        schedules: savedSchedules,
      }
    } catch (error: any) {
      console.error('Error confirming schedules:', error)
      
      // Handle different error types
      let errorMessage = 'Gagal menyimpan jadwal'
      
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        errorMessage = 'Tidak dapat terhubung ke server. Pastikan backend API sudah dikonfigurasi dengan benar dan server sedang berjalan.'
      } else if (error.message?.includes('belum dikonfigurasi')) {
        errorMessage = error.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  },

  // Get chat history
  getHistory: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      if (!BASE64_API_URL) {
        console.warn('Backend API URL belum dikonfigurasi, skip history fetch')
        return []
      }

      const response = await fetch(`${BASE64_API_URL}/chatbot/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error fetching history:', error)
      return []
    }
  },
}

