import { X, FileText, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export default function InvestigationPortal({ transaction, onClose }) {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  const handleGenerateReport = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/transactions/investigate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            transaction_id: transaction.id,
            user_id: transaction.user_id
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const data = await response.json()
      setReport(data.report)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto border border-dark-700">
        {/* Header */}
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">Transaction Investigation</h2>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Transaction Details */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-yellow-500" />
              Transaction Details
            </h3>
            <div className="bg-dark-700/50 p-4 rounded space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-400">ID:</span>
                <span className="font-mono">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">User:</span>
                <span>{transaction.user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Amount:</span>
                <span>${(transaction.amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Risk Score:</span>
                <span className={transaction.risk_score > 70 ? 'text-red-400' : 'text-green-400'}>
                  {transaction.risk_score.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Time:</span>
                <span>{new Date(transaction.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          {report ? (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                AI Investigation Report
              </h3>
              <div className="bg-dark-700/50 p-4 rounded text-sm text-dark-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {typeof report === 'string' ? report : JSON.stringify(report, null, 2)}
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-dark-600 text-white px-4 py-2 rounded transition flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              {loading ? 'Generating Report...' : 'Generate AI Investigation Report'}
            </button>
          )}

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
