import { Schedule } from '../types/schedule'
import { ProductivityTrendPoint, ProductivityTrendResponse } from '../types/analytics'
import { supabase } from '../lib/supabase'

// Helper untuk map database (snake_case) ke frontend (camelCase)
const mapScheduleFromDB = (item: any): Schedule => ({
  id: item.id,
  title: item.title,
  location: item.location,
  date: item.date,
  timeStart: item.time_start,
  timeEnd: item.time_end,
  notes: item.notes || undefined,
  category: item.category || undefined,
  isRecurring: item.is_recurring || false,
  recurrencePattern: item.recurrence_pattern || undefined,
  recurrenceStartDate: item.recurrence_start_date || undefined,
  recurrenceEndDate: item.recurrence_end_date || undefined,
  recurrenceDaysOfWeek: item.recurrence_days_of_week || undefined,
  reminderEnabled: item.reminder_enabled || false,
  reminderMinutesBefore: item.reminder_minutes_before || undefined,
  user_id: item.user_id,
  created_at: item.created_at,
  updated_at: item.updated_at,
})

// Helper untuk map frontend (camelCase) ke database (snake_case)
const mapScheduleToDB = (schedule: Partial<Schedule>) => ({
  title: schedule.title,
  location: schedule.location,
  date: schedule.date,
  time_start: schedule.timeStart,
  time_end: schedule.timeEnd,
  notes: schedule.notes || null,
  category: schedule.category || null,
  is_recurring: schedule.isRecurring || false,
  recurrence_pattern: schedule.recurrencePattern || null,
  recurrence_start_date: schedule.recurrenceStartDate || null,
  recurrence_end_date: schedule.recurrenceEndDate || null,
  recurrence_days_of_week: schedule.recurrenceDaysOfWeek || null,
  reminder_enabled: schedule.reminderEnabled || false,
  reminder_minutes_before: schedule.reminderMinutesBefore || null,
})

// Helpers
const toMinutes = (time?: string | null) => {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const calculateDurationMinutes = (timeStart?: string | null, timeEnd?: string | null) => {
  if (!timeStart || !timeEnd) return 0
  const start = toMinutes(timeStart)
  const end = toMinutes(timeEnd)
  if (start === end) return 0
  // Handle overnight events by rolling to next day if end < start
  return end > start ? end - start : (24 * 60 - start) + end
}

const formatShortDateLabel = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

const isWithinRange = (dateStr: string, start: Date, end: Date) => {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime()
}

// Expand recurring schedules into concrete occurrences within a range
const expandRecurringSchedules = (
  schedules: Schedule[],
  rangeStart: Date,
  rangeEnd: Date
): Schedule[] => {
  const results: Schedule[] = []
  const startOfRange = new Date(rangeStart)
  startOfRange.setHours(0, 0, 0, 0)
  const endOfRange = new Date(rangeEnd)
  endOfRange.setHours(23, 59, 59, 999)

  schedules.forEach((schedule) => {
    if (!schedule.isRecurring) {
      // Non-recurring: include only if within range
      if (isWithinRange(schedule.date, startOfRange, endOfRange)) {
        results.push(schedule)
      }
      return
    }

    const pattern = schedule.recurrencePattern || 'weekly'
    const recurrenceStart = new Date(schedule.recurrenceStartDate || schedule.date)
    recurrenceStart.setHours(0, 0, 0, 0)
    const recurrenceEnd = schedule.recurrenceEndDate
      ? new Date(schedule.recurrenceEndDate)
      : null
    if (recurrenceEnd) recurrenceEnd.setHours(23, 59, 59, 999)

    const cursor = new Date(startOfRange)
    while (cursor <= endOfRange) {
      const afterStart = cursor.getTime() >= recurrenceStart.getTime()
      const beforeEnd = !recurrenceEnd || cursor.getTime() <= recurrenceEnd.getTime()
      if (!afterStart || !beforeEnd) {
        cursor.setDate(cursor.getDate() + 1)
        continue
      }

      const dayMatches = (() => {
        if (pattern === 'daily') return true
        if (pattern === 'weekly') {
          if (schedule.recurrenceDaysOfWeek?.length) {
            return schedule.recurrenceDaysOfWeek.includes(cursor.getDay())
          }
          // fallback: match day of recurrenceStart
          return cursor.getDay() === recurrenceStart.getDay()
        }
        if (pattern === 'monthly') {
          return cursor.getDate() === recurrenceStart.getDate()
        }
        return false
      })()

      if (dayMatches) {
        const iso = cursor.toISOString().split('T')[0]
        results.push({
          ...schedule,
          date: iso,
          // Add date suffix to avoid duplicate keys for repeated IDs
          id: schedule.id ? `${schedule.id}-${iso}` : undefined,
        })
      }

      cursor.setDate(cursor.getDate() + 1)
    }
  })

  return results.sort((a, b) => {
    const tA = new Date(`${a.date}T${a.timeStart}`).getTime()
    const tB = new Date(`${b.date}T${b.timeStart}`).getTime()
    return tA - tB
  })
}

// API functions - menggunakan Supabase langsung
export const scheduleApi = {
  // Get today's schedules
  getTodaySchedules: async (): Promise<Schedule[]> => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const start = new Date(today)
      const end = new Date(today)
      end.setHours(23, 59, 59, 999)

      const { data: { session } } = await supabase.auth.getSession()
      
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', session?.user?.id || '')
        // Ambil jadwal pada hari ini ATAU jadwal berulang yang aktif
        .or(`date.eq.${today},is_recurring.eq.true`)
        .order('time_start', { ascending: true })

      if (error) {
        console.error('Error fetching today schedules:', error)
        throw error
      }

      const mapped = (data || []).map(mapScheduleFromDB)
      return expandRecurringSchedules(mapped, start, end)
    } catch (error: any) {
      console.error('Error fetching today schedules:', error)
      throw error
    }
  },

  // Productivity trend with 7-day moving average
  getProductivityTrend: async (days = 30): Promise<ProductivityTrendResponse> => {
    const productiveCategories = ['academic', 'work']
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(today.getDate() - (days - 1))

    const startDateStr = start.toISOString().split('T')[0]
    const endDateStr = today.toISOString().split('T')[0]

    try {
      const { data: { session } } = await supabase.auth.getSession()

      let query = supabase
        .from('schedules')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true })
        .order('time_start', { ascending: true })

      if (session?.user?.id) {
        query = query.eq('user_id', session.user.id)
      }

      const { data, error } = await query
      if (error) throw error

      const schedules = (data || []).map(mapScheduleFromDB)

      // Aggregate per day
      const dayMap: Record<string, { productive: number; total: number }> = {}
      schedules.forEach((item) => {
        const duration = calculateDurationMinutes(item.timeStart, item.timeEnd)
        if (!duration) return
        const dateKey = item.date
        const current = dayMap[dateKey] || { productive: 0, total: 0 }
        current.total += duration
        if (item.category && productiveCategories.includes(item.category)) {
          current.productive += duration
        }
        dayMap[dateKey] = current
      })

      // Build contiguous series
      const points: ProductivityTrendPoint[] = []
      const cursor = new Date(start)
      while (cursor <= today) {
        const iso = cursor.toISOString().split('T')[0]
        const stat = dayMap[iso] || { productive: 0, total: 0 }
        const ratio = stat.total > 0 ? (stat.productive / stat.total) * 100 : 0
        points.push({
          date: iso,
          label: formatShortDateLabel(iso),
          productiveMinutes: stat.productive,
          totalMinutes: stat.total,
          ratioPercent: Number(ratio.toFixed(1)),
          movingAvg7: 0,
        })
        cursor.setDate(cursor.getDate() + 1)
      }

      // Compute 7-day moving average (use available days, fallback to zeros)
      const windowSize = 7
      points.forEach((_, idx) => {
        const startIdx = Math.max(0, idx - windowSize + 1)
        const window = points.slice(startIdx, idx + 1)
        const valid = window.filter((p) => p.totalMinutes > 0)
        const source = valid.length > 0 ? valid : window
        const avg =
          source.reduce((sum, p) => sum + p.ratioPercent, 0) /
          (source.length || 1)
        points[idx].movingAvg7 = Number(avg.toFixed(1))
      })

      return {
        points,
        period: {
          start: startDateStr,
          end: endDateStr,
          days,
        },
      }
    } catch (error) {
      console.error('Error fetching productivity trend:', error)
      return {
        points: [],
        period: { start: startDateStr, end: endDateStr, days },
      }
    }
  },

  // Get week's schedules
  getWeekSchedules: async (): Promise<Schedule[]> => {
    try {
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const { data: { session } } = await supabase.auth.getSession()

      const startDateStr = weekStart.toISOString().split('T')[0]
      const endDateStr = weekEnd.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', session?.user?.id || '')
        // Ambil jadwal dalam rentang minggu ini atau semua jadwal berulang
        .or(`and(date.gte.${startDateStr},date.lte.${endDateStr}),is_recurring.eq.true`)
        .order('date', { ascending: true })
        .order('time_start', { ascending: true })

      if (error) {
        console.error('Error fetching week schedules:', error)
        throw error
      }

      const mapped = (data || []).map(mapScheduleFromDB)
      return expandRecurringSchedules(mapped, weekStart, weekEnd)
    } catch (error: any) {
      console.error('Error fetching week schedules:', error)
      throw error
    }
  },

  // Get all schedules with filters (expanded recurring)
  getAllSchedules: async (filters?: {
    isRecurring?: boolean
    date?: string
    sort?: 'nearest' | 'latest'
  }): Promise<Schedule[]> => {
    try {
      // Cek session dulu
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('🔍 getAllSchedules - Session:', {
        userId: session?.user?.id,
        sessionError
      })

      let query = supabase
        .from('schedules')
        .select('*')

      if (session?.user?.id) {
        query = query.eq('user_id', session.user.id)
      }

      if (filters?.isRecurring !== undefined) {
        query = query.eq('is_recurring', filters.isRecurring)
      }

      if (filters?.date) {
        query = query.eq('date', filters.date)
      }

      // Sort
      if (filters?.sort === 'nearest') {
        query = query.order('date', { ascending: true })
          .order('time_start', { ascending: true })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      // TAMBAHKAN LOGGING INI
      console.log('📊 getAllSchedules - Raw data from Supabase:', {
        data,
        error,
        count: data?.length,
        filters,
        firstItem: data?.[0]
      })

      if (error) {
        console.error('❌ Error fetching all schedules:', error)
        throw error
      }

      const mapped = (data || []).map(mapScheduleFromDB)

      // Define expansion window: specific date -> that day; otherwise today + 90 days
      const rangeStart = filters?.date ? new Date(filters.date) : new Date()
      rangeStart.setHours(0, 0, 0, 0)
      const rangeEnd = filters?.date ? new Date(filters.date) : new Date(rangeStart)
      rangeEnd.setDate(rangeEnd.getDate() + 90)
      rangeEnd.setHours(23, 59, 59, 999)

      const expanded = expandRecurringSchedules(mapped, rangeStart, rangeEnd)

      console.log('✅ getAllSchedules - Expanded schedules:', {
        count: expanded.length,
        rangeStart: rangeStart.toISOString().split('T')[0],
        rangeEnd: rangeEnd.toISOString().split('T')[0],
      })

      return expanded
    } catch (error: any) {
      console.error('❌ Error fetching all schedules:', error)
      throw error
    }
  },

  // Get all schedules without expanding recurrence (raw rows)
  getAllSchedulesRaw: async (filters?: {
    isRecurring?: boolean
    date?: string
    sort?: 'nearest' | 'latest'
  }): Promise<Schedule[]> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('🔍 getAllSchedulesRaw - Session:', {
        userId: session?.user?.id,
        sessionError
      })

      let query = supabase
        .from('schedules')
        .select('*')

      if (session?.user?.id) {
        query = query.eq('user_id', session.user.id)
      }

      if (filters?.isRecurring !== undefined) {
        query = query.eq('is_recurring', filters.isRecurring)
      }

      if (filters?.date) {
        query = query.eq('date', filters.date)
      }

      if (filters?.sort === 'nearest') {
        query = query.order('date', { ascending: true }).order('time_start', { ascending: true })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      console.log('📊 getAllSchedulesRaw - Raw data:', {
        data,
        error,
        count: data?.length,
        filters,
        firstItem: data?.[0]
      })

      if (error) {
        console.error('❌ Error fetching all schedules raw:', error)
        throw error
      }

      const mapped = (data || []).map(mapScheduleFromDB)
      return mapped
    } catch (error: any) {
      console.error('❌ Error fetching all schedules raw:', error)
      throw error
    }
  },

  // Get statistics
  getStats: async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today count
      const { count: todayCount } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)

      // Get week count
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const startDateStr = weekStart.toISOString().split('T')[0]
      const endDateStr = weekEnd.toISOString().split('T')[0]

      const { count: weekCount } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })
        .gte('date', startDateStr)
        .lte('date', endDateStr)

      // Get total count
      const { count: totalCount } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })

      // Get recurring count
      const { count: recurringCount } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })
        .eq('is_recurring', true)

      return {
        total: totalCount || 0,
        today: todayCount || 0,
        week: weekCount || 0,
        recurring: recurringCount || 0,
        reminders: 0, // TODO: Implement reminder count
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error)
      return {
        total: 0,
        today: 0,
        week: 0,
        recurring: 0,
        reminders: 0,
      }
    }
  },

  // Create schedule
  createSchedule: async (schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>): Promise<Schedule> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      const scheduleData = {
        ...mapScheduleToDB(schedule),
        user_id: session.user.id,
      }

      const { data, error } = await supabase
        .from('schedules')
        .insert(scheduleData)
        .select()
        .single()

      if (error) {
        console.error('Error creating schedule:', error)
        throw error
      }

      return mapScheduleFromDB(data)
    } catch (error: any) {
      console.error('Error creating schedule:', error)
      throw error
    }
  },

  // Update schedule
  updateSchedule: async (id: string, schedule: Partial<Schedule>): Promise<Schedule> => {
    try {
      const updateData: any = {}
      
      if (schedule.title !== undefined) updateData.title = schedule.title
      if (schedule.location !== undefined) updateData.location = schedule.location
      if (schedule.date !== undefined) updateData.date = schedule.date
      if (schedule.timeStart !== undefined) updateData.time_start = schedule.timeStart
      if (schedule.timeEnd !== undefined) updateData.time_end = schedule.timeEnd
      if (schedule.notes !== undefined) updateData.notes = schedule.notes || null
      if (schedule.isRecurring !== undefined) updateData.is_recurring = schedule.isRecurring
      if (schedule.recurrencePattern !== undefined) updateData.recurrence_pattern = schedule.recurrencePattern || null
      if (schedule.recurrenceStartDate !== undefined) updateData.recurrence_start_date = schedule.recurrenceStartDate || null
      if (schedule.recurrenceEndDate !== undefined) updateData.recurrence_end_date = schedule.recurrenceEndDate || null
      if (schedule.recurrenceDaysOfWeek !== undefined) updateData.recurrence_days_of_week = schedule.recurrenceDaysOfWeek || null
      if (schedule.reminderEnabled !== undefined) updateData.reminder_enabled = schedule.reminderEnabled
      if (schedule.reminderMinutesBefore !== undefined) updateData.reminder_minutes_before = schedule.reminderMinutesBefore || null

      const { data, error } = await supabase
        .from('schedules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating schedule:', error)
        throw error
      }

      return mapScheduleFromDB(data)
    } catch (error: any) {
      console.error('Error updating schedule:', error)
      throw error
    }
  },

  // Delete schedule
  deleteSchedule: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting schedule:', error)
        throw error
      }
    } catch (error: any) {
      console.error('Error deleting schedule:', error)
      throw error
    }
  },

  // Bulk delete schedules
  deleteSchedules: async (ids: string[]): Promise<void> => {
    if (!ids.length) return
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .in('id', ids)

      if (error) {
        console.error('Error bulk deleting schedules:', error)
        throw error
      }
    } catch (error: any) {
      console.error('Error bulk deleting schedules:', error)
      throw error
    }
  },

  // Trigger reminder
  triggerReminder: async (id: string): Promise<void> => {
    // TODO: Implement reminder logic
    console.log('Trigger reminder for schedule:', id)
    // Bisa implement dengan browser notifications atau API call
  },
}
