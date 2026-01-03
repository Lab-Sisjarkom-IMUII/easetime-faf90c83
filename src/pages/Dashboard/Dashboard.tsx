import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useFetchSchedules } from '../../hooks/useFetchSchedules'
import { useScheduleStore } from '../../stores/useScheduleStore'
import { useRecommendationStore } from '../../stores/recommendationStore'
import { scheduleApi } from '../../services/api'
import { Schedule } from '../../types/schedule'
import { ProductivityTrendPoint } from '../../types/analytics'
import { reminderScheduler } from '../../services/reminderScheduler'
import { recommendationApi } from '../../lib/recommendationApi'
import { supabase } from '../../lib/supabase'
import Header from './components/Header'
import QuickActions from './components/QuickActions'
import SummaryCards from './components/SummaryCards'
import ProductivityTrendChart from './components/ProductivityTrendChart'
import CalendarOverview from './components/CalendarOverview'
import ScheduleList from './components/ScheduleList'
import CreateScheduleModal from './components/CreateScheduleModal'
import PreviewScheduleModal from './components/PreviewScheduleModal'

const Dashboard = () => {
  const navigate = useNavigate()
  const { fetchAll, fetchStats } = useFetchSchedules()
  const { schedules, error } = useScheduleStore()
  const { recommendations, setRecommendations } = useRecommendationStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewSchedule, setPreviewSchedule] = useState<Schedule | null>(null)
  const [trendData, setTrendData] = useState<ProductivityTrendPoint[]>([])
  const [trendLoading, setTrendLoading] = useState(false)

  // Fetch schedules and stats on mount
  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      try {
        console.log('🔄 Dashboard - Loading schedules and stats...')
        await Promise.all([
          fetchAll({ sort: 'nearest' }),
          fetchStats()
        ])
        if (mounted) {
          console.log('✅ Dashboard - Data loaded successfully')
        }
      } catch (error) {
        console.error('❌ Dashboard - Error loading data:', error)
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Load pending recommendations on mount
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const recs = await recommendationApi.getRecommendations(user.id, 'PENDING')
        setRecommendations(recs.slice(0, 3)) // Show only first 3
      } catch (error) {
        console.error('Error loading recommendations:', error)
      }
    }

    loadRecommendations()
  }, [setRecommendations])

  // Schedule reminders when schedules change
  useEffect(() => {
    if (schedules.length > 0) {
      reminderScheduler.scheduleReminders(schedules)
    }
    return () => {
      reminderScheduler.clearAll()
    }
  }, [schedules])

  const handlePreview = (schedule: Schedule) => {
    setPreviewSchedule(schedule)
    setShowPreviewModal(true)
  }

  const handleCreateSuccess = () => {
    fetchAll({ sort: 'nearest' })
    fetchStats()
  }

  const loadTrend = async () => {
    setTrendLoading(true)
    try {
      const trend = await scheduleApi.getProductivityTrend(30)
      setTrendData(trend.points)
    } catch (error) {
      console.error('Error loading productivity trend:', error)
    } finally {
      setTrendLoading(false)
    }
  }

  // Load productivity trend
  useEffect(() => {
    loadTrend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Selamat Datang! 👋
          </h1>
          <p className="text-gray-600 text-lg">
            Kelola jadwal Anda dengan mudah dan efisien
          </p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Quick Actions - Only Main Features */}
        <QuickActions
          onScanSchedule={() => navigate('/schedule/upload')}
          onOpenChatbot={() => navigate('/chatbot')}
          onViewAll={() => navigate('/schedules/all')}
        />

        {/* Summary Cards - Enhanced */}
        <SummaryCards />

        {/* Productivity Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <ProductivityTrendChart
            data={trendData}
            loading={trendLoading}
            onRefresh={loadTrend}
          />
        </motion.div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="text-blue-600" size={24} />
                  Rekomendasi Jadwal
                </h2>
                <Link
                  to="/recommendations"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Lihat Semua →
                </Link>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Anda memiliki {recommendations.length} rekomendasi jadwal yang menunggu konfirmasi
              </p>
              <Link
                to="/recommendations"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Lihat Rekomendasi
              </Link>
            </div>
          </motion.div>
        )}

        {/* Main Content: 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Left: Schedule List (2/3 width) */}
          <div className="lg:col-span-2">
            <ScheduleList onPreview={handlePreview} />
          </div>

          {/* Right: Calendar (1/3 width) */}
          <div className="lg:col-span-1">
            <CalendarOverview />
          </div>
        </div>

        {/* Modals */}
        <CreateScheduleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />

        <PreviewScheduleModal
          schedule={previewSchedule}
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false)
            setPreviewSchedule(null)
          }}
        />

      </div>
    </div>
  )
}

export default Dashboard

