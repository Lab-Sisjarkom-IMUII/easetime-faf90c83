import { useState } from 'react'
import { Calendar, Clock, MapPin, Edit2, Save, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Schedule } from '../types/schedule'

interface ScheduleCardProps {
  schedule: Schedule
  index: number
  onUpdate: (index: number, updated: Schedule) => void
}

const ScheduleCard = ({ schedule, index, onUpdate }: ScheduleCardProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedSchedule, setEditedSchedule] = useState<Schedule>(schedule)

  const handleSave = () => {
    onUpdate(index, editedSchedule)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedSchedule(schedule)
    setIsEditing(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
    >
      {!isEditing ? (
        <>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {schedule.title}
            </h3>
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit2 size={18} className="text-blue-600" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-gray-600">
              <Calendar size={18} className="text-blue-500" />
              <span>{new Date(schedule.date).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}</span>
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
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul
            </label>
            <input
              type="text"
              value={editedSchedule.title}
              onChange={(e) =>
                setEditedSchedule({ ...editedSchedule, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal
              </label>
              <input
                type="date"
                value={editedSchedule.date}
                onChange={(e) =>
                  setEditedSchedule({ ...editedSchedule, date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lokasi
              </label>
              <input
                type="text"
                value={editedSchedule.location}
                onChange={(e) =>
                  setEditedSchedule({
                    ...editedSchedule,
                    location: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mulai
              </label>
              <input
                type="time"
                value={editedSchedule.timeStart}
                onChange={(e) =>
                  setEditedSchedule({
                    ...editedSchedule,
                    timeStart: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selesai
              </label>
              <input
                type="time"
                value={editedSchedule.timeEnd}
                onChange={(e) =>
                  setEditedSchedule({
                    ...editedSchedule,
                    timeEnd: e.target.value,
                  })
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
              onChange={(e) =>
                setEditedSchedule({ ...editedSchedule, notes: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
            >
              <X size={18} />
              <span>Batal</span>
            </button>
            <button
              onClick={handleSave}
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

export default ScheduleCard
