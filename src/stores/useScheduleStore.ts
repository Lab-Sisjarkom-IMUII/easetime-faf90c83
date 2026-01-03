import { create } from 'zustand'
import { Schedule } from '../types/schedule'

interface ScheduleStats {
  total: number
  today: number
  week: number
  recurring: number
  reminders: number
}

interface ScheduleState {
  schedules: Schedule[]
  todaySchedules: Schedule[]
  weekSchedules: Schedule[]
  stats: ScheduleStats | null
  loading: boolean
  error: string | null
  
  // Actions
  setSchedules: (schedules: Schedule[]) => void
  setTodaySchedules: (schedules: Schedule[]) => void
  setWeekSchedules: (schedules: Schedule[]) => void
  setStats: (stats: ScheduleStats) => void
  addSchedule: (schedule: Schedule) => void
  updateSchedule: (id: string, schedule: Partial<Schedule>) => void
  deleteSchedule: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  schedules: [],
  todaySchedules: [],
  weekSchedules: [],
  stats: null,
  loading: false,
  error: null,

  setSchedules: (schedules) => set({ schedules }),
  setTodaySchedules: (schedules) => set({ todaySchedules: schedules }),
  setWeekSchedules: (schedules) => set({ weekSchedules: schedules }),
  setStats: (stats) => set({ stats }),
  addSchedule: (schedule) =>
    set((state) => ({
      schedules: [...state.schedules, schedule],
    })),
  updateSchedule: (id, updates) =>
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      todaySchedules: state.todaySchedules.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      weekSchedules: state.weekSchedules.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  deleteSchedule: (id) =>
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id),
      todaySchedules: state.todaySchedules.filter((s) => s.id !== id),
      weekSchedules: state.weekSchedules.filter((s) => s.id !== id),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}))

