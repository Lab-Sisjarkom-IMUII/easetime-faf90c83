import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, CheckSquare, Square, Loader2, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { scheduleApi } from '../../services/api'
import { Schedule } from '../../types/schedule'
import { formatDate, formatTime } from '../../utils/formatDate'

const AllSchedulesPage = () => {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<'selected' | 'all' | null>(null)

  const loadSchedules = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await scheduleApi.getAllSchedulesRaw({ sort: 'nearest' })
      setSchedules(data)
      setSelected(new Set())
    } catch (err: any) {
      setError(err.message || 'Gagal memuat jadwal')
    } finally {
      setLoading(false)
      setConfirming(null)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

  const toggleSelect = (id?: string) => {
    if (!id) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allIds = useMemo(
    () => schedules.map((s) => s.id).filter((id): id is string => Boolean(id)),
    [schedules]
  )

  const selectAll = () => {
    setSelected(new Set(allIds))
  }

  const clearSelection = () => setSelected(new Set())

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return
    setConfirming('selected')
    try {
      await scheduleApi.deleteSchedules(Array.from(selected))
      await loadSchedules()
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus jadwal terpilih')
    } finally {
      setConfirming(null)
    }
  }

  const handleDeleteAll = async () => {
    if (allIds.length === 0) return
    
    // Validasi konfirmasi sebelum menghapus semua
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus SEMUA jadwal (${allIds.length} jadwal)?\n\nTindakan ini tidak dapat dibatalkan!`
    )
    
    if (!confirmed) return
    
    setConfirming('all')
    try {
      await scheduleApi.deleteSchedules(allIds)
      await loadSchedules()
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus semua jadwal')
    } finally {
      setConfirming(null)
    }
  }

  const hasSelection = selected.size > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Semua Jadwal</h1>
            <p className="text-gray-600">Kelola jadwal, pilih banyak, atau hapus sekaligus</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50"
            type="button"
          >
            Kembali ke Dashboard
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={selectAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            type="button"
            disabled={loading}
          >
            <CheckSquare size={16} />
            Pilih Semua
          </button>
          <button
            onClick={clearSelection}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 text-sm"
            type="button"
            disabled={loading}
          >
            <Square size={16} />
            Bersihkan Pilihan
          </button>
          <button
            onClick={handleDeleteSelected}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-60"
            type="button"
            disabled={!hasSelection || loading || confirming === 'selected'}
          >
            {confirming === 'selected' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />}
            Hapus Terpilih ({selected.size})
          </button>
          <button
            onClick={handleDeleteAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 text-sm disabled:opacity-60"
            type="button"
            disabled={allIds.length === 0 || loading || confirming === 'all'}
          >
            {confirming === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />}
            Hapus Semua
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Memuat jadwal...
          </div>
        ) : schedules.length === 0 ? (
          <div className="bg-white border border-blue-100 rounded-xl p-8 text-center text-gray-600">
            Belum ada jadwal. Tambahkan jadwal dari Dashboard, Scan, atau Chatbot.
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => {
              const checked = schedule.id ? selected.has(schedule.id) : false
              return (
                <motion.div
                  key={schedule.id || `${schedule.title}-${schedule.date}-${schedule.timeStart}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm flex items-start gap-4"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(schedule.id)}
                    className="mt-2 w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{schedule.title}</h3>
                        <p className="text-sm text-gray-600">
                          {formatDate(schedule.date, 'long')} · {formatTime(schedule.timeStart)} - {formatTime(schedule.timeEnd)}
                        </p>
                        {schedule.category && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            {schedule.category}
                          </span>
                        )}
                      </div>
                      {schedule.isRecurring && (
                        <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          Berulang ({schedule.recurrencePattern})
                        </span>
                      )}
                    </div>
                    {schedule.notes && (
                      <p className="text-sm text-gray-600 mt-2">{schedule.notes}</p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AllSchedulesPage

