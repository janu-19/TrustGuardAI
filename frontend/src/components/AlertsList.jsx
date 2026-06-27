import React, { useState } from 'react';
import { parseUTC } from '../utils';
import { AlertTriangle, BarChart3, ShieldCheck, ShieldAlert, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

function AlertsList({ transactions, setTransactions, token, backendUrl, setSelectedTxId, setActiveTab, fetchCacheStats, fetchDbStats, onLogout }) {
  const [expandedTxId, setExpandedTxId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Filter only flagged alerts (HIGH_RISK or decision made on a flagged transaction)
  const alerts = transactions.filter(t => t.is_flagged || t.status === "HIGH_RISK");

  const toggleExpand = (txId) => {
    setExpandedTxId(expandedTxId === txId ? null : txId);
  };

  const handleDecision = async (txId, decision) => {
    setUpdatingId(txId);
    try {
      const res = await fetch(`${backendUrl}/api/v1/transactions/${txId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decision })
      });

      if (res.ok) {
        const updatedTx = await res.json();
        // Update local list
        setTransactions(prev => prev.map(t => t.transaction_id === txId ? updatedTx : t));
        fetchCacheStats(); // update hit misses if trust changes
        if (fetchDbStats) fetchDbStats();
      } else if (res.status === 401 && onLogout) {
        onLogout();
      }
    } catch (err) {
      console.error("Decision post failed:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewReport = (txId) => {
    setSelectedTxId(txId);
    setActiveTab('reports');
  };

  const getDecisionBadge = (decision) => {
    if (decision === 'APPROVED') return <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">APPROVED</span>;
    if (decision === 'BLOCKED') return <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-red-500/10 border border-red-500/30 text-red-400">BLOCKED</span>;
    return <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">PENDING REVIEW</span>;
  };

  // Convert SHAP explanation dictionary to Recharts friendly array
  const getShapData = (shapDict) => {
    if (!shapDict) return [];
    return Object.entries(shapDict).map(([feature, val]) => ({
      feature: feature.replace('_', ' '),
      value: val
    })).sort((a, b) => b.value - a.value);
  };

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500 stroke-[2.5]" /> RISK INVESTIGATION ALERT LOG
        </h2>
        <p className="text-sm text-slate-400">Review flagged high-risk anomalies, audit SHAP explainability attributions, and verify agent logs.</p>
      </div>

      {/* Alerts Log list */}
      <div className="rounded-2xl glass-panel border border-cardBorder overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 border-b border-cardBorder">
                <th className="p-4"></th>
                <th className="p-4 font-bold tracking-wider">DATE / TIME</th>
                <th className="p-4 font-bold tracking-wider">TRANSACTION ID</th>
                <th className="p-4 font-bold tracking-wider">USER</th>
                <th className="p-4 font-bold tracking-wider">AMOUNT</th>
                <th className="p-4 font-bold tracking-wider">MERCHANT</th>
                <th className="p-4 font-bold tracking-wider">RISK SCORE</th>
                <th className="p-4 font-bold tracking-wider">RESOLUTION STATE</th>
                <th className="p-4 font-bold tracking-wider">REPORTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cardBorder/40">
              {alerts.length > 0 ? (
                alerts.map((tx) => {
                  const isExpanded = expandedTxId === tx.transaction_id;
                  const shapData = getShapData(tx.shap_explanation);
                  
                  return (
                    <React.Fragment key={tx.transaction_id}>
                      {/* Base Row */}
                      <tr 
                        className={`transition-colors cursor-pointer hover:bg-slate-950/20 ${
                          tx.decision === 'PENDING' ? 'bg-red-500/[0.02]' : ''
                        }`}
                        onClick={() => toggleExpand(tx.transaction_id)}
                      >
                        <td className="p-4">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </td>
                        <td className="p-4 text-slate-400 font-semibold">
                          {parseUTC(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-4 font-mono font-medium text-slate-300">
                          {tx.transaction_id}
                        </td>
                        <td className="p-4 font-bold text-slate-200">
                          {tx.user_id}
                        </td>
                        <td className="p-4 font-extrabold text-slate-100">
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="p-4 font-semibold text-slate-300">
                          {tx.merchant} <span className="text-[10px] text-slate-500 font-medium">({tx.merchant_category})</span>
                        </td>
                        <td className="p-4 text-red-400 font-extrabold">
                          {tx.risk_score}%
                        </td>
                        <td className="p-4">
                          {getDecisionBadge(tx.decision)}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewReport(tx.transaction_id); }}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950/60 hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/20 rounded-lg border border-cardBorder font-semibold tracking-wide transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>REPORT</span>
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded SHAP Detail Dropdown Panel */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-6 bg-slate-950/60 border-y border-cardBorder/40">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              
                              {/* SHAP Chart Explainability Visualizer */}
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                                  <span>SHAP Explainability (Risk Vector Weights)</span>
                                </div>
                                <p className="text-slate-400 text-[11px]">
                                  Attribution weight of features pushing risk probability above baseline.
                                </p>
                                
                                <div className="h-48 w-full border border-cardBorder/30 bg-cardBg/20 rounded-xl p-3">
                                  {shapData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={shapData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                                        <XAxis type="number" stroke="#64748b" fontSize={9} />
                                        <YAxis dataKey="feature" type="category" stroke="#64748b" fontSize={9} width={90} tickLine={false} />
                                        <ReferenceLine x={0} stroke="#1e293b" />
                                        <Bar dataKey="value" strokeWidth={1} radius={[0, 4, 4, 0]}>
                                          {shapData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#ef4444' : '#10b981'} />
                                          ))}
                                        </Bar>
                                      </BarChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <div className="h-full flex items-center justify-center text-slate-500">
                                      No explainability metadata returned by scoring engine.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Transaction Metadata Audit & Decisions */}
                              <div className="flex flex-col justify-between space-y-6">
                                <div className="space-y-4">
                                  <div className="text-slate-300 font-bold text-sm">Session Fingerprints</div>
                                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-400">
                                    <div>
                                      <span className="font-semibold text-slate-500 uppercase block">Client Device</span>
                                      <span className="font-mono text-slate-300">{tx.device_id}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-500 uppercase block">IP Address</span>
                                      <span className="font-mono text-slate-300">{tx.ip_address}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-500 uppercase block">Trust Score Before</span>
                                      <span className="text-slate-300 font-bold">{tx.trust_score_before}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-500 uppercase block">Trust Score After</span>
                                      <span className="text-slate-300 font-bold">{tx.trust_score_after}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Decision Actions */}
                                {tx.decision === 'PENDING' ? (
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => handleDecision(tx.transaction_id, 'APPROVED')}
                                      disabled={updatingId === tx.transaction_id}
                                      className="flex-1 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold text-xs tracking-wider uppercase hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                      <ShieldCheck className="w-4 h-4" /> Approve Payment
                                    </button>
                                    
                                    <button
                                      onClick={() => handleDecision(tx.transaction_id, 'BLOCKED')}
                                      disabled={updatingId === tx.transaction_id}
                                      className="flex-1 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 font-bold text-xs tracking-wider uppercase hover:bg-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                      <ShieldAlert className="w-4 h-4" /> Block & Flag Account
                                    </button>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-slate-900/40 border border-cardBorder/40 rounded-xl text-slate-400 text-[11px]">
                                    Case resolved as <span className="font-bold text-slate-200">{tx.decision}</span> by analyst <b>{tx.decision_by}</b> on {parseUTC(tx.decision_at).toLocaleString()}.
                                  </div>
                                )}

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    No flagged anomalies matching alert criteria in session history.
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

export default AlertsList;
