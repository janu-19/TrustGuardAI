import { useState } from 'react'
import { Shield } from 'lucide-react'

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login_json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Login failed')
      }

      const data = await response.json()
      localStorage.setItem('access_token', data.access_token)
      
      onLoginSuccess({
        username: username,
        token: data.access_token
      })
    } catch (err) {
      setError(err.message || 'Connection error. Make sure backend is running on http://127.0.0.1:8000')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="text-blue-500" size={48} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">TrustGuard</h1>
          <p className="text-dark-400">AI-Powered Fraud Detection</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-dark-800 rounded-lg shadow-2xl p-8 border border-dark-700">
          <h2 className="text-2xl font-bold text-white mb-6">Sign In</h2>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-dark-300 text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded px-4 py-2 text-white placeholder-dark-500 focus:outline-none focus:border-blue-500 transition"
                placeholder="admin"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-dark-300 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded px-4 py-2 text-white placeholder-dark-500 focus:outline-none focus:border-blue-500 transition"
                placeholder="password"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-dark-600 text-white font-semibold py-2 rounded transition mt-6"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <p className="text-center text-dark-400 text-sm mt-4">
            Demo credentials: admin / password
          </p>
        </form>
      </div>
    </div>
  )
}
