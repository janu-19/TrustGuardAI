import { Shield, Wifi, WifiOff, AlertTriangle } from 'lucide-react'

export default function Navbar({ wsStatus, transactionCount, alertCount }) {
  const statusColors = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-red-500',
    error: 'bg-red-600'
  }

  const statusText = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    error: 'Error'
  }

  return (
    <nav className="bg-dark-800 border-b border-dark-700 sticky top-0 z-40">
      <div className="px-6 py-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-blue-500" size={28} />
            <h1 className="text-xl font-bold">TrustGuard AI</h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-center">
                <p className="text-dark-400 text-sm">Live Transactions</p>
                <p className="text-lg font-bold">{transactionCount}</p>
              </div>
              
              {alertCount > 0 && (
                <div className="text-center text-red-400">
                  <p className="text-dark-400 text-sm">Active Alerts</p>
                  <p className="text-lg font-bold flex items-center gap-1">
                    <AlertTriangle size={16} /> {alertCount}
                  </p>
                </div>
              )}
            </div>

            {/* WebSocket Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${statusColors[wsStatus]}`}></div>
              <span className="text-sm text-dark-400">{statusText[wsStatus]}</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
