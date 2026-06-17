import React, { useState, useEffect } from 'react';
import { Radio, Play, Pause, AlertCircle, FileText } from 'lucide-react';

function LiveFeed({ transactions, setSelectedTxId, setActiveTab }) {
  const [isPaused, setIsPaused] = useState(false);
  const [displayedTxs, setDisplayedTxs] = useState([]);
  const [bufferedTxs, setBufferedTxs] = useState([]);

  // Sync displayed transactions unless paused
  useEffect(() => {
    if (!isPaused) {
      // Release buffered transactions
      if (bufferedTxs.length > 0) {
        setDisplayedTxs(prev => [...bufferedTxs, ...prev].slice(0, 100));
        setBufferedTxs([]);
      } else {
        setDisplayedTxs(transactions.slice(0, 100));
      }
    } else {
      // Accumulate new arrivals into buffer
      const newArrivals = transactions.filter(t => !displayedTxs.some(dt => dt.transaction_id === t.transaction_id));
      if (newArrivals.length > 0) {
        setBufferedTxs(prev => [...newArrivals, ...prev]);
      }
    }
  }, [transactions, isPaused]);

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleInvestigate = (txId) => {
    setSelectedTxId(txId);
    setActiveTab('reports');
  };

  const getRiskRowBg = (status) => {
    if (status === 'HIGH_RISK') return 'bg-red-500/[0.04] hover:bg-red-500/[0.08] border-l-2 border-l-red-500';
    if (status === 'MEDIUM_RISK') return 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06] border-l-2 border-l-amber-500';
    return 'hover:bg-slate-900/40 border-l-2 border-l-transparent';
  };

  const getRiskBadge = (status, score) => {
    if (status === 'HIGH_RISK') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-red-500/10 border-red-500/20 text-red-400">HIGH ({score}%)</span>;
    if (status === 'MEDIUM_RISK') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-500/10 border-amber-500/20 text-amber-400">MED ({score}%)</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">TRUSTED ({score}%)</span>;
  };

  return (
    <div className="space-y-6">
      {/* Title & Play/Pause Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Radio className="w-6 h-6 text-indigo-400 stroke-[2.5]" /> REAL-TIME STREAM
          </h2>
          <p className="text-sm text-slate-400">WebSocket transaction stream. Flagged alerts populate instantly.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {isPaused && bufferedTxs.length > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg font-bold animate-pulse">
              {bufferedTxs.length} PENDING IN BUFFER
            </span>
          )}
          
          <button
            onClick={handleTogglePause}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all border ${
              isPaused 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>RESUME STREAM</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>PAUSE STREAM</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="rounded-2xl glass-panel border border-cardBorder overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 border-b border-cardBorder">
                <th className="p-4 font-bold tracking-wider">TIME</th>
                <th className="p-4 font-bold tracking-wider">TRANSACTION ID</th>
                <th className="p-4 font-bold tracking-wider">USER</th>
                <th className="p-4 font-bold tracking-wider">AMOUNT</th>
                <th className="p-4 font-bold tracking-wider">MERCHANT</th>
                <th className="p-4 font-bold tracking-wider">LOCATION</th>
                <th className="p-4 font-bold tracking-wider">PAYMENT</th>
                <th className="p-4 font-bold tracking-wider">RISK ASSESSMENT</th>
                <th className="p-4 font-bold tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cardBorder/40">
              {displayedTxs.length > 0 ? (
                displayedTxs.map((tx) => (
                  <tr key={tx.transaction_id} className={`transition-colors ${getRiskRowBg(tx.status)}`}>
                    <td className="p-4 font-semibold text-slate-400">
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-300">
                      {tx.transaction_id}
                    </td>
                    <td className="p-4 font-bold text-slate-300">
                      {tx.user_id}
                    </td>
                    <td className="p-4 font-extrabold text-slate-100">
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td className="p-4 font-semibold text-slate-300">
                      {tx.merchant} <span className="text-[10px] text-slate-500 font-medium">({tx.merchant_category})</span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {tx.city}, {tx.country}
                    </td>
                    <td className="p-4 uppercase text-[10px] font-bold text-slate-400">
                      {tx.payment_method.replace('_', ' ')}
                    </td>
                    <td className="p-4">
                      {getRiskBadge(tx.status, tx.risk_score)}
                    </td>
                    <td className="p-4">
                      {tx.is_flagged ? (
                        <button
                          onClick={() => handleInvestigate(tx.transaction_id)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 font-bold tracking-wide transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>INVESTIGATE</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    Awaiting transactions from simulator. Make sure the simulator is toggled ON.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LiveFeed;
