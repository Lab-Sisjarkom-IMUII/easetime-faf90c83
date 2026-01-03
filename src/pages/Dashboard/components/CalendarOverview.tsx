import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useScheduleStore } from '../../../stores/useScheduleStore'
import { getDayShort, isToday } from '../../../utils/formatDate'

const CalendarOverview = () => {
  const { weekSchedules } = useScheduleStore()
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const getWeekDates = () => {
    const dates: Date[] = []
    const startOfWeek = new Date(currentWeek)
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay())
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const getScheduleCount = (date: string) => {
    return weekSchedules.filter((s) => s.date === date).length
  }

  const weekDates = getWeekDates()

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek)
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeek(newDate)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="text-blue-500" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Minggu Ini</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next week"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, index) => {
          const dateStr = date.toISOString().split('T')[0]
          const count = getScheduleCount(dateStr)
          const isTodayDate = isToday(dateStr)

          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {}}
              className={`
                flex flex-col items-center p-3 rounded-lg
                transition-all
                ${isTodayDate ? 'bg-blue-500 text-white' : 'bg-gray-50 hover:bg-gray-100'}
              `}
            >
              <span className="text-xs font-medium mb-1">{getDayShort(dateStr)}</span>
              <span className={`text-lg font-bold mb-1 ${isTodayDate ? 'text-white' : 'text-gray-900'}`}>
                {date.getDate()}
              </span>
              {count > 0 && (
                <span className={`text-xs ${isTodayDate ? 'text-white' : 'text-blue-500'}`}>
                  {count} jadwal
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarOverview

