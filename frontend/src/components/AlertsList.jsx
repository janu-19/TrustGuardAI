import { AlertCircle, X } from 'lucide-react'

export default function AlertsList({ alerts, onSelectAlert }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertCircle size={20} className="text-red-500" />
        Recent Alerts
      </h3>
      
      {alerts.length === 0 ? (
        <div className="text-center py-4 text-dark-400">
          <p>No active alerts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => onSelectAlert(alert)}
              className="bg-red-900/20 border border-red-800 rounded p-3 cursor-pointer hover:bg-red-900/30 transition"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-200">{alert.message}</p>
                  <p className="text-xs text-red-300 mt-1">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
