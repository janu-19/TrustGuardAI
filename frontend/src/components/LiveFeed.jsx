import { AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react'

export default function LiveFeed({ transactions, onSelectTransaction }) {
  const getRiskBadge = (score) => {
    if (score > 70) return <span className="badge-high">High Risk</span>
    if (score > 40) return <span className="badge-medium">Medium Risk</span>
    return <span className="badge-low">Low Risk</span>
  }

  const getRiskColor = (score) => {
    if (score > 70) return 'text-red-400'
    if (score > 40) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Live Transaction Feed</h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-8 text-dark-400">
          <p>Waiting for transactions...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              onClick={() => onSelectTransaction(tx)}
              className="bg-dark-700/50 hover:bg-dark-700 border border-dark-600 rounded p-3 cursor-pointer transition flex justify-between items-center"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono text-dark-400">{tx.id.slice(0, 8)}</span>
                  {getRiskBadge(tx.risk_score)}
                </div>
                <p className="text-sm text-dark-300">
                  User: {tx.user_id} | Amount: ${(tx.amount || 0).toFixed(2)}
                </p>
                <p className="text-xs text-dark-500 mt-1">
                  {new Date(tx.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-2">
                <span className={`text-lg font-bold ${getRiskColor(tx.risk_score)}`}>
                  {tx.risk_score.toFixed(0)}%
                </span>
                <ArrowRight size={18} className="text-dark-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
