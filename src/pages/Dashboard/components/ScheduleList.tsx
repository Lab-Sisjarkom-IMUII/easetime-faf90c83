import { useMemo } from 'react'
import { Clock, Calendar, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useScheduleStore } from '../../../stores/useScheduleStore'
import { formatDate, formatTime, isToday } from '../../../utils/formatDate'
import { Schedule, ScheduleCategory } from '../../../types/schedule'

// Helper functions for category display
const getCategoryColor = (category?: ScheduleCategory) => {
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
      return 'bg-blue-100 text-blue-700'
  }
}

const getCategoryLabel = (category?: ScheduleCategory) => {
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

interface ScheduleListProps {
  onPreview: (schedule: Schedule) => void
}

const ScheduleList = ({ onPreview }: ScheduleListProps) => {
  const navigate = useNavigate()
  const { schedules, loading } = useScheduleStore()

  // Kategorikan jadwal menjadi "Hari Ini" dan "Akan Datang"
  // Akan Datang: hanya tanggal terdekat berikutnya (1 hari ke depan dengan jadwal) agar tidak terlalu penuh
  const { todaySchedules, upcomingSchedules } = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Filter: hanya jadwal hari ini dan yang akan datang (>= hari ini)
    const allUpcoming = schedules
      .filter((schedule) => {
        try {
          const scheduleDate = new Date(schedule.date)
          scheduleDate.setHours(0, 0, 0, 0)
          
          // Pastikan tanggal valid
          if (isNaN(scheduleDate.getTime())) {
            console.warn('⚠️ Invalid date for schedule:', schedule.title, schedule.date)
            return false
          }
          
          // Hanya ambil jadwal hari ini atau yang akan datang
          return scheduleDate >= today
        } catch (error) {
          console.error('❌ Error filtering schedule:', schedule, error)
          return false
        }
      })
      .sort((a, b) => {
        try {
          const dateA = new Date(`${a.date}T${a.timeStart}`).getTime()
          const dateB = new Date(`${b.date}T${b.timeStart}`).getTime()
          return dateA - dateB // Sort by nearest
        } catch (error) {
          console.error('❌ Error sorting schedules:', error)
          return 0
        }
      })

    // Pisahkan menjadi "Hari Ini" dan "Akan Datang"
    const todayList = allUpcoming.filter((s) => {
      try {
        return isToday(s.date)
      } catch (error) {
        return false
      }
    })
    
    // Hitung tanggal besok (1 hari setelah hari ini)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    // Filter hanya jadwal yang benar-benar besok (1 hari setelah hari ini)
    const nextSchedules = allUpcoming.filter((s) => {
      try {
        const scheduleDate = new Date(s.date)
        scheduleDate.setHours(0, 0, 0, 0)
        // Hanya ambil jadwal yang tanggalnya sama dengan besok
        return scheduleDate.getTime() === tomorrow.getTime()
      } catch (error) {
        return false
      }
    })

    console.log('📊 ScheduleList - Filtered schedules:', {
      total: schedules.length,
      allUpcoming: allUpcoming.length,
      today: todayList.length,
      tomorrow: tomorrow.toISOString().split('T')[0],
      nextSchedules: nextSchedules.length,
      note: 'Showing today and tomorrow (1 day after) only'
    })

    return {
      todaySchedules: todayList,
      upcomingSchedules: nextSchedules, // jadwal besok (1 hari setelah hari ini)
    }
  }, [schedules])

  const totalSchedules = todaySchedules.length + upcomingSchedules.length

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <Loader2 className="mx-auto text-blue-500 mb-4 animate-spin" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Memuat jadwal...</h3>
        <p className="text-gray-600">Mohon tunggu sebentar</p>
      </div>
    )
  }

  // Empty state
  if (totalSchedules === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada jadwal</h3>
        <p className="text-gray-600 mb-4">
          {schedules.length === 0 
            ? 'Mulai dengan menambahkan jadwal baru atau scan jadwal dari file'
            : 'Tidak ada jadwal hari ini atau jadwal terdekat yang akan datang'}
        </p>
        <button
          onClick={() => navigate('/schedules/category')}
          className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
          type="button"
        >
          Lihat semua jadwal
        </button>
      </div>
    )
  }

  const renderScheduleItem = (schedule: Schedule, index: number) => (
    <motion.div
      key={schedule.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden group"
      onClick={() => onPreview(schedule)}
    >
      {/* Hover gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        initial={false}
      />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">{schedule.title}</h3>
            {schedule.category && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(schedule.category)}`}>
                {getCategoryLabel(schedule.category)}
              </span>
            )}
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Calendar size={16} />
              <span>{formatDate(schedule.date, 'long')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={16} />
              <span>{formatTime(schedule.timeStart)} - {formatTime(schedule.timeEnd)}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Jadwal Hari Ini */}
      {todaySchedules.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-900">Hari Ini</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {todaySchedules.length}
            </span>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {todaySchedules.map((schedule, index) => renderScheduleItem(schedule, index))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Jadwal Akan Datang (jadwal terdekat berikutnya yang ada eventnya) */}
      {upcomingSchedules.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-1 h-6 bg-green-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-900">Akan Datang</h2>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {upcomingSchedules.length}
            </span>
            {upcomingSchedules.length > 0 && (
              <span className="text-sm text-gray-500">
                ({formatDate(upcomingSchedules[0].date, 'short')})
              </span>
            )}
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {upcomingSchedules.map((schedule, index) => renderScheduleItem(schedule, index))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleList

