import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, MapPin, Save, X, Trash2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Schedule, ScheduleCategory } from '../types/schedule'

// Helper functions for category display
const getCategoryColor = (category?: string) => {
  switch (category) {
    case 'academic':
      return 'bg-blue-100 text-blue-700'
    case 'event':
      return 'bg-purple-100 text-purple-700'
    case 'personal':
      return 'bg-green-100 text-green-700'
    case 'work':
      return 'bg-orange-100 text-orange-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getCategoryLabel = (category?: string) => {
  switch (category) {
    case 'academic':
      return 'Akademik'
    case 'event':
      return 'Event'
    case 'personal':
      return 'Personal'
    case 'work':
      return 'Kerja'
    default:
      return 'Lainnya'
  }
}

interface SchedulePreviewCardProps {
  schedule: Schedule
  index: number
  onUpdate: (index: number, updated: Schedule) => void
  onDelete: (index: number) => void
  isEditing?: boolean
  onEditStart?: () => void
  onEditCancel?: () => void
}

const SchedulePreviewCard = ({ 
  schedule, 
  index, 
  onUpdate, 
  onDelete,
  isEditing: externalIsEditing,
  onEditStart,
  onEditCancel
}: SchedulePreviewCardProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedSchedule, setEditedSchedule] = useState<Schedule>(schedule)
  const cardRef = useRef<HTMLDivElement>(null)

  // Use external editing state if provided, otherwise use internal
  const editing = externalIsEditing !== undefined ? externalIsEditing : isEditing

  // Update editedSchedule when schedule prop changes
  useEffect(() => {
    setEditedSchedule(schedule)
    if (externalIsEditing === false) {
      setIsEditing(false)
    }
  }, [schedule, externalIsEditing])

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    onUpdate(index, editedSchedule)
    if (externalIsEditing === undefined) {
      setIsEditing(false)
    }
    // If external editing, parent will handle state
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    console.log('Cancel button clicked', { externalIsEditing, onEditCancel: !!onEditCancel })
    setEditedSchedule(schedule)
    if (onEditCancel) {
      // If parent-controlled, notify parent to cancel
      onEditCancel()
    } else if (externalIsEditing === undefined) {
      // If internal editing, update local state
      setIsEditing(false)
    }
  }

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    console.log('Edit button clicked', { externalIsEditing, onEditStart: !!onEditStart })
    
    if (onEditStart) {
      // Always call onEditStart if provided (parent-controlled)
      onEditStart()
    } else {
      // If no parent control, use internal state
      setIsEditing(true)
    }
  }

  // Toggle edit mode when clicking on the card (but not on buttons or inputs)
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger edit if clicking on buttons, inputs, or inside edit form
    const target = e.target as HTMLElement
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'LABEL' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('label') ||
      editing
    ) {
      return
    }
    
    if (onEditStart) {
      // Always call onEditStart if provided (parent-controlled)
      onEditStart()
    } else {
      // If no parent control, use internal state
      setIsEditing(true)
    }
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white rounded-xl border p-6 hover:shadow-lg transition-all border-gray-200 ${
        !editing ? 'cursor-pointer' : ''
      }`}
      onClick={handleCardClick}
    >
      {!editing ? (
        <>
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2 flex-wrap">
                <h3 className="text-lg font-semibold text-gray-900">{schedule.title}</h3>
                {schedule.category && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(schedule.category)}`}>
                    {getCategoryLabel(schedule.category)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleStartEdit}
                className="px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors text-sm text-blue-600 font-medium"
                aria-label="Edit schedule"
                type="button"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
                    onDelete(index)
                  }
                }}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Delete schedule"
                type="button"
              >
                <Trash2 size={18} className="text-red-600" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-gray-600">
              <Calendar size={18} className="text-blue-500" />
              <span>
                {new Date(schedule.date).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            <div className="flex items-center space-x-3 text-gray-600">
              <Clock size={18} className="text-blue-500" />
              <span>
                {schedule.timeStart} - {schedule.timeEnd}
              </span>
            </div>

            {schedule.location ? (
              <div className="flex items-center space-x-3 text-gray-600">
                <MapPin size={18} className="text-blue-500" />
                <span>{schedule.location}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-3 text-gray-400 italic">
                <MapPin size={18} className="text-gray-400" />
                <span className="text-sm">Lokasi belum ditentukan</span>
              </div>
            )}

            {schedule.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">{schedule.notes}</p>
              </div>
            )}

            {schedule.isRecurring && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle2 size={16} className="text-purple-500" />
                  <span>
                    Berulang: {schedule.recurrencePattern === 'weekly' && 'Mingguan'}
                    {schedule.recurrencePattern === 'daily' && 'Harian'}
                    {schedule.recurrencePattern === 'monthly' && 'Bulanan'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
            <input
              type="text"
              value={editedSchedule.title}
              onChange={(e) => setEditedSchedule({ ...editedSchedule, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={editedSchedule.date}
                onChange={(e) => setEditedSchedule({ ...editedSchedule, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
              <input
                type="text"
                value={editedSchedule.location || ''}
                onChange={(e) =>
                  setEditedSchedule({ ...editedSchedule, location: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={editedSchedule.category || 'academic'}
              onChange={(e) =>
                setEditedSchedule({ ...editedSchedule, category: e.target.value as ScheduleCategory })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="academic">Akademik</option>
              <option value="event">Event</option>
              <option value="personal">Personal</option>
              <option value="work">Kerja</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mulai</label>
              <input
                type="time"
                value={editedSchedule.timeStart}
                onChange={(e) =>
                  setEditedSchedule({ ...editedSchedule, timeStart: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selesai</label>
              <input
                type="time"
                value={editedSchedule.timeEnd}
                onChange={(e) =>
                  setEditedSchedule({ ...editedSchedule, timeEnd: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan (opsional)
            </label>
            <textarea
              value={editedSchedule.notes || ''}
              onChange={(e) => setEditedSchedule({ ...editedSchedule, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={handleCancel}
              type="button"
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
            >
              <X size={18} />
              <span>Batal</span>
            </button>
            <button
              onClick={handleSave}
              type="button"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Save size={18} />
              <span>Simpan</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default SchedulePreviewCard
