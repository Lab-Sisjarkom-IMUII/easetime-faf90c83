import { motion } from 'framer-motion'
import { LogIn, Upload, CheckCircle, Bell } from 'lucide-react'

const HowItWorks = () => {
  const steps = [
    {
      icon: LogIn,
      title: 'Login',
      description: 'Daftar atau login ke akun EaseTime Anda dengan mudah',
      step: '01',
    },
    {
      icon: Upload,
      title: 'Upload/Scan Jadwal',
      description: 'Upload foto jadwal atau scan dokumen jadwal Anda',
      step: '02',
    },
    {
      icon: CheckCircle,
      title: 'Konfirmasi',
      description: 'Review dan konfirmasi jadwal yang telah diproses AI',
      step: '03',
    },
    {
      icon: Bell,
      title: 'Reminder Otomatis',
      description: 'Dapatkan reminder otomatis melalui WhatsApp',
      step: '04',
    },
  ]

  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Cara Kerja
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hanya dalam 4 langkah sederhana, jadwal Anda sudah terkelola dengan baik
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '0px' }}
                transition={{ duration: 0.6, delay: index * 0.15, type: 'spring', stiffness: 100 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative"
              >
                {/* Step Number */}
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-300 rounded-full flex items-center justify-center shadow-lg z-10">
                  <span className="text-white font-bold text-lg">{step.step}</span>
                </div>

                {/* Card with hover effect */}
                <motion.div
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm pt-12 hover:shadow-xl transition-all relative overflow-hidden group"
                  whileHover={{ borderColor: 'rgb(59, 130, 246)' }}
                >
                  {/* Hover gradient */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  />
                  
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-300 rounded-xl flex items-center justify-center mb-4 relative z-10">
                    <Icon className="text-white" size={32} />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 relative z-10">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed relative z-10">
                    {step.description}
                  </p>
                </motion.div>

                {/* Animated Connector Line */}
                {index < steps.length - 1 && (
                  <motion.div
                    className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-blue-300 to-blue-200 -z-0"
                    style={{ width: 'calc(100% - 2rem)' }}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: '0px' }}
                    transition={{ duration: 0.5, delay: index * 0.15 + 0.3 }}
                  />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
