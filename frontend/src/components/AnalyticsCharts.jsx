import React from 'react';
import { BarChart3, TrendingUp, PieChart as PieIcon, CreditCard } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, PieChart, Pie, Cell 
} from 'recharts';

function AnalyticsCharts({ transactions }) {
  // 1. Compute Risk Distribution counts
  const trustedCount = transactions.filter(t => t.risk_score <= 30).length;
  const mediumCount = transactions.filter(t => t.risk_score > 30 && t.risk_score <= 60).length;
  const highCount = transactions.filter(t => t.risk_score > 60).length;

  const riskData = [
    { name: 'Trusted', value: trustedCount, color: '#10b981' },
    { name: 'Medium Risk', value: mediumCount, color: '#f59e0b' },
    { name: 'High Risk', value: highCount, color: '#ef4444' }
  ];

  // 2. Compute Merchant Category counts
  const merchantCounts = {};
  transactions.forEach(t => {
    merchantCounts[t.merchant_category] = (merchantCounts[t.merchant_category] || 0) + 1;
  });

  const merchantData = Object.entries(merchantCounts).map(([name, value]) => ({
    name: name.toUpperCase(),
    value
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  // 3. Compute Payment Method counts
  const paymentCounts = {};
  transactions.forEach(t => {
    paymentCounts[t.payment_method] = (paymentCounts[t.payment_method] || 0) + 1;
  });

  const paymentData = Object.entries(paymentCounts).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value
  }));

  // 4. Time Series Fraud Trend (aggregate into buckets)
  const sortedTxs = [...transactions].reverse();
  const trendData = sortedTxs.map((t, idx) => ({
    index: idx + 1,
    Amount: t.amount,
    'Risk Score': t.risk_score
  })).slice(-20); // show last 20

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400 stroke-[2.5]" /> FRAUD & RISK ANALYTICS
        </h2>
        <p className="text-sm text-slate-400">Statistical evaluations of risk distributions, payment channels, and merchant category vulnerabilities.</p>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Fraud risk score timeline trend */}
        <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" /> Risk Score Stream Vector
          </h3>
          <div className="h-64 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="index" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#0c101f', borderColor: '#1e293b', color: '#f8fafc', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="Risk Score" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">Awaiting data...</div>
            )}
          </div>
        </div>

        {/* Chart 2: Risk distribution bar chart */}
        <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Transaction Risk Classification
          </h3>
          <div className="h-64 w-full">
            {transactions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0c101f', borderColor: '#1e293b', color: '#f8fafc', fontSize: '11px' }} />
                  <Bar dataKey="value" strokeWidth={1} radius={[4, 4, 0, 0]}>
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">Awaiting data...</div>
            )}
          </div>
        </div>

        {/* Chart 3: Merchant Category Pie Chart */}
        <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-indigo-400" /> Merchant Category Distribution
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            {merchantData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={merchantData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {merchantData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0c101f', borderColor: '#1e293b', color: '#f8fafc', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs">Awaiting data...</div>
            )}
          </div>
        </div>

        {/* Chart 4: Payment Methods Bar Chart */}
        <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" /> Payment Methods Volumetrics
          </h3>
          <div className="h-64 w-full">
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0c101f', borderColor: '#1e293b', color: '#f8fafc', fontSize: '11px' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">Awaiting data...</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default AnalyticsCharts;
