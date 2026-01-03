import { Edit, Trash2, Bell, X, Calendar, Clock, MapPin, Repeat } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Schedule } from '../../../types/schedule'
import { formatDate, formatTime } from '../../../utils/formatDate'

interface PreviewScheduleModalProps {
  schedule: Schedule | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (schedule: Schedule) => void
  onDelete?: (id: string) => void
  onRemind?: (id: string) => void
}

const PreviewScheduleModal = ({
  schedule,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onRemind,
}: PreviewScheduleModalProps) => {
  if (!isOpen || !schedule) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-blue-50 rounded-xl shadow-xl max-w-lg w-full"
        >
          <div className="sticky top-0 bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Detail Jadwal</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{schedule.title}</h3>
              {schedule.isRecurring && (
                <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                  <Repeat size={14} className="mr-1" />
                  Jadwal Berulang
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-600">
                <Calendar className="text-blue-500" size={20} />
                <span>{formatDate(schedule.date, 'long')}</span>
              </div>

              <div className="flex items-center space-x-3 text-gray-600">
                <Clock className="text-blue-500" size={20} />
                <span>{formatTime(schedule.timeStart)} - {formatTime(schedule.timeEnd)}</span>
              </div>

              {schedule.location && (
                <div className="flex items-center space-x-3 text-gray-600">
                  <MapPin className="text-blue-500" size={20} />
                  <span>{schedule.location}</span>
                </div>
              )}

              {schedule.notes && (
                <div className="pt-3 border-t border-blue-200">
                  <p className="text-gray-600">{schedule.notes}</p>
                </div>
              )}

              {schedule.isRecurring && schedule.recurrenceStartDate && schedule.recurrenceEndDate && (
                <div className="pt-3 border-t border-blue-200">
                  <p className="text-sm text-gray-500">
                    Periode: {formatDate(schedule.recurrenceStartDate)} - {formatDate(schedule.recurrenceEndDate)}
                  </p>
                </div>
              )}
            </div>

            {(onEdit || onDelete || onRemind) && (
              <div className="flex space-x-3 pt-4 border-t border-blue-200">
                {onRemind && (
                  <button
                    onClick={() => onRemind(schedule.id!)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <Bell size={18} />
                    <span>Ingatkan</span>
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(schedule)
                      onClose()
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit size={18} />
                    <span>Edit</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
                        onDelete(schedule.id!)
                        onClose()
                      }
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={18} />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default PreviewScheduleModal

