/**
 * Format date utilities for Indonesian timezone (WIB)
 */

export const formatDate = (dateString: string, format: 'short' | 'long' | 'time' = 'short'): string => {
  const date = new Date(dateString)
  
  if (format === 'time') {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  if (format === 'long') {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  
  // short format
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const formatDateTime = (dateString: string, timeString: string): string => {
  const date = new Date(dateString)
  const [hours, minutes] = timeString.split(':')
  date.setHours(parseInt(hours), parseInt(minutes))
  
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':')
  return `${hours}:${minutes}`
}

export const isToday = (dateString: string): boolean => {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export const isThisWeek = (dateString: string): boolean => {
  const date = new Date(dateString)
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)
  
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  
  return date >= weekStart && date <= weekEnd
}

export const getDayName = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { weekday: 'long' })
}

export const getDayShort = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { weekday: 'short' })
}

