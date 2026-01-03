import { motion } from 'framer-motion'
import { User, Bot, Loader2 } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '../../../types/chatbot'

interface ChatMessageProps {
  message: ChatMessageType
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.type === 'user'
  const isSystem = message.type === 'system'
  const isLoading = message.type === 'assistant' && message.content === 'loading'

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-4"
      >
        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700">
          {message.content}
        </div>
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start space-x-3 mb-4"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="text-white" size={18} />
        </div>
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-2">
            <Loader2 className="animate-spin text-blue-500" size={20} />
            <span className="text-gray-600">Memproses pesan Anda...</span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start space-x-3 mb-4 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-400'
            : 'bg-gradient-to-br from-gray-100 to-gray-200'
        }`}
      >
        {isUser ? (
          <User className="text-white" size={18} />
        ) : (
          <Bot className="text-gray-600" size={18} />
        )}
      </div>
      <div
        className={`flex-1 rounded-2xl p-4 shadow-sm max-w-[80%] ${
          isUser
            ? 'bg-gradient-to-r from-blue-500 to-blue-300 text-white'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {message.clarificationQuestion && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-sm font-medium text-blue-700 mb-1">❓ Pertanyaan klarifikasi:</p>
            <p className="text-sm text-blue-600">{message.clarificationQuestion}</p>
          </div>
        )}
        <p className="text-xs opacity-70 mt-2">
          {new Date(message.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  )
}

export default ChatMessage

