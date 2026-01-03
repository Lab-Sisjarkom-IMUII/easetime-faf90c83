import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const CTA = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-500 to-blue-300 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
          className="space-y-6"
        >
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight"
            animate={{
              textShadow: [
                '0 0 20px rgba(255,255,255,0.3)',
                '0 0 30px rgba(255,255,255,0.5)',
                '0 0 20px rgba(255,255,255,0.3)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Mulai Atur Jadwal Anda{' '}
            <motion.span
              className="block"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              Lebih Mudah Dari Sekarang
            </motion.span>
          </motion.h2>
          
          <motion.p
            className="text-xl text-blue-50 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '0px' }}
            transition={{ delay: 0.3 }}
          >
            Bergabunglah dengan ribuan pengguna yang telah mempercayai EaseTime untuk mengelola waktu mereka
          </motion.p>
          
          <motion.a
            href="/auth/login"
            whileHover={{ scale: 1.08, y: -3 }}
            whileTap={{ scale: 0.95 }}
            className="relative inline-flex items-center space-x-2 px-8 py-4 bg-white text-primary-blue rounded-xl shadow-xl hover:shadow-2xl transition-all font-semibold text-lg overflow-hidden group"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity"
              initial={false}
            />
            <span className="relative z-10">Coba EaseTime Gratis</span>
            <ArrowRight size={24} className="relative z-10" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}

export default CTA

