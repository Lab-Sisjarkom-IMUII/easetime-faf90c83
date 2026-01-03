import { Calendar, Clock, Repeat } from 'lucide-react'
import { motion } from 'framer-motion'
import { useScheduleStore } from '../../../stores/useScheduleStore'

const SummaryCards = () => {
  const { stats } = useScheduleStore()

  const cards = [
    {
      id: 'today',
      title: 'Hari Ini',
      value: stats?.today || 0,
      icon: Calendar,
      gradient: 'from-blue-500 to-blue-400',
    },
    {
      id: 'week',
      title: 'Minggu Ini',
      value: stats?.week || 0,
      icon: Clock,
      gradient: 'from-blue-400 to-blue-300',
    },
    {
      id: 'recurring',
      title: 'Berulang',
      value: stats?.recurring || 0,
      icon: Repeat,
      gradient: 'from-blue-300 to-blue-200',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1, type: 'spring', stiffness: 100 }}
          whileHover={{ scale: 1.05, y: -8 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden group"
        >
          {/* Hover gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            initial={false}
          />
          
          <div className={`w-14 h-14 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center mb-4 relative z-10`}>
            <card.icon className="text-white" size={28} />
          </div>
          
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-600 mb-2">{card.title}</p>
            <p className="text-4xl font-bold text-gray-900">{card.value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default SummaryCards

