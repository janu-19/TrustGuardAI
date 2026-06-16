import { AlertTriangle, TrendingUp, Users, Zap } from 'lucide-react'

export default function DashboardOverview({ transactions, alerts }) {
  const highRiskCount = transactions.filter(t => t.risk_score > 70).length
  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
  const averageRisk = transactions.length > 0 
    ? (transactions.reduce((sum, t) => sum + (t.risk_score || 0), 0) / transactions.length).toFixed(1)
    : 0

  const stats = [
    {
      label: 'High Risk Transactions',
      value: highRiskCount,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-900/30',
      borderColor: 'border-red-800'
    },
    {
      label: 'Average Risk Score',
      value: `${averageRisk}%`,
      icon: TrendingUp,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/30',
      borderColor: 'border-yellow-800'
    },
    {
      label: 'Total Volume',
      value: `$${totalAmount.toFixed(0)}`,
      icon: Zap,
      color: 'text-green-400',
      bgColor: 'bg-green-900/30',
      borderColor: 'border-green-800'
    },
    {
      label: 'Active Alerts',
      value: alerts.length,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/30',
      borderColor: 'border-blue-800'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <div key={i} className={`${stat.bgColor} border ${stat.borderColor} rounded-lg p-6`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-dark-400 text-sm font-medium">{stat.label}</p>
                <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
              </div>
              <Icon className={`${stat.color} opacity-50`} size={24} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
