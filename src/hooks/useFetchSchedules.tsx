import { useCallback } from 'react'
import { useScheduleStore } from '../stores/useScheduleStore'
import { scheduleApi } from '../services/api'

export const useFetchSchedules = () => {
  const {
    setTodaySchedules,
    setWeekSchedules,
    setSchedules,
    setStats,
    setLoading,
    setError,
  } = useScheduleStore()

  const fetchToday = useCallback(async () => {
    try {
      setLoading(true)
      const schedules = await scheduleApi.getTodaySchedules()
      setTodaySchedules(schedules)
    } catch (error: any) {
      setError(error.message || 'Failed to fetch today schedules')
    } finally {
      setLoading(false)
    }
  }, [setTodaySchedules, setLoading, setError])

  const fetchWeek = useCallback(async () => {
    try {
      setLoading(true)
      const schedules = await scheduleApi.getWeekSchedules()
      setWeekSchedules(schedules)
    } catch (error: any) {
      setError(error.message || 'Failed to fetch week schedules')
    } finally {
      setLoading(false)
    }
  }, [setWeekSchedules, setLoading, setError])

  const fetchAll = useCallback(async (filters?: {
    isRecurring?: boolean
    date?: string
    sort?: 'nearest' | 'latest'
  }) => {
    try {
      setLoading(true)
      console.log('🔄 useFetchSchedules - Fetching all schedules with filters:', filters)
      const schedules = await scheduleApi.getAllSchedules(filters)
      console.log('✅ useFetchSchedules - Received schedules:', {
        count: schedules.length,
        schedules
      })
      setSchedules(schedules)
      console.log('✅ useFetchSchedules - Schedules set to store')
    } catch (error: any) {
      console.error('❌ useFetchSchedules - Error:', error)
      setError(error.message || 'Failed to fetch schedules')
    } finally {
      setLoading(false)
    }
  }, [setSchedules, setLoading, setError])

  const fetchStats = useCallback(async () => {
    try {
      const stats = await scheduleApi.getStats()
      setStats(stats)
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
    }
  }, [setStats])

  return {
    fetchToday,
    fetchWeek,
    fetchAll,
    fetchStats,
  }
}

