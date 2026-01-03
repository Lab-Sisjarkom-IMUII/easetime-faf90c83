import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { useRecommendationStore } from '../../stores/recommendationStore'
import { useScheduleStore } from '../../stores/useScheduleStore'
import { recommendationApi } from '../../lib/recommendationApi'
import { RecommendationEdits } from '../../types/recommendation'
import { RecommendationCard } from './components/RecommendationCard'
import { useFetchSchedules } from '../../hooks/useFetchSchedules'
import { supabase } from '../../lib/supabase'

const RecommendationsPage = () => {
  const { recommendations, isLoading, isGenerating, error, setRecommendations, setLoading, setGenerating, setError, updateRecommendation: updateRecInStore, removeRecommendation } = useRecommendationStore()
  const { schedules } = useScheduleStore()
  const { fetchAll } = useFetchSchedules()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  // Load recommendations on mount
  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const recs = await recommendationApi.getRecommendations(user.id, 'PENDING')
      setRecommendations(recs)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat rekomendasi')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User tidak terautentikasi')
        return
      }

      // Prepare context from existing schedules
      const events = schedules.slice(0, 30).map(s => ({
        title: s.title,
        start: new Date(`${s.date}T${s.timeStart}`).toISOString(),
        end: new Date(`${s.date}T${s.timeEnd}`).toISOString(),
        recurrence: s.recurrencePattern?.toUpperCase() || 'NONE',
        category: s.category || 'other',
      }))

      const result = await recommendationApi.generateRecommendations({
        userId: user.id,
        context: { events },
        trigger: 'manual',
      })

      if (!result.success) {
        setError(result.error || 'Gagal menghasilkan rekomendasi')
        return
      }

      // Reload recommendations
      await loadRecommendations()
    } catch (err: any) {
      setError(err.message || 'Gagal menghasilkan rekomendasi')
    } finally {
      setGenerating(false)
    }
  }

  const handleUpdate = async (id: string, edits: RecommendationEdits) => {
    try {
      const updated = await recommendationApi.updateRecommendation(id, edits)
      updateRecInStore(id, updated)
      setEditingId(null)
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui rekomendasi')
    }
  }

  const handleConfirm = async (id: string, edits?: RecommendationEdits, overrideConflict?: boolean) => {
    try {
      setConfirmingId(id)
      const result = await recommendationApi.confirmRecommendation(id, { edits, overrideConflict })

      if (!result.success) {
        if (result.conflict) {
          // Show conflict warning - handled by RecommendationCard
          setError('Jadwal bertabrakan. Silakan edit waktu atau pilih override.')
          setConfirmingId(null)
          return
        }
        setError(result.error || 'Gagal menyimpan jadwal')
        setConfirmingId(null)
        return
      }

      // Remove from recommendations list
      removeRecommendation(id)

      // Refresh schedules
      await fetchAll({ sort: 'nearest' })

      // Show success message
      setError(null)
      // You can use a toast library here instead
      setTimeout(() => {
        // Success handled by removal from list
      }, 100)
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan jadwal')
    } finally {
      setConfirmingId(null)
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await recommendationApi.dismissRecommendation(id)
      removeRecommendation(id)
    } catch (err: any) {
      setError(err.message || 'Gagal menolak rekomendasi')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Sparkles className="text-blue-600" size={32} />
                Rekomendasi Jadwal
              </h1>
              <p className="text-gray-600">
                Dapatkan saran jadwal baru berdasarkan pola aktivitas Anda
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Menghasilkan...
                </>
              ) : (
                <>
                  <RefreshCw size={20} />
                  Generate Rekomendasi
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        )}

        {/* Recommendations List */}
        {!isLoading && recommendations.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm"
          >
            <Sparkles className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Belum ada rekomendasi
            </h3>
            <p className="text-gray-600 mb-4">
              Klik tombol "Generate Rekomendasi" untuk mendapatkan saran jadwal baru
            </p>
          </motion.div>
        )}

        {!isLoading && recommendations.length > 0 && (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                isEditing={editingId === rec.id}
                onUpdate={handleUpdate}
                onEditStart={setEditingId}
                onEditCancel={() => setEditingId(null)}
                onConfirm={handleConfirm}
                onDismiss={handleDismiss}
                hasConflict={false} // TODO: Check conflict
                isConfirming={confirmingId === rec.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecommendationsPage


