import React from 'react';
import { DollarSign, ShieldAlert, Cpu, Database, AlertCircle, ArrowUpRight, Zap, RefreshCw, Play, Square } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

function DashboardOverview({ transactions, cacheStats, simulatorStatus, setActiveTab, setSelectedTxId, dbStats }) {
  // Compute local helper statistics
  const totalTxs = transactions.length;
  const flaggedTxs = transactions.filter(t => t.is_flagged).length;
  const fraudRate = totalTxs > 0 ? ((flaggedTxs / totalTxs) * 100).toFixed(1) : "0.0";
  
  const activeAlertsCount = transactions.filter(t => t.is_flagged && t.decision === "PENDING").length;
  
  // Calculate average trust score
  const avgTrust = totalTxs > 0 
    ? (transactions.reduce((sum, t) => sum + t.trust_score_after, 0) / totalTxs).toFixed(1) 
    : "100.0";

  // Last 5 transactions
  const recentTxs = transactions.slice(0, 5);

  // Generate chart data based on transaction timestamps
  const chartData = [...transactions].reverse().slice(-10).map((t, idx) => ({
    name: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    Amount: t.amount,
    Risk: t.risk_score
  }));

  const handleOpenAlert = (txId) => {
    setSelectedTxId(txId);
    setActiveTab('reports');
  };

  const getRiskColor = (status) => {
    if (status === 'HIGH_RISK') return 'text-red-400 border-red-500/20 bg-red-500/10';
    if (status === 'MEDIUM_RISK') return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
    return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
  };

  return (
    <div className="space-y-6">
      {/* Title & Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">RISK COMMAND CENTER</h2>
          <p className="text-sm text-slate-400">Real-time payment fraud telemetry and automated AI investigations.</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">SIMULATOR STATUS:</span>
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
            simulatorStatus.is_running 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-slate-950/40 border-cardBorder text-slate-400'
          }`}>
            {simulatorStatus.is_running ? <Play className="w-3.5 h-3.5 fill-current animate-pulse" /> : <Square className="w-3.5 h-3.5 fill-current" />}
            <span>{simulatorStatus.is_running ? "RUNNING" : "STOPPED"}</span>
          </div>
        </div>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Volume */}
        <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Transactions</span>
            <DollarSign className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-100">
            {dbStats ? dbStats.total_transactions : totalTxs}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">Accumulated during session</p>
        </div>

        {/* Metric 2: Fraud Rate */}
        <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fraud Velocity Rate</span>
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-extrabold text-red-400">
            {dbStats ? dbStats.fraud_rate : fraudRate}%
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">
            {dbStats ? dbStats.flagged_transactions : flaggedTxs} high risk flags matched
          </p>
        </div>

        {/* Metric 3: Active Alerts */}
        <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-lg cursor-pointer hover:border-amber-500/20 transition-all" onClick={() => setActiveTab('alerts')}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Review</span>
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {dbStats ? dbStats.pending_reviews : activeAlertsCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">Awaiting manual resolution</p>
        </div>

        {/* Metric 4: Redis Cache Stats */}
        <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cache Telemetry</span>
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-100">{cacheStats.ratio}% <span className="text-xs text-slate-400 font-medium">HIT</span></div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400 font-medium">
            <span>Hits: {cacheStats.hits} | Misses: {cacheStats.misses}</span>
            <span className={`px-1.5 py-0.5 rounded text-[8px] border font-bold ${
              cacheStats.fallback_mode 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {cacheStats.fallback_mode ? "LOCAL" : "REDIS"}
            </span>
          </div>
        </div>
      </div>

      {/* Main dashboard widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time transaction chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-cardBorder">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Transaction Stream Activity</h3>
            <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> WebSocket Enabled
            </span>
          </div>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0c101f', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="Amount" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAmt)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-sm">Awaiting WebSocket stream packets...</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent events widget */}
        <div className="p-6 rounded-2xl glass-panel border border-cardBorder flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Live Transaction Feed</h3>
              <button 
                onClick={() => setActiveTab('live-feed')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
              >
                VIEW ALL <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {recentTxs.length > 0 ? (
                recentTxs.map((tx) => (
                  <div key={tx.transaction_id} className="p-3 bg-slate-950/40 border border-cardBorder/40 rounded-xl flex items-center justify-between transition-all hover:bg-slate-950/70">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-200">{tx.merchant}</div>
                      <div className="text-[10px] text-slate-400">{tx.user_id} &bull; {tx.city}</div>
                    </div>
                    <div className="text-right space-y-1.5">
                      <div className="text-xs font-extrabold text-slate-100">${tx.amount.toFixed(2)}</div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${getRiskColor(tx.status)}`}>
                        {tx.status} ({tx.risk_score}%)
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No transactions simulated yet.
                </div>
              )}
            </div>
          </div>

          {/* Quick Action triggers */}
          {recentTxs.some(t => t.is_flagged) && (
            <button
              onClick={() => handleOpenAlert(recentTxs.find(t => t.is_flagged).transaction_id)}
              className="w-full py-2.5 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 font-bold text-xs tracking-wider uppercase hover:bg-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 fill-current" /> Investigate Latest Alert
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardOverview;
