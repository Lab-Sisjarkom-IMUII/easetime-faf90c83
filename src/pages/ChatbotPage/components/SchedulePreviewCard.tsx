import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, MapPin, Repeat, Bell, Edit2, X } from 'lucide-react'
import { ParsedSchedule } from '../../../types/chatbot'

interface SchedulePreviewCardProps {
  schedule: ParsedSchedule
  index: number
  isEditing: boolean
  onUpdate: (index: number, updated: ParsedSchedule) => void
  onEditStart: (index: number) => void
  onEditCancel: (index: number) => void
  onDelete: (index: number) => void
}

const SchedulePreviewCard = ({
  schedule,
  index,
  isEditing,
  onUpdate,
  onEditStart,
  onEditCancel,
  onDelete,
}: SchedulePreviewCardProps) => {
  const [editedSchedule, setEditedSchedule] = useState<ParsedSchedule>(schedule)

  const handleSave = () => {
    onUpdate(index, editedSchedule)
  }

  const handleCancel = () => {
    setEditedSchedule(schedule)
    onEditCancel(index)
  }

  const reminderOptions = [5, 15, 30, 60, 120, 180, 240]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 mb-4"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Preview Jadwal #{index + 1}</h3>
        {!isEditing && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEditStart(index)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              type="button"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => onDelete(index)}
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
              value={editedSchedule.title}
              onChange={(e) =>
                setEditedSchedule({ ...editedSchedule, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
              <input
                type="date"
                value={editedSchedule.dateStart}
                onChange={(e) =>
                  setEditedSchedule({ ...editedSchedule, dateStart: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Mulai *</label>
              <input
                type="time"
                value={editedSchedule.timeStart}
                onChange={(e) =>
                  setEditedSchedule({ ...editedSchedule, timeStart: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Time End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Selesai</label>
            <input
              type="time"
              value={editedSchedule.timeEnd || ''}
              onChange={(e) =>
                setEditedSchedule({ ...editedSchedule, timeEnd: e.target.value || undefined })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
            <input
              type="text"
              value={editedSchedule.location || ''}
              onChange={(e) =>
                setEditedSchedule({ ...editedSchedule, location: e.target.value || null })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Ruang 301, Lab A"
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perulangan</label>
            <select
              value={editedSchedule.repeatType}
              onChange={(e) =>
                setEditedSchedule({
                  ...editedSchedule,
                  repeatType: e.target.value as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="NONE">Tidak Berulang</option>
              <option value="DAILY">Setiap Hari</option>
              <option value="WEEKLY">Setiap Minggu</option>
              <option value="MONTHLY">Setiap Bulan</option>
            </select>
          </div>

          {/* Early Reminder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Early Reminder (menit sebelum)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {reminderOptions.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() =>
                    setEditedSchedule({ ...editedSchedule, earlyReminderMinutes: minutes })
                  }
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    editedSchedule.earlyReminderMinutes === minutes
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {minutes === 60 ? '1 jam' : minutes === 120 ? '2 jam' : `${minutes} menit`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="1440"
              value={editedSchedule.earlyReminderMinutes || 30}
              onChange={(e) =>
                setEditedSchedule({
                  ...editedSchedule,
                  earlyReminderMinutes: parseInt(e.target.value) || 30,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Custom (menit)"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              value={editedSchedule.description || ''}
              onChange={(e) =>
                setEditedSchedule({ ...editedSchedule, description: e.target.value || null })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Catatan tambahan (opsional)"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              type="button"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Calendar className="text-blue-500" size={20} />
            <span className="text-gray-700">
              {new Date(schedule.dateStart).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="text-blue-500" size={20} />
            <span className="text-gray-700">
              {schedule.timeStart} {schedule.timeEnd ? `- ${schedule.timeEnd}` : ''}
            </span>
          </div>
          {schedule.location && (
            <div className="flex items-center space-x-2">
              <MapPin className="text-blue-500" size={20} />
              <span className="text-gray-700">{schedule.location}</span>
            </div>
          )}
          {schedule.repeatType !== 'NONE' && (
            <div className="flex items-center space-x-2">
              <Repeat className="text-blue-500" size={20} />
              <span className="text-gray-700">
                {schedule.repeatType === 'DAILY' && 'Setiap Hari'}
                {schedule.repeatType === 'WEEKLY' && 'Setiap Minggu'}
                {schedule.repeatType === 'MONTHLY' && 'Setiap Bulan'}
              </span>
            </div>
          )}
          {schedule.earlyReminderMinutes && (
            <div className="flex items-center space-x-2">
              <Bell className="text-blue-500" size={20} />
              <span className="text-gray-700">
                Ingatkan {schedule.earlyReminderMinutes} menit sebelum
              </span>
            </div>
          )}
          {schedule.description && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600">{schedule.description}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default SchedulePreviewCard

