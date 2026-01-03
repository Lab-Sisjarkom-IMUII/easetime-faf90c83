import { motion } from 'framer-motion'
import { Upload, MessageCircle, Calendar, Bell } from 'lucide-react'

const Features = () => {
  const features = [
    {
      icon: Upload,
      title: 'Scan & Upload Jadwal (AI)',
      description: 'Upload foto jadwal Anda dan biarkan AI yang memprosesnya secara otomatis. Cepat, akurat, dan mudah.',
      color: 'from-blue-500 to-blue-400',
    },
    {
      icon: MessageCircle,
      title: 'Chatbot Pintar',
      description: 'Tanyakan apapun tentang jadwal Anda melalui chatbot AI yang siap membantu 24/7.',
      color: 'from-blue-400 to-blue-300',
    },
    {
      icon: Calendar,
      title: 'Jadwal Manual',
      description: 'Tambahkan atau edit jadwal secara manual dengan antarmuka yang intuitif dan mudah digunakan.',
      color: 'from-blue-300 to-blue-200',
    },
    {
      icon: Bell,
      title: 'Reminder via WhatsApp',
      description: 'Dapatkan pengingat jadwal langsung ke WhatsApp Anda. Tidak perlu aplikasi tambahan.',
      color: 'from-blue-200 to-blue-100',
    },
  ]

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Fitur Unggulan
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Semua yang Anda butuhkan untuk mengelola waktu dengan lebih efisien
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1, type: 'spring', stiffness: 100 }}
                whileHover={{ scale: 1.05, y: -8, rotate: [0, -2, 2, 0] }}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden group"
              >
                {/* Hover gradient overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                />
                
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 relative z-10`}
                >
                  <Icon className="text-white" size={28} />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2 relative z-10">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed relative z-10">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Features
