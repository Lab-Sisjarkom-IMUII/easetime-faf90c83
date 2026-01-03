import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MessageCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useChatbotStore } from '../../stores/chatbotStore'
import { chatbotApi } from '../../lib/chatbotApi'
import { ChatMessage as ChatMessageType, ParsedSchedule } from '../../types/chatbot'
import ChatInput from './components/ChatInput'
import ChatMessageComponent from './components/ChatMessage'
import SchedulePreviewCard from './components/SchedulePreviewCard'

const QUICK_BUTTONS = [
  "Bangunkan saya jam 09.00",
  "Ingatkan saya besok jam 07.30 untuk kuliah",
  "Jadwal meeting lusa jam 14.00",
]

const ChatbotPage = () => {
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const greetingSentRef = useRef(false)
  const {
    messages,
    isLoading,
    error,
    previewSchedules,
    editingScheduleIndex,
    addMessage,
    setLoading,
    setError,
    addPreviewSchedules,
    updatePreviewSchedule,
    removePreviewSchedule,
    setEditingScheduleIndex,
  } = useChatbotStore()

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, previewSchedules])

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0 && !greetingSentRef.current) {
      greetingSentRef.current = true
      const greeting: ChatMessageType = {
        id: 'greeting',
        type: 'assistant',
        content: 'Halo! Tinggal bilang saja, nanti kubantu buatkan jadwal atau pengingat.',
        timestamp: new Date(),
      }
      addMessage(greeting)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  const handleSendMessage = async (messageText: string) => {
    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    }
    addMessage(userMessage)

    // Add loading message
    const loadingMessage: ChatMessageType = {
      id: `loading-${Date.now()}`,
      type: 'assistant',
      content: 'loading',
      timestamp: new Date(),
    }
    addMessage(loadingMessage)
    setLoading(true)
    setError(null)

    try {
      // Parse message
      const parseResult = await chatbotApi.parseMessage(messageText)

      // Remove loading message
      const currentMessages = useChatbotStore.getState().messages
      const updatedMessages = currentMessages.filter((m) => m.id !== loadingMessage.id)
      useChatbotStore.setState({ messages: updatedMessages })

      if (!parseResult.success) {
        setError(parseResult.error || 'Gagal memproses pesan')
        const errorMessage: ChatMessageType = {
          id: `error-${Date.now()}`,
          type: 'assistant',
          content: `Maaf, saya tidak dapat memproses pesan Anda. ${parseResult.error || 'Silakan coba lagi dengan format yang lebih jelas.'}`,
          timestamp: new Date(),
        }
        addMessage(errorMessage)
        return
      }

      // Handle clarification question
      if (parseResult.clarificationQuestion) {
        const clarificationMessage: ChatMessageType = {
          id: `clarification-${Date.now()}`,
          type: 'assistant',
          content: 'Saya perlu konfirmasi untuk beberapa detail:',
          clarificationQuestion: parseResult.clarificationQuestion,
          timestamp: new Date(),
        }
        addMessage(clarificationMessage)
      }

      // Add preview schedules
      if (parseResult.schedules.length > 0) {
        addPreviewSchedules(parseResult.schedules)
        const previewMessage: ChatMessageType = {
          id: `preview-${Date.now()}`,
          type: 'preview',
          content: `Saya menemukan ${parseResult.schedules.length} jadwal. Silakan periksa dan edit jika perlu sebelum mengonfirmasi.`,
          timestamp: new Date(),
        }
        addMessage(previewMessage)
      } else {
        const noScheduleMessage: ChatMessageType = {
          id: `no-schedule-${Date.now()}`,
          type: 'assistant',
          content: 'Saya tidak dapat menemukan informasi jadwal dari pesan Anda. Silakan coba dengan format yang lebih jelas, contoh: "ingatkan saya besok jam 09.00 untuk meeting"',
          timestamp: new Date(),
        }
        addMessage(noScheduleMessage)
      }
    } catch (error: any) {
      console.error('Error processing message:', error)
      const errorMsg = error.message || 'Terjadi kesalahan saat memproses pesan'
      setError(errorMsg)
      const errorMessage: ChatMessageType = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `Maaf, terjadi kesalahan: ${errorMsg}. Silakan pastikan backend API sudah dikonfigurasi dan coba lagi.`,
        timestamp: new Date(),
      }
      addMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickButton = (text: string) => {
    handleSendMessage(text)
  }

  const handleUpdateSchedule = (index: number, updated: ParsedSchedule) => {
    updatePreviewSchedule(index, updated)
    setEditingScheduleIndex(null)
  }

  const handleEditStart = (index: number) => {
    setEditingScheduleIndex(index)
  }

  const handleEditCancel = () => {
    setEditingScheduleIndex(null)
  }

  const handleDeleteSchedule = (index: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
      removePreviewSchedule(index)
    }
  }

  // Validasi field required sebelum menyimpan
  const validateSchedules = (schedules: ParsedSchedule[]): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = []
    
    schedules.forEach((schedule, index) => {
      const scheduleNum = schedules.length > 1 ? `Jadwal ${index + 1}` : 'Jadwal'
      
      if (!schedule.title || schedule.title.trim() === '') {
        missingFields.push(`${scheduleNum}: Judul`)
      }
      if (!schedule.dateStart || schedule.dateStart.trim() === '') {
        missingFields.push(`${scheduleNum}: Tanggal`)
      }
      if (!schedule.timeStart || schedule.timeStart.trim() === '') {
        missingFields.push(`${scheduleNum}: Waktu`)
      }
      if (!schedule.location || schedule.location.trim() === '') {
        missingFields.push(`${scheduleNum}: Lokasi`)
      }
    })
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    }
  }

  const handleConfirm = async () => {
    if (previewSchedules.length === 0) {
      setError('Tidak ada jadwal untuk dikonfirmasi')
      return
    }

    // Validasi field required
    const validation = validateSchedules(previewSchedules)
    if (!validation.isValid) {
      const missingFieldsText = validation.missingFields.join(', ')
      const errorMessage: ChatMessageType = {
        id: `validation-error-${Date.now()}`,
        type: 'assistant',
        content: `Sebelum menyimpan, saya perlu informasi berikut:\n\n${validation.missingFields.map(f => `• ${f}`).join('\n')}\n\nSilakan edit jadwal di atas atau beri tahu saya informasi yang kurang. Contoh: "lokasinya di ruang 301" atau "lokasinya online".`,
        timestamp: new Date(),
      }
      addMessage(errorMessage)
      setError(`Informasi kurang: ${missingFieldsText}`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await chatbotApi.confirmSchedules(previewSchedules)

      if (!result.success) {
        // Cek apakah error terkait field required di database
        if (result.error?.includes('null value') || result.error?.includes('NOT NULL') || result.error?.includes('violates not-null constraint')) {
          const dbErrorMessage: ChatMessageType = {
            id: `db-error-${Date.now()}`,
            type: 'assistant',
            content: `Sepertinya ada informasi yang kurang. ${result.error}\n\nSilakan edit jadwal dan pastikan semua field terisi, terutama lokasi. Jika tidak ada lokasi spesifik, Anda bisa menulis "Online", "Rumah", atau "TBD".`,
            timestamp: new Date(),
          }
          addMessage(dbErrorMessage)
        }
        setError(result.error || 'Gagal menyimpan jadwal')
        return
      }

      setSaveSuccess(true)
      
      // Clear preview schedules
      useChatbotStore.setState({ previewSchedules: [] })
      
      // Add success message
      const successMessage: ChatMessageType = {
        id: `success-${Date.now()}`,
        type: 'system',
        content: `✅ ${previewSchedules.length} jadwal berhasil disimpan!`,
        timestamp: new Date(),
      }
      addMessage(successMessage)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error confirming schedules:', error)
      setError(error.message || 'Terjadi kesalahan saat menyimpan jadwal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            type="button"
          >
            <ArrowLeft size={20} />
            <span>Kembali ke Dashboard</span>
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-400 rounded-xl flex items-center justify-center">
              <MessageCircle className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chatbot EaseTime</h1>
              <p className="text-sm text-gray-600">Buat jadwal dengan bahasa natural</p>
            </div>
          </div>
        </div>

        {/* Quick Buttons */}
        {messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <p className="text-sm text-gray-600 mb-2">Contoh pesan cepat:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_BUTTONS.map((text, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleQuickButton(text)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  type="button"
                >
                  {text}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Success Message */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg text-green-600 text-sm flex items-center space-x-2"
          >
            <CheckCircle2 size={20} />
            <span>Jadwal berhasil disimpan! Mengalihkan ke dashboard...</span>
          </motion.div>
        )}

        {/* Chat Messages */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 min-h-[400px] max-h-[600px] overflow-y-auto p-6">
          <AnimatePresence>
            {messages.map((message) => (
              <ChatMessageComponent key={message.id} message={message} />
            ))}
          </AnimatePresence>

          {/* Preview Schedules */}
          {previewSchedules.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Preview Jadwal ({previewSchedules.length})
              </h3>
              {previewSchedules.map((schedule, index) => (
                <SchedulePreviewCard
                  key={index}
                  schedule={schedule}
                  index={index}
                  isEditing={editingScheduleIndex === index}
                  onUpdate={handleUpdateSchedule}
                  onEditStart={handleEditStart}
                  onEditCancel={handleEditCancel}
                  onDelete={handleDeleteSchedule}
                />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Confirm Button */}
        {previewSchedules.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end mb-4"
          >
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  <span>Konfirmasi & Simpan ({previewSchedules.length})</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Chat Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading || saving}
          placeholder="Ketik pesan Anda, contoh: 'bangunkan saya jam 14.00'"
        />
      </div>
    </div>
  )
}

export default ChatbotPage

