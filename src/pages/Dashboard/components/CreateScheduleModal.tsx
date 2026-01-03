import { useState } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Schedule, RecurrencePattern, ScheduleCategory } from '../../../types/schedule'
import { scheduleApi } from '../../../services/api'
import { useScheduleStore } from '../../../stores/useScheduleStore'

interface CreateScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateScheduleModal = ({ isOpen, onClose, onSuccess }: CreateScheduleModalProps) => {
  const { addSchedule, setLoading, setError } = useScheduleStore()
  const [formData, setFormData] = useState<Partial<Schedule>>({
    title: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    timeStart: '09:00',
    timeEnd: '10:00',
    notes: '',
    category: 'academic',
    isRecurring: false,
    recurrencePattern: 'weekly',
    reminderEnabled: false,
    reminderMinutesBefore: 30,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.date || !formData.timeStart || !formData.timeEnd) {
      setError('Harap isi semua field yang wajib')
      return
    }

    try {
      setLoading(true)
      const newSchedule = await scheduleApi.createSchedule({
        title: formData.title!,
        location: formData.location || undefined, // Optional field, no placeholder
        date: formData.date!,
        timeStart: formData.timeStart!,
        timeEnd: formData.timeEnd!,
        notes: formData.notes,
        isRecurring: formData.isRecurring || false,
        recurrencePattern: formData.recurrencePattern,
        recurrenceStartDate: formData.isRecurring ? formData.recurrenceStartDate || formData.date : undefined,
        recurrenceEndDate: formData.isRecurring ? formData.recurrenceEndDate : undefined,
        recurrenceDaysOfWeek: formData.isRecurring && formData.recurrencePattern === 'weekly' ? formData.recurrenceDaysOfWeek : undefined,
        reminderEnabled: formData.reminderEnabled || false,
        reminderMinutesBefore: formData.reminderEnabled ? formData.reminderMinutesBefore : undefined,
        category: formData.category || 'academic',
      })
      
      addSchedule(newSchedule)
      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        title: '',
        location: '',
        date: new Date().toISOString().split('T')[0],
        timeStart: '09:00',
        timeEnd: '10:00',
        notes: '',
        isRecurring: false,
        reminderEnabled: false,
        reminderMinutesBefore: 30,
      })
    } catch (error: any) {
      setError(error.message || 'Failed to create schedule')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-blue-50 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Tambah Jadwal Baru</h2>
            <button
              onClick={onClose}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Judul <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lokasi
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contoh: Ruang 301, Lab A, Gedung A Lantai 2 (opsional)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori
              </label>
              <select
                value={formData.category || 'academic'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ScheduleCategory })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mulai <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.timeStart}
                  onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selesai <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.timeEnd}
                  onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="pt-4 border-t border-blue-200">
              <label className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  checked={formData.isRecurring || false}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Jadwal Berulang</span>
              </label>

              {formData.isRecurring && (
                <div className="space-y-4 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pola Perulangan
                    </label>
                    <select
                      value={formData.recurrencePattern || 'weekly'}
                      onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value as RecurrencePattern })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Setiap Hari</option>
                      <option value="weekly">Setiap Minggu</option>
                      <option value="monthly">Setiap Bulan</option>
                    </select>
                  </div>

                  {formData.recurrencePattern === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hari dalam Seminggu
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day, idx) => (
                          <label key={idx} className="flex flex-col items-center space-y-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.recurrenceDaysOfWeek?.includes(idx) || false}
                              onChange={(e) => {
                                const days = formData.recurrenceDaysOfWeek || []
                                const newDays = e.target.checked
                                  ? [...days, idx]
                                  : days.filter(d => d !== idx)
                                setFormData({ ...formData, recurrenceDaysOfWeek: newDays.sort() })
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-xs">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mulai Perulangan
                      </label>
                      <input
                        type="date"
                        value={formData.recurrenceStartDate || formData.date}
                        onChange={(e) => setFormData({ ...formData, recurrenceStartDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Selesai Perulangan
                      </label>
                      <input
                        type="date"
                        value={formData.recurrenceEndDate || ''}
                        onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reminder Settings */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="reminder-enabled"
                    checked={formData.reminderEnabled || false}
                    onChange={(e) => setFormData({ ...formData, reminderEnabled: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="reminder-enabled" className="text-sm font-medium text-gray-700">
                    Aktifkan Pengingat (Early Reminder)
                  </label>
                </div>

                {formData.reminderEnabled && (
                  <div className="pl-6 border-l-2 border-purple-200 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ingatkan Sebelum (menit)
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {[15, 30, 60, 120, 180, 240].map((minutes) => (
                          <button
                            key={minutes}
                            type="button"
                            onClick={() => setFormData({ ...formData, reminderMinutesBefore: minutes })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              formData.reminderMinutesBefore === minutes
                                ? 'bg-purple-600 text-white'
                                : 'bg-blue-100 text-gray-700 hover:bg-blue-200'
                            }`}
                          >
                            {minutes === 15
                              ? '15 menit'
                              : minutes === 30
                              ? '30 menit'
                              : minutes === 60
                              ? '1 jam'
                              : minutes === 120
                              ? '2 jam'
                              : minutes === 180
                              ? '3 jam'
                              : minutes === 240
                              ? '4 jam'
                              : `${minutes} menit`}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Atau masukkan custom (menit)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={formData.reminderMinutesBefore || 30}
                          onChange={(e) => setFormData({ ...formData, reminderMinutesBefore: parseInt(e.target.value) || 30 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="30"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-blue-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-colors"
              >
                Simpan
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default CreateScheduleModal

