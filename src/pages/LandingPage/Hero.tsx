import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Enhanced Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Multiple animated circles for depth */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.2 + i * 0.1, 1],
              rotate: [0, 90 + i * 30, 0],
              x: [0, 50 + i * 20, 0],
              y: [0, 30 + i * 15, 0],
            }}
            transition={{
              duration: 15 + i * 2,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.5,
            }}
            className="absolute rounded-full bg-gradient-to-br opacity-30 blur-3xl"
            style={{
              top: `${20 + i * 15}%`,
              left: `${10 + i * 20}%`,
              width: `${72 + i * 20}px`,
              height: `${72 + i * 20}px`,
              background: `linear-gradient(to bottom right, rgba(59, 130, 246, ${0.3 - i * 0.05}), rgba(147, 197, 253, ${0.2 - i * 0.03}))`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex justify-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 max-w-3xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-full text-primary-blue"
            >
              <Sparkles size={16} />
              <span className="text-sm font-medium">AI-Powered Time Management</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
            >
              Kelola Waktu Anda{' '}
              <motion.span
                className="bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent inline-block"
                animate={{
                  backgroundPosition: ['0%', '100%', '0%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{
                  backgroundSize: '200% 200%',
                }}
              >
                Lebih Mudah
              </motion.span>{' '}
              dengan Bantuan AI
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-600 leading-relaxed"
            >
              EaseTime membantu Anda mengatur jadwal dengan mudah menggunakan teknologi AI. 
              Upload jadwal, dapatkan reminder otomatis, dan kelola waktu Anda dengan lebih efisien.
            </motion.p>

            {/* CTA Buttons with enhanced animations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.a
                href="#features"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="relative flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-300 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow font-medium overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                />
                <span className="relative z-10">Mulai Sekarang</span>
                <ArrowRight size={20} className="relative z-10" />
              </motion.a>

              <motion.a
                href="#features"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center space-x-2 px-8 py-4 bg-white text-primary-blue border-2 border-primary-blue rounded-xl hover:bg-blue-50 transition-colors font-medium relative overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                />
                <span className="relative z-10">Lihat Fitur</span>
              </motion.a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Hero

