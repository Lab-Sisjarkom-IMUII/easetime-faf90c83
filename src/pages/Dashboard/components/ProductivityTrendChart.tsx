import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Loader2, RefreshCw } from 'lucide-react'
import { ProductivityTrendPoint } from '../../../types/analytics'

interface ProductivityTrendChartProps {
  data: ProductivityTrendPoint[]
  loading?: boolean
  onRefresh?: () => void
}

const formatMinutes = (minutes: number) => {
  if (!minutes) return '0 m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} m`
  if (mins === 0) return `${hours} j`
  return `${hours} j ${mins} m`
}

const ProductivityTrendChart = ({ data, loading, onRefresh }: ProductivityTrendChartProps) => {
  const hasData = data.length > 0 && data.some((d) => d.totalMinutes > 0)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tren Produktivitas</h3>
          <p className="text-sm text-gray-600">Rasio produktif harian & moving average 7 hari</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm disabled:opacity-60"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Segarkan
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Memuat tren...
        </div>
      )}

      {!loading && !hasData && (
        <div className="text-center text-gray-600 py-10">
          Belum ada data produktivitas untuk periode ini.
        </div>
      )}

      {!loading && hasData && (
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#4B5563' }} />
              <YAxis
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12, fill: '#4B5563' }}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value: any, name: string, props) => {
                  if (name === 'Rasio') return [`${value}%`, name]
                  if (name === 'MA 7-hari') return [`${value}%`, name]
                  if (name === 'Produktif') return [formatMinutes(props.payload.productiveMinutes), name]
                  if (name === 'Total') return [formatMinutes(props.payload.totalMinutes), name]
                  return value
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="ratioPercent" stroke="#2563EB" strokeWidth={2} dot={false} name="Rasio" />
              <Line type="monotone" dataKey="movingAvg7" stroke="#10B981" strokeWidth={2} dot={false} name="MA 7-hari" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default ProductivityTrendChart

