export interface ProductivityTrendPoint {
  date: string // ISO date
  label: string // formatted short label for chart axis
  productiveMinutes: number
  totalMinutes: number
  ratioPercent: number
  movingAvg7: number
}

export interface ProductivityTrendResponse {
  points: ProductivityTrendPoint[]
  period: {
    start: string
    end: string
    days: number
  }
}

