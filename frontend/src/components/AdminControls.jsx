import { Settings, Play, Pause } from 'lucide-react'
import { useState } from 'react'

export default function AdminControls() {
  const [simulatorRunning, setSimulatorRunning] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSimulatorControl = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/simulator/${simulatorRunning ? 'stop' : 'start'}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      )
      
      if (response.ok) {
        setSimulatorRunning(!simulatorRunning)
      }
    } catch (e) {
      console.error('Error controlling simulator:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Settings size={20} />
        Admin Controls
      </h3>
      
      <div className="space-y-3">
        <button
          onClick={handleSimulatorControl}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-dark-600 text-white px-4 py-2 rounded transition"
        >
          {simulatorRunning ? (
            <>
              <Pause size={18} />
              Stop Simulator
            </>
          ) : (
            <>
              <Play size={18} />
              Start Simulator
            </>
          )}
        </button>

        <div className="bg-dark-700/50 p-3 rounded text-sm text-dark-300">
          <p className="font-semibold mb-1">Status:</p>
          <p>Simulator: {simulatorRunning ? '🟢 Running' : '🔴 Stopped'}</p>
        </div>
      </div>
    </div>
  )
}
