import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, AlertCircle, Save, Repeat, Plus, X, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import SchedulePreviewCard from '../components/SchedulePreviewCard'
import { scheduleApi } from '../lib/scheduleApi'
import { Schedule, RecurrencePattern } from '../types/schedule'

const ReviewSchedule = () => {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null)
  const [newSchedule, setNewSchedule] = useState<Partial<Schedule>>({
    title: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    timeStart: '09:00',
    timeEnd: '10:00',
    notes: '',
  })

  // Global recurring settings untuk semua jadwal
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly')
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<string>('')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('')
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>([])

  // Global reminder settings untuk semua jadwal
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(30)

  useEffect(() => {
    // Load schedules dari sessionStorage
    const stored = sessionStorage.getItem('scannedSchedules')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSchedules(parsed)
        
        // Set default recurrence start date ke tanggal hari ini (tanggal upload/scan)
        const today = new Date().toISOString().split('T')[0]
        setRecurrenceStartDate(today)
        
        // Set default end date ke 3 bulan dari hari ini
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 3)
        setRecurrenceEndDate(endDate.toISOString().split('T')[0])
      } catch (err) {
        setError('Gagal memuat data jadwal')
        navigate('/schedule/upload')
      }
    } else {
      navigate('/schedule/upload')
    }
  }, [navigate])

  const handleUpdate = (index: number, updated: Schedule) => {
    setSchedules((prev) => {
      const newSchedules = [...prev]
      newSchedules[index] = updated
      return newSchedules
    })
    setEditingCardIndex(null)
  }

  const handleEditStart = (index: number) => {
    console.log('handleEditStart called with index:', index)
    setEditingCardIndex(index)
  }

  const handleEditCancel = () => {
    console.log('handleEditCancel called')
    setEditingCardIndex(null)
  }

  const handleDelete = (index: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
      setSchedules((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleAddSchedule = () => {
    if (!newSchedule.title || !newSchedule.date || !newSchedule.timeStart || !newSchedule.timeEnd) {
      setError('Harap isi semua field yang wajib')
      return
    }

    const schedule: Schedule = {
      title: newSchedule.title!,
      location: newSchedule.location || undefined, // Optional field
      date: newSchedule.date!,
      timeStart: newSchedule.timeStart!,
      timeEnd: newSchedule.timeEnd!,
      notes: newSchedule.notes,
      source_text: 'Ditambahkan manual oleh user',
    }

    setSchedules((prev) => [...prev, schedule])
    setNewSchedule({
      title: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      timeStart: '09:00',
      timeEnd: '10:00',
      notes: '',
    })
    setShowAddForm(false)
    setError(null)
  }

  const handleConfirm = async () => {
    if (schedules.length === 0) {
      setError('Tidak ada jadwal untuk disimpan')
      return
    }

    // Validasi recurring settings jika diaktifkan
    if (isRecurring) {
      if (!recurrenceStartDate || !recurrenceEndDate) {
        setError('Harap isi tanggal mulai dan selesai perulangan')
        return
      }
      if (recurrencePattern === 'weekly' && recurrenceDaysOfWeek.length === 0) {
        setError('Harap pilih minimal satu hari untuk pola perulangan mingguan')
        return
      }
    }

    setSaving(true)
    setError(null)

    try {
      // Apply global recurring settings ke semua schedules
      // Gunakan tanggal hari ini sebagai default jika tidak diisi
      // Helper: dapatkan hari dalam minggu dari date string
      const getDayFromDate = (dateStr?: string) => {
        if (!dateStr) return undefined
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return undefined
        return d.getDay() // 0-6
      }

      const schedulesWithRecurring = schedules.map(schedule => {
        if (!isRecurring) {
          return {
            ...schedule,
            reminderEnabled: reminderEnabled,
            reminderMinutesBefore: reminderEnabled ? reminderMinutesBefore : undefined,
          }
        }

        const scheduleDay = getDayFromDate(schedule.date)
        const startForThis = schedule.date || recurrenceStartDate
        const recurrenceDays =
          recurrencePattern === 'weekly'
            ? (recurrenceDaysOfWeek.length > 0
              ? recurrenceDaysOfWeek
              : scheduleDay !== undefined ? [scheduleDay] : [])
            : undefined

        const defaultEnd = () => {
          const base = startForThis || new Date().toISOString().split('T')[0]
          const end = new Date(base)
          end.setMonth(end.getMonth() + 3)
          return end.toISOString().split('T')[0]
        }

        return {
          ...schedule,
          isRecurring: true,
          recurrencePattern,
          recurrenceStartDate: startForThis,
          recurrenceEndDate: recurrenceEndDate || defaultEnd(),
          recurrenceDaysOfWeek: recurrenceDays,
          reminderEnabled: reminderEnabled,
          reminderMinutesBefore: reminderEnabled ? reminderMinutesBefore : undefined,
        }
      })

      const result = await scheduleApi.confirmSchedules(schedulesWithRecurring)

      if (!result.success) {
        setError(result.error || 'Gagal menyimpan jadwal')
        setSaving(false)
        return
      }

      // Clear sessionStorage
      sessionStorage.removeItem('scannedSchedules')
      sessionStorage.removeItem('uploadFileId')
      sessionStorage.removeItem('uploadFileUrl')

      setSuccess(true)

      // Redirect ke dashboard setelah 2 detik
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan jadwal')
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-blue-50 rounded-2xl shadow-lg border border-blue-100 p-12 text-center max-w-md"
        >
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-green-600" size={40} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Jadwal Berhasil Ditambahkan!
          </h2>
          <p className="text-gray-600 mb-6">
            {schedules.length} jadwal telah berhasil disimpan ke akun Anda.
          </p>
          <p className="text-sm text-gray-500">
            Mengalihkan ke dashboard...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 rounded-2xl shadow-lg border border-blue-100 p-8"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <button
                  onClick={() => {
                    if (confirm('Apakah Anda yakin ingin membatalkan? Perubahan yang belum disimpan akan hilang.')) {
                      sessionStorage.removeItem('scannedSchedules')
                      sessionStorage.removeItem('uploadFileId')
                      sessionStorage.removeItem('uploadFileUrl')
                      navigate('/schedule/upload')
                    }
                  }}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
                  type="button"
                >
                  <ArrowLeft size={20} />
                  <span>Kembali</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Review Hasil Scan
                </h1>
                <p className="text-gray-600">
                  Periksa dan edit jadwal yang telah diekstrak oleh AI sebelum
                  menyimpannya
                </p>
                <div className="mt-4 px-4 py-2 bg-blue-50 rounded-lg inline-block">
                  <span className="text-sm font-medium text-blue-900">
                    {schedules.length} jadwal ditemukan
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin membatalkan? Perubahan yang belum disimpan akan hilang.')) {
                    sessionStorage.removeItem('scannedSchedules')
                    sessionStorage.removeItem('uploadFileId')
                    sessionStorage.removeItem('uploadFileUrl')
                    navigate('/schedule/upload')
                  }
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                type="button"
              >
                Batal
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3"
            >
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}

          {/* Global Reminder Settings */}
          <div className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-200">
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle size={20} className="text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Pengaturan Pengingat (Early Reminder)
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Atur pengingat untuk semua jadwal yang di-upload. Anda akan menerima notifikasi sebelum jadwal dimulai.
            </p>

            <div className="space-y-4">
              {/* Toggle Reminder */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="global-reminder"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="global-reminder" className="text-sm font-medium text-gray-700">
                  Aktifkan Pengingat
                </label>
              </div>

              {reminderEnabled && (
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
                          onClick={() => setReminderMinutesBefore(minutes)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            reminderMinutesBefore === minutes
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                        value={reminderMinutesBefore}
                        onChange={(e) => setReminderMinutesBefore(parseInt(e.target.value) || 30)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="30"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Global Recurring Settings */}
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-200">
            <div className="flex items-center space-x-2 mb-4">
              <Repeat size={20} className="text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Pengaturan Perulangan Jadwal
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Atur perulangan untuk semua jadwal yang di-upload. Pengaturan ini akan diterapkan ke semua jadwal.
            </p>

            <div className="space-y-4">
              {/* Toggle Recurring */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="global-recurring"
                  checked={isRecurring}
                  onChange={(e) => {
                    setIsRecurring(e.target.checked)
                    if (!e.target.checked) {
                      setRecurrencePattern('weekly')
                      setRecurrenceDaysOfWeek([])
                    } else if (!recurrenceStartDate && schedules.length > 0) {
                      setRecurrenceStartDate(schedules[0].date)
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="global-recurring" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <span>Jadwal Berulang</span>
                </label>
              </div>

              {isRecurring && (
                <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                  {/* Pattern Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pola Perulangan
                    </label>
                    <select
                      value={recurrencePattern}
                      onChange={(e) => {
                        setRecurrencePattern(e.target.value as RecurrencePattern)
                        if (e.target.value !== 'weekly') {
                          setRecurrenceDaysOfWeek([])
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Setiap Hari</option>
                      <option value="weekly">Setiap Minggu</option>
                      <option value="monthly">Setiap Bulan</option>
                    </select>
                  </div>

                  {/* Days of Week (for weekly) */}
                  {recurrencePattern === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hari dalam Seminggu
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day, idx) => (
                          <label key={idx} className="flex flex-col items-center space-y-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={recurrenceDaysOfWeek.includes(idx)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRecurrenceDaysOfWeek([...recurrenceDaysOfWeek, idx].sort())
                                } else {
                                  setRecurrenceDaysOfWeek(recurrenceDaysOfWeek.filter(d => d !== idx))
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-600">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mulai Perulangan
                      </label>
                      <input
                        type="date"
                        value={recurrenceStartDate}
                        onChange={(e) => setRecurrenceStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Selesai Perulangan
                      </label>
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        min={recurrenceStartDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Info */}
                  {isRecurring && recurrenceStartDate && recurrenceEndDate && (
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                      <strong>Info:</strong> Semua {schedules.length} jadwal akan di-generate untuk periode{' '}
                      {new Date(recurrenceStartDate).toLocaleDateString('id-ID')} - {new Date(recurrenceEndDate).toLocaleDateString('id-ID')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Schedules List */}
          {schedules.length > 0 ? (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Preview Jadwal ({schedules.length} items)
                </h2>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                  type="button"
                >
                  <Plus size={18} />
                  <span>Tambahkan Jadwal</span>
                </button>
              </div>

              {/* Card View */}
              <div className="space-y-4">
                <AnimatePresence>
                  {schedules.map((schedule, index) => (
                    <div key={index} id={`schedule-card-${index}`}>
                      <SchedulePreviewCard
                        schedule={schedule}
                        index={index}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        isEditing={editingCardIndex === index}
                        onEditStart={() => handleEditStart(index)}
                        onEditCancel={handleEditCancel}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 mb-8">
              <p className="mb-4">Tidak ada jadwal ditemukan</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2 mx-auto"
                type="button"
              >
                <Plus size={18} />
                <span>Tambahkan Jadwal Manual</span>
              </button>
            </div>
          )}

          {/* Add Schedule Form */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tambahkan Jadwal yang Hilang</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setError(null)
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                  <input
                    type="text"
                    value={newSchedule.title}
                    onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama mata kuliah/jadwal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={newSchedule.location || ''}
                    onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Ruang 301, Lab A (opsional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    value={newSchedule.date}
                    onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Mulai *</label>
                    <input
                      type="time"
                      value={newSchedule.timeStart}
                      onChange={(e) => setNewSchedule({ ...newSchedule, timeStart: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Selesai *</label>
                    <input
                      type="time"
                      value={newSchedule.timeEnd}
                      onChange={(e) => setNewSchedule({ ...newSchedule, timeEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                  <textarea
                    value={newSchedule.notes || ''}
                    onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Catatan tambahan (opsional)"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setError(null)
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  type="button"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddSchedule}
                  className="px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg transition-colors"
                  type="button"
                >
                  Tambahkan
                </button>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/schedule/upload')}
              className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              type="button"
            >
              Upload Ulang
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                saving || 
                schedules.length === 0 || 
                (isRecurring && (!recurrenceStartDate || !recurrenceEndDate || (recurrencePattern === 'weekly' && recurrenceDaysOfWeek.length === 0)))
              }
              type="button"
              className={`
                px-8 py-3 rounded-xl font-semibold text-white
                transition-all duration-300 flex items-center space-x-2
                ${
                  saving || 
                  schedules.length === 0 || 
                  (isRecurring && (!recurrenceStartDate || !recurrenceEndDate || (recurrencePattern === 'weekly' && recurrenceDaysOfWeek.length === 0)))
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg hover:shadow-xl'
                }
              `}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Konfirmasi Jadwal ({schedules.length})</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ReviewSchedule

