import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, MapPin, Tag, Repeat, Bell, Edit2, Check, X, AlertTriangle } from 'lucide-react'
import { Recommendation, RecommendationEdits } from '../../../types/recommendation'
import { ScheduleCategory } from '../../../types/schedule'

interface RecommendationCardProps {
  recommendation: Recommendation
  isEditing: boolean
  onUpdate: (id: string, edits: RecommendationEdits) => void
  onEditStart: (id: string) => void
  onEditCancel: (id: string) => void
  onConfirm: (id: string, edits?: RecommendationEdits, overrideConflict?: boolean) => void
  onDismiss: (id: string) => void
  hasConflict?: boolean
  isConfirming?: boolean
}

const categoryLabels: Record<ScheduleCategory, string> = {
  academic: 'Akademik',
  event: 'Event',
  personal: 'Personal',
  work: 'Kerja',
  other: 'Lainnya',
}

const categoryColors: Record<ScheduleCategory, string> = {
  academic: 'bg-blue-100 text-blue-800',
  event: 'bg-purple-100 text-purple-800',
  personal: 'bg-green-100 text-green-800',
  work: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
}

const recurrenceLabels: Record<string, string> = {
  NONE: 'Tidak berulang',
  DAILY: 'Setiap hari',
  WEEKLY: 'Setiap minggu',
  MONTHLY: 'Setiap bulan',
}

export const RecommendationCard = ({
  recommendation,
  isEditing,
  onUpdate,
  onEditStart,
  onEditCancel,
  onConfirm,
  onDismiss,
  hasConflict = false,
  isConfirming = false,
}: RecommendationCardProps) => {
  const [edits, setEdits] = useState<RecommendationEdits>({})
  const [showConflictDialog, setShowConflictDialog] = useState(false)

  const handleSave = () => {
    onUpdate(recommendation.id, edits)
    onEditCancel(recommendation.id)
  }

  const handleCancel = () => {
    setEdits({})
    onEditCancel(recommendation.id)
  }

  const handleConfirmClick = () => {
    if (hasConflict) {
      setShowConflictDialog(true)
    } else {
      onConfirm(recommendation.id, Object.keys(edits).length > 0 ? edits : undefined)
    }
  }

  const handleOverrideConfirm = () => {
    setShowConflictDialog(false)
    onConfirm(recommendation.id, Object.keys(edits).length > 0 ? edits : undefined, true)
  }

  // Helper: format ISO string to datetime-local (ke zona lokal tanpa geser hari)
  const toInputValue = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => n.toString().padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  // Helper: dari datetime-local ke ISO dengan offset tetap Asia/Jakarta (+07:00)
  const fromInputValue = (value: string | undefined) => {
    if (!value) return undefined
    // value format: YYYY-MM-DDTHH:MM
    return `${value}:00+07:00`
  }

  const rec = { ...recommendation, ...edits }
  const startDate = new Date(rec.suggestedStart)
  const endDate = rec.suggestedEnd ? new Date(rec.suggestedEnd) : new Date(startDate.getTime() + 60 * 60 * 1000)
  const dateStr = startDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = `${startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`

  const reminderOptions = [5, 15, 30, 60, 120, 180, 240]

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-2xl border-2 ${hasConflict ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'} shadow-lg p-6 mb-4`}
      >
        {hasConflict && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg flex items-center gap-2">
            <AlertTriangle className="text-yellow-600" size={20} />
            <span className="text-sm text-yellow-800 font-medium">
              ⚠️ Jadwal ini bertabrakan dengan jadwal yang sudah ada
            </span>
          </div>
        )}

        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Rekomendasi Jadwal</h3>
            {rec.metadata?.reason && (
              <p className="text-xs text-gray-500 italic hidden">Alasan: {rec.metadata.reason}</p>
            )}
          </div>
          {!isEditing && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEditStart(recommendation.id)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                type="button"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => onDismiss(recommendation.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                type="button"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
              <input
                type="text"
                value={edits.title ?? recommendation.title}
                onChange={(e) => setEdits({ ...edits, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal & Waktu Mulai *</label>
                <input
                  type="datetime-local"
                  value={toInputValue(edits.suggestedStart || recommendation.suggestedStart)}
                  onChange={(e) => setEdits({ ...edits, suggestedStart: fromInputValue(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Selesai</label>
                <input
                  type="datetime-local"
                  value={rec.suggestedEnd ? toInputValue(rec.suggestedEnd) : ''}
                  onChange={(e) => setEdits({ ...edits, suggestedEnd: fromInputValue(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={edits.category ?? recommendation.category}
                onChange={(e) => setEdits({ ...edits, category: e.target.value as ScheduleCategory })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perulangan</label>
              <select
                value={edits.recurrence ?? recommendation.recurrence}
                onChange={(e) => setEdits({ ...edits, recurrence: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(recurrenceLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Reminder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pengingat (menit sebelum)</label>
              <select
                value={edits.remindBefore ?? recommendation.remindBefore ?? 30}
                onChange={(e) => setEdits({ ...edits, remindBefore: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {reminderOptions.map((mins) => (
                  <option key={mins} value={mins}>{mins} menit</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea
                value={edits.description ?? recommendation.description ?? ''}
                onChange={(e) => setEdits({ ...edits, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Simpan Perubahan
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Info */}
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={18} className="text-blue-500" />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={18} className="text-blue-500" />
              <span>{timeStr}</span>
            </div>
            {rec.description && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={18} className="text-blue-500" />
                <span>{rec.description}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-gray-400" />
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[rec.category]}`}>
                {categoryLabels[rec.category]}
              </span>
            </div>
            {rec.recurrence !== 'NONE' && (
              <div className="flex items-center gap-2 text-gray-600">
                <Repeat size={18} className="text-blue-500" />
                <span>{recurrenceLabels[rec.recurrence]}</span>
              </div>
            )}
            {rec.remindBefore && (
              <div className="flex items-center gap-2 text-gray-600">
                <Bell size={18} className="text-blue-500" />
                <span>{rec.remindBefore} menit sebelum</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleConfirmClick}
                disabled={isConfirming}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Simpan & Konfirmasi
                  </>
                )}
              </button>
              <button
                onClick={() => onDismiss(recommendation.id)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Tolak
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Conflict dialog */}
      {showConflictDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Konflik Jadwal Terdeteksi</h3>
            <p className="text-gray-600 mb-4">
              Jadwal ini bertabrakan dengan jadwal yang sudah ada. Apakah Anda ingin tetap menyimpan?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleOverrideConfirm}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Ya, Simpan
              </button>
              <button
                onClick={() => setShowConflictDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


