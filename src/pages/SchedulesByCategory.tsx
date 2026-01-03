import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Filter, Search } from 'lucide-react'
import { useScheduleStore } from '../stores/useScheduleStore'
import { useFetchSchedules } from '../hooks/useFetchSchedules'
import { Schedule, ScheduleCategory } from '../types/schedule'
import SchedulePreviewCard from '../components/SchedulePreviewCard'
import { scheduleApi } from '../services/api'

// Helper function for category display
const getCategoryLabel = (category?: string) => {
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

const SchedulesByCategory = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') as ScheduleCategory | null
  const { schedules, setSchedules } = useScheduleStore()
  const { fetchAll } = useFetchSchedules()
  const [selectedCategory, setSelectedCategory] = useState<ScheduleCategory | 'all'>(categoryParam || 'all')
  const [filterType, setFilterType] = useState<'all' | 'recurring' | 'once' | 'expired'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    
    const loadSchedules = async () => {
      try {
        await fetchAll()
      } catch (error) {
        console.error('Error loading schedules:', error)
      }
    }
    
    if (mounted) {
      loadSchedules()
    }
    
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty array - hanya sekali saat mount

  const categories: { value: ScheduleCategory | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'Semua', color: 'bg-gray-100 text-gray-700' },
    { value: 'academic', label: 'Akademik', color: 'bg-blue-100 text-blue-700' },
    { value: 'event', label: 'Event', color: 'bg-purple-100 text-purple-700' },
    { value: 'personal', label: 'Personal', color: 'bg-green-100 text-green-700' },
    { value: 'work', label: 'Kerja', color: 'bg-orange-100 text-orange-700' },
    { value: 'other', label: 'Lainnya', color: 'bg-gray-100 text-gray-700' },
  ]

  const filteredSchedules = schedules.filter((schedule) => {
    // Filter by category
    if (selectedCategory !== 'all' && schedule.category !== selectedCategory) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!schedule.title.toLowerCase().includes(query) &&
          !schedule.location?.toLowerCase().includes(query) &&
          !schedule.notes?.toLowerCase().includes(query)) {
        return false
      }
    }

    // Filter by type
    const now = new Date()
    const scheduleDate = new Date(schedule.date)
    
    if (filterType === 'recurring') {
      return schedule.isRecurring === true
    } else if (filterType === 'once') {
      return schedule.isRecurring === false
    } else if (filterType === 'expired') {
      return scheduleDate < now
    }
    
    return true // 'all'
  })

  const handleUpdate = async (_filteredIndex: number, updated: Schedule) => {
    if (!updated.id) return

    try {
      await scheduleApi.updateSchedule(updated.id, updated)
      setSchedules(schedules.map(s => s.id === updated.id ? updated : s))
      setEditingCardIndex(null)
    } catch (error: any) {
      console.error('Error updating schedule:', error)
      alert('Gagal mengupdate jadwal: ' + error.message)
    }
  }

  const handleDelete = async (index: number) => {
    const schedule = filteredSchedules[index]
    if (!schedule.id) return

    if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
      try {
        await scheduleApi.deleteSchedule(schedule.id)
        setSchedules(schedules.filter(s => s.id !== schedule.id))
      } catch (error: any) {
        console.error('Error deleting schedule:', error)
        alert('Gagal menghapus jadwal: ' + error.message)
      }
    }
  }

  const handleEditStart = (index: number) => {
    setEditingCardIndex(index)
  }

  const handleEditCancel = () => {
    setEditingCardIndex(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            type="button"
          >
            <ArrowLeft size={20} />
            <span>Kembali ke Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Jadwal per Kategori</h1>
          <p className="text-gray-600">Lihat dan kelola jadwal berdasarkan kategori</p>
        </div>

        {/* Filters */}
        <div className="bg-blue-50 rounded-xl shadow-lg border border-blue-100 p-6 mb-6">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari jadwal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <div className="flex items-center space-x-2">
              <Filter size={20} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Kategori:</span>
            </div>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value as ScheduleCategory | 'all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? cat.color + ' ring-2 ring-offset-2 ring-blue-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            {['all', 'recurring', 'once', 'expired'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filterType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                type="button"
              >
                {type === 'all' ? 'Semua' : type === 'recurring' ? 'Berulang' : type === 'once' ? 'Sekali' : 'Expired'}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Menampilkan <span className="font-semibold">{filteredSchedules.length}</span> jadwal
            {selectedCategory !== 'all' && ` dalam kategori "${getCategoryLabel(selectedCategory)}"`}
          </p>
        </div>

        {/* Schedules List */}
        <div className="space-y-4">
          {filteredSchedules.length > 0 ? (
            filteredSchedules.map((schedule, filteredIndex) => (
              <div key={schedule.id || filteredIndex} id={`schedule-card-${filteredIndex}`}>
                <SchedulePreviewCard
                  schedule={schedule}
                  index={filteredIndex}
                  onUpdate={handleUpdate}
                  onDelete={() => handleDelete(filteredIndex)}
                  isEditing={editingCardIndex === filteredIndex}
                  onEditStart={() => handleEditStart(filteredIndex)}
                  onEditCancel={handleEditCancel}
                />
              </div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-blue-50 rounded-xl border border-blue-200"
            >
              <p className="text-gray-500 text-lg">Tidak ada jadwal ditemukan</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchQuery ? 'Coba ubah kata kunci pencarian' : 'Coba pilih kategori lain'}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SchedulesByCategory

