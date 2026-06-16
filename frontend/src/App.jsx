import { useState, useEffect } from 'react'
import { AlertCircle, LogOut } from 'lucide-react'
import Login from './components/Login'
import Navbar from './components/Navbar'
import DashboardOverview from './components/DashboardOverview'
import LiveFeed from './components/LiveFeed'
import AnalyticsCharts from './components/AnalyticsCharts'
import TrustRankings from './components/TrustRankings'
import InvestigationPortal from './components/InvestigationPortal'
import AdminControls from './components/AdminControls'
import AlertsList from './components/AlertsList'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showInvestigation, setShowInvestigation] = useState(false)
  const [wsStatus, setWsStatus] = useState('connecting')

  useEffect(() => {
    if (!isLoggedIn) return

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('ws://127.0.0.1:8000/ws/transactions')

        ws.onopen = () => {
          setWsStatus('connected')
          console.log('WebSocket connected')
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'NEW_TRANSACTION') {
              setTransactions(prev => {
                const updated = [data.transaction, ...prev].slice(0, 100)
                return updated
              })

              // Check if high risk and add to alerts
              if (data.transaction.risk_score > 70) {
                setAlerts(prev => [{
                  id: data.transaction.id,
                  transaction_id: data.transaction.id,
                  message: `High-risk transaction: $${data.transaction.amount}`,
                  timestamp: new Date().toISOString(),
                  severity: 'high',
                  transaction: data.transaction
                }, ...prev].slice(0, 50))
              }
            }
          } catch (e) {
            console.error('Error parsing message:', e)
          }
        }

        ws.onerror = (error) => {
          setWsStatus('error')
          console.error('WebSocket error:', error)
        }

        ws.onclose = () => {
          setWsStatus('disconnected')
          console.log('WebSocket disconnected')
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000)
        }

        return ws
      } catch (e) {
        console.error('WebSocket connection error:', e)
        setWsStatus('error')
      }
    }

    const ws = connectWebSocket()
    return () => {
      if (ws) ws.close()
    }
  }, [isLoggedIn])

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserInfo(null)
    setTransactions([])
    setAlerts([])
    localStorage.removeItem('access_token')
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={(info) => {
      setIsLoggedIn(true)
      setUserInfo(info)
    }} />
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <Navbar 
        wsStatus={wsStatus} 
        transactionCount={transactions.length}
        alertCount={alerts.length}
      />
      
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">TrustGuard Dashboard</h1>
            <p className="text-dark-400 mt-1">Real-time fraud detection and investigation</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Critical Alerts */}
        {alerts.length > 0 && (
          <div className="bg-red-900 border-l-4 border-red-500 p-4 rounded mb-6 flex items-center gap-3">
            <AlertCircle size={24} />
            <div>
              <h3 className="font-bold">Active Alerts</h3>
              <p className="text-red-100">{alerts.length} potential fraud cases requiring investigation</p>
            </div>
          </div>
        )}

        {/* Dashboard Overview */}
        <DashboardOverview transactions={transactions} alerts={alerts} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Analytics */}
            <AnalyticsCharts transactions={transactions} />

            {/* Live Feed */}
            <LiveFeed 
              transactions={transactions.slice(0, 10)}
              onSelectTransaction={(tx) => {
                setSelectedTransaction(tx)
                setShowInvestigation(true)
              }}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trust Rankings */}
            <TrustRankings transactions={transactions} />

            {/* Admin Controls */}
            <AdminControls />

            {/* Alerts List */}
            <AlertsList 
              alerts={alerts.slice(0, 5)}
              onSelectAlert={(alert) => {
                setSelectedTransaction(alert.transaction)
                setShowInvestigation(true)
              }}
            />
          </div>
        </div>

        {/* Investigation Portal Modal */}
        {showInvestigation && selectedTransaction && (
          <InvestigationPortal
            transaction={selectedTransaction}
            onClose={() => {
              setShowInvestigation(false)
              setSelectedTransaction(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default App
