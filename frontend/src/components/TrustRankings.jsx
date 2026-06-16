import { Crown, User } from 'lucide-react'

export default function TrustRankings({ transactions }) {
  // Group by user and calculate average trust
  const userStats = {}
  transactions.forEach(tx => {
    if (!userStats[tx.user_id]) {
      userStats[tx.user_id] = {
        user_id: tx.user_id,
        count: 0,
        avgRisk: 0,
        avgTrust: 0
      }
    }
    userStats[tx.user_id].count += 1
    userStats[tx.user_id].avgRisk += tx.risk_score || 0
  })

  const rankings = Object.values(userStats)
    .map(u => ({
      ...u,
      avgRisk: (u.avgRisk / u.count).toFixed(1),
      trust: Math.max(0, 100 - (u.avgRisk / u.count))
    }))
    .sort((a, b) => b.trust - a.trust)
    .slice(0, 5)

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Crown size={20} className="text-yellow-500" />
        Trust Rankings
      </h3>
      
      {rankings.length === 0 ? (
        <div className="text-center py-4 text-dark-400">
          <p>No user data yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rankings.map((user, i) => (
            <div key={user.user_id} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                <span className="text-sm font-bold">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.user_id}</p>
                <div className="w-full bg-dark-700 rounded-full h-2 mt-1">
                  <div
                    className={`h-2 rounded-full transition ${
                      user.trust > 70
                        ? 'bg-green-500'
                        : user.trust > 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${user.trust}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-xs font-semibold text-dark-400">{user.trust.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
