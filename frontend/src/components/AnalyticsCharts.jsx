import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AnalyticsCharts({ transactions }) {
  // Risk distribution
  const riskBuckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // 0-10, 10-20, ..., 90-100
  transactions.forEach(t => {
    const bucket = Math.floor((t.risk_score || 0) / 10)
    if (bucket < 10) riskBuckets[bucket]++
  })

  const riskData = [
    { range: '0-10', count: riskBuckets[0] },
    { range: '10-20', count: riskBuckets[1] },
    { range: '20-30', count: riskBuckets[2] },
    { range: '30-40', count: riskBuckets[3] },
    { range: '40-50', count: riskBuckets[4] },
    { range: '50-60', count: riskBuckets[5] },
    { range: '60-70', count: riskBuckets[6] },
    { range: '70-80', count: riskBuckets[7] },
    { range: '80-90', count: riskBuckets[8] },
    { range: '90-100', count: riskBuckets[9] }
  ]

  // Amount distribution
  const amountBuckets = {}
  transactions.slice(0, 20).forEach((t, i) => {
    amountBuckets[`TX${i + 1}`] = t.amount || 0
  })

  const amountData = Object.entries(amountBuckets).map(([label, amount]) => ({
    label,
    amount: parseFloat(amount.toFixed(2))
  }))

  return (
    <div className="space-y-6">
      {/* Risk Distribution */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Risk Score Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={riskData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <XAxis dataKey="range" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transaction Amounts */}
      {amountData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Transaction Amounts</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={amountData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
              <XAxis dataKey="label" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="amount" stroke="#10b981" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
