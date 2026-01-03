// Browser Notification Service
// Handles browser notifications for schedule reminders

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
}

class NotificationService {
  private permission: NotificationPermission = 'default'

  constructor() {
    this.checkPermission()
  }

  /**
   * Check and request notification permission
   */
  async checkPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('⚠️ This browser does not support notifications')
      return 'denied'
    }

    this.permission = Notification.permission

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission()
    }

    return this.permission
  }

  /**
   * Check if notifications are supported and allowed
   */
  isSupported(): boolean {
    return 'Notification' in window
  }

  /**
   * Check if permission is granted
   */
  hasPermission(): boolean {
    return this.permission === 'granted'
  }

  /**
   * Show a notification
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('⚠️ Notifications not supported')
      return
    }

    const permission = await this.checkPermission()

    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission not granted')
      return
    }

    const notificationOptions: NotificationOptions = {
      icon: options.icon || '/pwa-192x192.png',
      badge: options.badge || '/pwa-192x192.png',
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      ...options,
    }

    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(options.title, {
        body: options.body,
        icon: notificationOptions.icon,
        badge: notificationOptions.badge,
        tag: notificationOptions.tag,
        requireInteraction: notificationOptions.requireInteraction,
        data: {
          url: window.location.origin + '/dashboard',
        },
      })
    } catch (error) {
      // Fallback to regular notification if service worker fails
      new Notification(options.title, {
        body: options.body,
        icon: notificationOptions.icon,
        badge: notificationOptions.badge,
        tag: notificationOptions.tag,
        requireInteraction: notificationOptions.requireInteraction,
      })
    }
  }

  /**
   * Show schedule reminder notification
   */
  async showScheduleReminder(
    scheduleTitle: string,
    scheduleTime: string,
    scheduleLocation: string, // Can be empty string if location not available
    minutesBefore: number
  ): Promise<void> {
    const timeText = minutesBefore === 0 ? 'sekarang' : `${minutesBefore} menit`
    const locationText = scheduleLocation ? ` di ${scheduleLocation}` : ''
    const body = `Jadwal "${scheduleTitle}" akan dimulai ${timeText} (${scheduleTime})${locationText}`

    await this.showNotification({
      title: '⏰ Pengingat Jadwal',
      body,
      tag: `schedule-reminder-${scheduleTitle}`,
      requireInteraction: true,
    })
  }
}

export const notificationService = new NotificationService()

