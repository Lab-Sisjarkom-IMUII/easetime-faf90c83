// Reminder Scheduler Service
// Handles scheduling and triggering reminders for schedules

import { Schedule } from '../types/schedule'
import { notificationService } from './notificationService'

interface ScheduledReminder {
  scheduleId: string
  timeoutId: NodeJS.Timeout
  reminderTime: Date
}

class ReminderScheduler {
  private scheduledReminders: Map<string, ScheduledReminder> = new Map()

  /**
   * Schedule reminders for recurring schedules
   * Creates reminders for all occurrences until recurrenceEndDate
   */
  scheduleRecurringReminders(schedule: Schedule): void {
    if (!schedule.reminderEnabled || !schedule.reminderMinutesBefore || !schedule.isRecurring) {
      return
    }

    if (!schedule.recurrenceStartDate || !schedule.recurrenceEndDate) {
      console.warn(`⚠️ Recurring schedule "${schedule.title}" missing start/end dates`)
      return
    }

    const startDate = new Date(schedule.recurrenceStartDate)
    const endDate = new Date(schedule.recurrenceEndDate)
    const now = new Date()

    // Generate reminders for each occurrence
    let currentDate = new Date(startDate)
    let occurrenceCount = 0
    const [hours, minutes] = schedule.timeStart.split(':').map(Number)

    while (currentDate <= endDate) {
      // Check if this day matches the recurrence pattern
      let shouldSchedule = false

      if (schedule.recurrencePattern === 'daily') {
        shouldSchedule = true
      } else if (schedule.recurrencePattern === 'weekly' && schedule.recurrenceDaysOfWeek) {
        const dayOfWeek = currentDate.getDay()
        shouldSchedule = schedule.recurrenceDaysOfWeek.includes(dayOfWeek)
      } else if (schedule.recurrencePattern === 'monthly') {
        // Same day of month
        shouldSchedule = currentDate.getDate() === startDate.getDate()
      }

      if (shouldSchedule) {
        // Create datetime for this occurrence
        const occurrenceDateTime = new Date(currentDate)
        occurrenceDateTime.setHours(hours, minutes, 0, 0)

        // Only schedule if occurrence is in the future
        if (occurrenceDateTime > now) {
          const reminderTime = new Date(
            occurrenceDateTime.getTime() - schedule.reminderMinutesBefore! * 60 * 1000
          )

          // Only schedule if reminder time is in the future
          if (reminderTime > now) {
            const timeUntilReminder = reminderTime.getTime() - Date.now()
            const reminderId = schedule.id ? `${schedule.id}_${occurrenceCount}` : `temp_${occurrenceCount}`

            console.log(
              `⏰ Scheduling reminder ${occurrenceCount + 1} for "${schedule.title}" on ${occurrenceDateTime.toISOString()}`
            )

            const timeoutId = setTimeout(() => {
              this.triggerReminder(schedule)
              this.scheduledReminders.delete(reminderId)
            }, timeUntilReminder)

            this.scheduledReminders.set(reminderId, {
              scheduleId: schedule.id || reminderId,
              timeoutId,
              reminderTime,
            })
          }
        }

        occurrenceCount++
      }

      // Move to next occurrence
      if (schedule.recurrencePattern === 'daily') {
        currentDate.setDate(currentDate.getDate() + 1)
      } else if (schedule.recurrencePattern === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7)
      } else if (schedule.recurrencePattern === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }

    console.log(`✅ Scheduled ${occurrenceCount} reminders for recurring schedule "${schedule.title}"`)
  }

  /**
   * Schedule a reminder for a schedule
   */
  scheduleReminder(schedule: Schedule): void {
    if (!schedule.reminderEnabled || !schedule.reminderMinutesBefore) {
      return
    }

    // Cancel existing reminders
    if (schedule.id) {
      this.cancelReminder(schedule.id)
    }

    if (schedule.isRecurring && schedule.recurrencePattern && schedule.recurrencePattern !== 'none') {
      // For recurring schedules, schedule all occurrences
      this.scheduleRecurringReminders(schedule)
    } else {
      // For single schedules, schedule one reminder
      const scheduleDateTime = new Date(`${schedule.date}T${schedule.timeStart}`)
      const reminderTime = new Date(
        scheduleDateTime.getTime() - schedule.reminderMinutesBefore! * 60 * 1000
      )

      if (reminderTime < new Date()) {
        console.log(`⏰ Reminder time for "${schedule.title}" is in the past, skipping`)
        return
      }

      const timeUntilReminder = reminderTime.getTime() - Date.now()
      const reminderId = schedule.id || `temp_${Date.now()}`

      console.log(
        `⏰ Scheduling reminder for "${schedule.title}" in ${Math.round(timeUntilReminder / 1000 / 60)} minutes`
      )

      const timeoutId = setTimeout(() => {
        this.triggerReminder(schedule)
        this.scheduledReminders.delete(reminderId)
      }, timeUntilReminder)

      this.scheduledReminders.set(reminderId, {
        scheduleId: schedule.id || reminderId,
        timeoutId,
        reminderTime,
      })
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  cancelReminder(scheduleId: string | undefined): void {
    if (!scheduleId) return

    const reminder = this.scheduledReminders.get(scheduleId)
    if (reminder) {
      clearTimeout(reminder.timeoutId)
      this.scheduledReminders.delete(scheduleId)
      console.log(`⏰ Cancelled reminder for schedule: ${scheduleId}`)
    }
  }

  /**
   * Trigger a reminder notification
   */
  private async triggerReminder(schedule: Schedule): Promise<void> {
    console.log(`⏰ Triggering reminder for: ${schedule.title}`)

    await notificationService.showScheduleReminder(
      schedule.title,
      schedule.timeStart,
      schedule.location || '', // Location is optional
      schedule.reminderMinutesBefore || 0
    )
  }

  /**
   * Schedule reminders for multiple schedules
   */
  scheduleReminders(schedules: Schedule[]): void {
    schedules.forEach((schedule) => {
      if (schedule.reminderEnabled && schedule.reminderMinutesBefore) {
        this.scheduleReminder(schedule)
      }
    })
  }

  /**
   * Clear all scheduled reminders
   */
  clearAll(): void {
    this.scheduledReminders.forEach((reminder) => {
      clearTimeout(reminder.timeoutId)
    })
    this.scheduledReminders.clear()
    console.log('⏰ Cleared all scheduled reminders')
  }

  /**
   * Get all scheduled reminders
   */
  getScheduledReminders(): ScheduledReminder[] {
    return Array.from(this.scheduledReminders.values())
  }
}

export const reminderScheduler = new ReminderScheduler()

