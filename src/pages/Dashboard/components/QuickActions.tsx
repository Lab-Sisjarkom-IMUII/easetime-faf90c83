import { Upload, MessageCircle, ListChecks } from 'lucide-react'
import { motion } from 'framer-motion'

interface QuickActionsProps {
  onScanSchedule: () => void
  onOpenChatbot: () => void
  onViewAll?: () => void
}

const QuickActions = ({
  onScanSchedule,
  onOpenChatbot,
  onViewAll,
}: QuickActionsProps) => {
  const actions = [
    {
      id: 'scan',
      label: 'Scan Jadwal',
      icon: Upload,
      onClick: onScanSchedule,
      gradient: 'from-blue-500 to-blue-300',
      hoverGradient: 'from-blue-600 to-blue-400',
      description: 'Upload & scan file jadwal',
    },
    {
      id: 'chatbot',
      label: 'Chatbot',
      icon: MessageCircle,
      onClick: onOpenChatbot,
      gradient: 'from-blue-400 to-blue-300',
      hoverGradient: 'from-blue-500 to-blue-400',
      description: 'Tanya AI tentang jadwal',
    },
    {
      id: 'all',
      label: 'Lihat Semua Jadwal',
      icon: ListChecks,
      onClick: onViewAll || (() => {}),
      gradient: 'from-blue-300 to-blue-200',
      hoverGradient: 'from-blue-400 to-blue-300',
      description: 'Kelola & hapus banyak jadwal',
    },
  ]

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={action.onClick}
            type="button"
            className={`relative flex items-center space-x-4 p-6 bg-gradient-to-r ${action.gradient} text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow font-medium overflow-hidden group`}
          >
            <motion.div
              className={`absolute inset-0 bg-gradient-to-r ${action.hoverGradient} opacity-0 group-hover:opacity-100 transition-opacity`}
              initial={false}
            />
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors relative z-10">
              <action.icon size={24} />
            </div>
            <div className="flex-1 text-left relative z-10">
              <div className="font-semibold text-lg mb-1">{action.label}</div>
              <div className="text-sm text-white/80">{action.description}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default QuickActions

