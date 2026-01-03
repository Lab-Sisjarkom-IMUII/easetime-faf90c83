import { supabase } from './supabase'
import {
  Recommendation,
  GenerateRecommendationsRequest,
  GenerateRecommendationsResponse,
  ConfirmRecommendationRequest,
  ConfirmRecommendationResponse,
  RecommendationEdits,
} from '../types/recommendation'
import { Schedule } from '../types/schedule'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

// Helper untuk convert Recommendation ke Schedule format
const convertRecommendationToSchedule = (
  recommendation: Recommendation,
  edits?: RecommendationEdits
): Partial<Schedule> => {
  const rec = { ...recommendation, ...edits }
  
  // Parse suggestedStart to date and timeStart without shifting timezone
  const startIso = rec.suggestedStart
  const datePart = startIso.split('T')[0]
  const timePart = startIso.split('T')[1]?.slice(0, 5) || '09:00'
  const date = datePart
  const timeStart = timePart
  
  // Parse suggestedEnd to timeEnd without shifting timezone
  let timeEnd: string | undefined
  if (rec.suggestedEnd) {
    const endIso = rec.suggestedEnd
    timeEnd = endIso.split('T')[1]?.slice(0, 5)
  } else {
    // Default 1 hour duration
    const [h, m] = timeStart.split(':').map(Number)
    const endHour = ((h || 0) + 1).toString().padStart(2, '0')
    const endMin = (m || 0).toString().padStart(2, '0')
    timeEnd = `${endHour}:${endMin}`
  }

  // Convert recurrence
  const isRecurring = rec.recurrence !== 'NONE'
  const recurrencePattern = isRecurring
    ? (rec.recurrence.toLowerCase() as 'daily' | 'weekly' | 'monthly')
    : undefined

  // Parse recurrence days from metadata if available
  let recurrenceDaysOfWeek: number[] | undefined
  if (rec.recurrence === 'WEEKLY' && rec.metadata?.daysOfWeek) {
    const dayMap: Record<string, number> = {
      'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6, 'SU': 0,
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0,
    }
    recurrenceDaysOfWeek = rec.metadata.daysOfWeek
      .map((day: string) => dayMap[day] ?? 1)
      .filter((day: number) => day !== undefined)
  }

  return {
    title: rec.title,
    location: rec.description || 'TBD',
    date,
    timeStart,
    timeEnd,
    notes: rec.description || undefined,
    category: rec.category,
    isRecurring,
    recurrencePattern,
    recurrenceStartDate: isRecurring ? date : undefined,
    recurrenceEndDate: isRecurring ? (rec.metadata?.recurrenceEndDate || undefined) : undefined,
    recurrenceDaysOfWeek,
    reminderEnabled: rec.remindBefore !== undefined && rec.remindBefore !== null && rec.remindBefore > 0,
    reminderMinutesBefore: rec.remindBefore || 30,
  }
}

// Helper: Check schedule conflict
const checkScheduleConflict = async (
  recommendation: Recommendation,
  edits?: RecommendationEdits
): Promise<ConfirmRecommendationResponse['conflict'] | null> => {
  try {
    const rec = { ...recommendation, ...edits }
    const start = new Date(rec.suggestedStart)
    const end = rec.suggestedEnd ? new Date(rec.suggestedEnd) : new Date(start.getTime() + 60 * 60 * 1000)

    // Get user's existing schedules
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: schedules } = await supabase
      .from('schedules')
      .select('id, date, time_start, time_end')
      .eq('user_id', user.id)

    if (!schedules) return null

    // Check for overlap
    for (const schedule of schedules) {
      const scheduleDate = new Date(schedule.date)
      const scheduleStart = new Date(`${schedule.date}T${schedule.time_start}`)
      const scheduleEnd = new Date(`${schedule.date}T${schedule.time_end}`)

      // Check if same date and overlapping time
      if (
        start.toDateString() === scheduleDate.toDateString() &&
        ((start >= scheduleStart && start < scheduleEnd) ||
         (end > scheduleStart && end <= scheduleEnd) ||
         (start <= scheduleStart && end >= scheduleEnd))
      ) {
        return {
          existingEventId: schedule.id,
          overlapWindow: {
            start: scheduleStart.toISOString(),
            end: scheduleEnd.toISOString(),
          },
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error checking conflict:', error)
    return null
  }
}

// Generate recommendations menggunakan OpenAI
export const generateRecommendations = async (
  request: GenerateRecommendationsRequest
): Promise<GenerateRecommendationsResponse> => {
  if (!OPENAI_API_KEY) {
    return {
      success: false,
      error: 'OpenAI API key belum dikonfigurasi. Silakan set VITE_OPENAI_API_KEY di file .env',
    }
  }

  try {
    const now = new Date()
    const jakartaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const todayStr = jakartaNow.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const todayISO = jakartaNow.toISOString()

    const SYSTEM_PROMPT = `You are an AI assistant that generates structured schedule suggestions based on a user's calendar, preferences, and uploaded schedule scans. Output MUST be valid JSON object with a "suggestions" array, following the exact schema in 'required_output' and without extra commentary.`

    const userPreferences = request.context.preferences || {
      workingHours: { start: '08:00', end: '18:00' },
      busyDays: [],
      preferredDays: [],
      minGapMinutes: 30,
      maxDailyNewEvents: 3,
    }

    const USER_PROMPT = `Context:
- Timezone: Asia/Jakarta
- Current date/time: ${todayStr} (${todayISO})
- User preferences:
  ${JSON.stringify(userPreferences, null, 2)}
- Existing events (up to 30 recent/upcoming):
  ${JSON.stringify(request.context.events.slice(0, 30), null, 2)}
- Trigger: ${request.trigger}
- Goal: Recommend 3-5 suggested new events that fit user's schedule, avoid overlaps, suggest recurrence if pattern detected.

Required_output (JSON object with "suggestions" array). Each suggestion object MUST include:
{
  "suggestions": [
    {
      "title": string,
      "description": string|null,
      "suggestedStart": "YYYY-MM-DDTHH:MM:SS+07:00" (ISO 8601 with timezone),
      "suggestedEnd": "YYYY-MM-DDTHH:MM:SS+07:00" (ISO 8601 with timezone),
      "category": "academic"|"event"|"personal"|"work"|"other",
      "recurrence": "NONE"|"DAILY"|"WEEKLY"|"MONTHLY",
      "remindBeforeMinutes": integer|null,
      "reason": string,
      "metadata": {
        "daysOfWeek": ["MO","WE"] (if WEEKLY recurrence with multiple days),
        "recurrenceEndDate": "YYYY-MM-DD" (optional),
        "source_scan_reference_ids": [] (optional)
      }
    }
  ]
}

Constraints:
- Do NOT output fields other than above.
- Ensure suggestedStart is in the future relative to 'now' (${todayISO}).
- Avoid overlapping existing events (respect minGapMinutes: ${userPreferences.minGapMinutes}).
- If pattern suggests two occurrences per week (e.g., Mon & Wed), generate suggestion for both occurrences as a single recurring event (WEEKLY) with daysOfWeek in metadata OR separate suggestions if times differ.
- Make at most 5 suggestions by default unless user preference overrides.
- Do NOT include "confidence" field.
- Output pure JSON object only, no extra text.`

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
          { role: 'user', content: USER_PROMPT },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'OpenAI API error' }))
      throw new Error(errorData.error?.message || 'Gagal memanggil OpenAI API')
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('Tidak ada response dari OpenAI')
    }

    // Parse JSON response
    let parsed: any
    try {
      parsed = JSON.parse(content)
      // Extract suggestions array
      const suggestions = parsed.suggestions || parsed.recommendations || (Array.isArray(parsed) ? parsed : [parsed])
      if (!Array.isArray(suggestions)) {
        throw new Error('Format response tidak valid: suggestions harus array')
      }
      parsed = suggestions
    } catch (e) {
      // If parsing fails, try to extract JSON array from text
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Format response tidak valid')
      }
    }

    // Convert to Recommendation format and save to database
    const recommendations: Recommendation[] = []
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User tidak terautentikasi')
    }

    for (const suggestion of parsed) {
      const recommendation: Omit<Recommendation, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.id,
        title: suggestion.title,
        description: suggestion.description || null,
        suggestedStart: suggestion.suggestedStart,
        suggestedEnd: suggestion.suggestedEnd || null,
        category: suggestion.category || 'other',
        recurrence: suggestion.recurrence || 'NONE',
        remindBefore: suggestion.remindBeforeMinutes || null,
        source: request.trigger === 'manual' ? 'MANUAL' : 
                request.trigger === 'upload' ? 'AI_SCAN' :
                request.trigger === 'chatbot' ? 'AI_CHATBOT' : 'SYSTEM',
        metadata: {
          ...suggestion.metadata,
          reason: suggestion.reason, // Store reason internally, don't show to user
        },
        status: 'PENDING',
      }

      const { data: inserted, error } = await supabase
        .from('recommendations')
        .insert({
          user_id: recommendation.userId,
          title: recommendation.title,
          description: recommendation.description,
          suggested_start: recommendation.suggestedStart,
          suggested_end: recommendation.suggestedEnd,
          category: recommendation.category,
          recurrence: recommendation.recurrence,
          remind_before: recommendation.remindBefore,
          source: recommendation.source,
          metadata: recommendation.metadata,
          status: recommendation.status,
        })
        .select()
        .single()

      if (error) {
        console.error('Error inserting recommendation:', error)
        continue
      }

      if (inserted) {
        // Map database fields to Recommendation interface
        recommendations.push({
          id: inserted.id,
          userId: inserted.user_id,
          title: inserted.title,
          description: inserted.description,
          suggestedStart: inserted.suggested_start,
          suggestedEnd: inserted.suggested_end,
          category: inserted.category,
          recurrence: inserted.recurrence,
          remindBefore: inserted.remind_before,
          source: inserted.source,
          metadata: inserted.metadata,
          status: inserted.status,
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
        } as Recommendation)
      }
    }

    return {
      success: true,
      recommendations,
    }
  } catch (error: any) {
    console.error('Error generating recommendations:', error)
    return {
      success: false,
      error: error.message || 'Gagal menghasilkan rekomendasi',
    }
  }
}

// Get recommendations
export const getRecommendations = async (
  userId: string,
  status: 'PENDING' | 'SAVED' | 'DISMISSED' | 'ALL' = 'PENDING'
): Promise<Recommendation[]> => {
  try {
    let query = supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', userId)
      .order('suggested_start', { ascending: true })

    if (status !== 'ALL') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    // Map database fields to Recommendation interface
    return (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      title: item.title,
      description: item.description,
      suggestedStart: item.suggested_start,
      suggestedEnd: item.suggested_end,
      category: item.category,
      recurrence: item.recurrence,
      remindBefore: item.remind_before,
      source: item.source,
      metadata: item.metadata,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })) as Recommendation[]
  } catch (error: any) {
    console.error('Error fetching recommendations:', error)
    throw error
  }
}

// Update recommendation (for inline editing)
export const updateRecommendation = async (
  id: string,
  edits: RecommendationEdits
): Promise<Recommendation> => {
  try {
    const updates: any = {}
    if (edits.title !== undefined) updates.title = edits.title
    if (edits.suggestedStart !== undefined) updates.suggested_start = edits.suggestedStart
    if (edits.suggestedEnd !== undefined) updates.suggested_end = edits.suggestedEnd
    if (edits.category !== undefined) updates.category = edits.category
    if (edits.recurrence !== undefined) updates.recurrence = edits.recurrence
    if (edits.remindBefore !== undefined) updates.remind_before = edits.remindBefore
    if (edits.description !== undefined) updates.description = edits.description

    const { data, error } = await supabase
      .from('recommendations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Map database fields to Recommendation interface
    const item = data as any
    return {
      id: item.id,
      userId: item.user_id,
      title: item.title,
      description: item.description,
      suggestedStart: item.suggested_start,
      suggestedEnd: item.suggested_end,
      category: item.category,
      recurrence: item.recurrence,
      remindBefore: item.remind_before,
      source: item.source,
      metadata: item.metadata,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    } as Recommendation
  } catch (error: any) {
    console.error('Error updating recommendation:', error)
    throw error
  }
}

// Confirm recommendation (convert to schedule)
export const confirmRecommendation = async (
  id: string,
  request: ConfirmRecommendationRequest = {}
): Promise<ConfirmRecommendationResponse> => {
  try {
    // Get recommendation
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', id)
      .single()

    if (recError || !recommendation) {
      throw new Error('Rekomendasi tidak ditemukan')
    }

    // Map database fields to Recommendation interface
    const rec: Recommendation = {
      id: recommendation.id,
      userId: recommendation.user_id,
      title: recommendation.title,
      description: recommendation.description,
      suggestedStart: recommendation.suggested_start,
      suggestedEnd: recommendation.suggested_end,
      category: recommendation.category,
      recurrence: recommendation.recurrence,
      remindBefore: recommendation.remind_before,
      source: recommendation.source,
      metadata: recommendation.metadata,
      status: recommendation.status,
      createdAt: recommendation.created_at,
      updatedAt: recommendation.updated_at,
    }

    // Check for conflicts if not overriding
    if (!request.overrideConflict) {
      const conflict = await checkScheduleConflict(rec, request.edits)
      if (conflict) {
        return {
          success: false,
          error: 'Jadwal bertabrakan dengan jadwal yang sudah ada',
          conflict,
        }
      }
    }

    // Convert to schedule
    const scheduleData = convertRecommendationToSchedule(rec, request.edits)

    // Save to schedules table
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User tidak terautentikasi')
    }

    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        user_id: user.id,
        title: scheduleData.title,
        location: scheduleData.location || 'TBD',
        date: scheduleData.date,
        time_start: scheduleData.timeStart,
        time_end: scheduleData.timeEnd,
        notes: scheduleData.notes,
        category: scheduleData.category,
        is_recurring: scheduleData.isRecurring || false,
        recurrence_pattern: scheduleData.recurrencePattern,
        recurrence_start_date: scheduleData.recurrenceStartDate,
        recurrence_end_date: scheduleData.recurrenceEndDate,
        recurrence_days_of_week: scheduleData.recurrenceDaysOfWeek,
        reminder_enabled: scheduleData.reminderEnabled || false,
        reminder_minutes_before: scheduleData.reminderMinutesBefore || 30,
      })
      .select()
      .single()

    if (scheduleError) {
      throw scheduleError
    }

    // Update recommendation status to SAVED
    await supabase
      .from('recommendations')
      .update({ status: 'SAVED' })
      .eq('id', id)

    return {
      success: true,
      scheduleId: schedule.id,
    }
  } catch (error: any) {
    console.error('Error confirming recommendation:', error)
    return {
      success: false,
      error: error.message || 'Gagal menyimpan jadwal',
    }
  }
}

// Dismiss recommendation
export const dismissRecommendation = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('recommendations')
      .update({ status: 'DISMISSED' })
      .eq('id', id)

    if (error) throw error
  } catch (error: any) {
    console.error('Error dismissing recommendation:', error)
    throw error
  }
}

// Export API object
export const recommendationApi = {
  generateRecommendations,
  getRecommendations,
  updateRecommendation,
  confirmRecommendation,
  dismissRecommendation,
}


