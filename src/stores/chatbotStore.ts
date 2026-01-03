import { create } from 'zustand'
import { ChatMessage, ParsedSchedule } from '../types/chatbot'

interface ChatbotState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  previewSchedules: ParsedSchedule[]
  editingScheduleIndex: number | null
  
  // Actions
  addMessage: (message: ChatMessage) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addPreviewSchedules: (schedules: ParsedSchedule[]) => void
  updatePreviewSchedule: (index: number, schedule: ParsedSchedule) => void
  removePreviewSchedule: (index: number) => void
  setEditingScheduleIndex: (index: number | null) => void
  clearChat: () => void
}

export const useChatbotStore = create<ChatbotState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  previewSchedules: [],
  editingScheduleIndex: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),

  addPreviewSchedules: (schedules) =>
    set((state) => ({
      previewSchedules: [...state.previewSchedules, ...schedules],
    })),

  updatePreviewSchedule: (index, schedule) =>
    set((state) => {
      const newSchedules = [...state.previewSchedules]
      newSchedules[index] = schedule
      return { previewSchedules: newSchedules }
    }),

  removePreviewSchedule: (index) =>
    set((state) => ({
      previewSchedules: state.previewSchedules.filter((_, i) => i !== index),
    })),

  setEditingScheduleIndex: (index) =>
    set({ editingScheduleIndex: index }),

  clearChat: () =>
    set({
      messages: [],
      previewSchedules: [],
      editingScheduleIndex: null,
      error: null,
    }),
}))

