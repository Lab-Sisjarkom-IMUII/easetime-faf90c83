import { create } from 'zustand'
import { Recommendation } from '../types/recommendation'

interface RecommendationState {
  recommendations: Recommendation[]
  isLoading: boolean
  isGenerating: boolean
  error: string | null
  
  // Actions
  setRecommendations: (recommendations: Recommendation[]) => void
  addRecommendation: (recommendation: Recommendation) => void
  updateRecommendation: (id: string, updates: Partial<Recommendation>) => void
  removeRecommendation: (id: string) => void
  setLoading: (loading: boolean) => void
  setGenerating: (generating: boolean) => void
  setError: (error: string | null) => void
  clearRecommendations: () => void
}

export const useRecommendationStore = create<RecommendationState>((set) => ({
  recommendations: [],
  isLoading: false,
  isGenerating: false,
  error: null,

  setRecommendations: (recommendations) =>
    set({ recommendations }),

  addRecommendation: (recommendation) =>
    set((state) => ({
      recommendations: [...state.recommendations, recommendation],
    })),

  updateRecommendation: (id, updates) =>
    set((state) => ({
      recommendations: state.recommendations.map((rec) =>
        rec.id === id ? { ...rec, ...updates } : rec
      ),
    })),

  removeRecommendation: (id) =>
    set((state) => ({
      recommendations: state.recommendations.filter((rec) => rec.id !== id),
    })),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setGenerating: (generating) =>
    set({ isGenerating: generating }),

  setError: (error) =>
    set({ error }),

  clearRecommendations: () =>
    set({ recommendations: [] }),
}))


