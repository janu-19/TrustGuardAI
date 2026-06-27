import React, { useState, useEffect } from 'react';
import { parseUTC } from '../utils';
import { Users, ShieldCheck, ShieldAlert, AlertCircle, TrendingDown, Clock, Shield } from 'lucide-react';

function TrustRankings({ token, backendUrl, onLogout }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [scoreDetails, setScoreDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchScoreDetails(selectedUserId);
      fetchTrustHistory(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/users/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0 && !selectedUserId) {
          setSelectedUserId(data[0].user_id);
        }
      } else if (res.status === 401 && onLogout) {
        onLogout();
      }
    } catch (err) {
      console.error("Failed to fetch users rankings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScoreDetails = async (uid) => {
    try {
      const res = await fetch(`${backendUrl}/api/v1/users/${uid}/score`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScoreDetails(data);
      } else if (res.status === 401 && onLogout) {
        onLogout();
      }
    } catch (err) {
      console.error("Failed to fetch user score details:", err);
    }
  };

  const fetchTrustHistory = async (uid) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/users/${uid}/trust-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else if (res.status === 401 && onLogout) {
        onLogout();
      }
    } catch (err) {
      console.error("Failed to fetch user trust history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getScoreBadge = (score) => {
    if (score <= 30) return <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-red-500/10 border border-red-500/20 text-red-400">HIGH RISK</span>;
    if (score <= 60) return <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-amber-500/10 border border-amber-500/30 text-amber-400">MED RISK</span>;
    return <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">TRUSTED</span>;
  };

  const getScoreColorClass = (score) => {
    if (score <= 30) return "text-red-400";
    if (score <= 60) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-400 stroke-[2.5]" /> TRUST SCORE LEDGER
        </h2>
        <p className="text-sm text-slate-400">Dynamically scored user directories based on age, transaction velocity, failed attempts, and device counts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Users list ranked by score */}
        <div className="lg:col-span-1 rounded-2xl glass-panel border border-cardBorder overflow-hidden shadow-xl h-[550px] flex flex-col">
          <div className="p-4 bg-slate-950/40 border-b border-cardBorder flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">User Rankings (Riskiest First)</span>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-cardBorder/30">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">Loading user list...</div>
            ) : users.length > 0 ? (
              users.map((u) => (
                <div 
                  key={u.user_id} 
                  onClick={() => setSelectedUserId(u.user_id)}
                  className={`p-4 cursor-pointer transition-colors flex items-center justify-between ${
                    selectedUserId === u.user_id ? 'bg-indigo-600/10 border-r-2 border-r-indigo-500' : 'hover:bg-slate-950/20'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-200">{u.user_id}</div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">{u.total_transactions} txs &bull; {u.blocked_transactions} blocked</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className={`text-sm font-extrabold ${getScoreColorClass(u.trust_score)}`}>{u.trust_score}</div>
                    {getScoreBadge(u.trust_score)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">No users recorded in system.</div>
            )}
          </div>
        </div>

        {/* Right Side: Trust Score Audit & Change history */}
        <div className="lg:col-span-2 space-y-6">
          {scoreDetails ? (
            <>
              {/* Detailed Breakdown Card */}
              <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-xl relative overflow-hidden">
                <div className="absolute top-4 right-4 text-3xl font-extrabold opacity-15 select-none text-indigo-500/20">AUDIT</div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-200">Account Risk Audit: {scoreDetails.user_id}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Trust category: <b>{scoreDetails.category}</b></p>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className={`text-4xl font-extrabold leading-none ${getScoreColorClass(scoreDetails.trust_score)}`}>
                      {scoreDetails.trust_score}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block mt-1">Composite Score</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-cardBorder/40 pt-4 text-xs text-slate-400">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase text-[10px] block">Deduction Risk Factors</span>
                    <span className="text-slate-300 font-medium">{scoreDetails.factors}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase text-[10px] block">Age Score Category</span>
                    <span className="text-slate-300 font-medium">Verified Active Profile</span>
                  </div>
                </div>
              </div>

              {/* History Timeline */}
              <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-xl flex-1">
                <div className="flex justify-between items-center mb-6 border-b border-cardBorder/40 pb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" /> Trust Score Adjustment Log
                  </h3>
                  <TrendingDown className="w-4 h-4 text-slate-500" />
                </div>

                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
                  {loadingHistory ? (
                    <div className="text-center text-slate-500 py-8 text-xs">Loading ledger audits...</div>
                  ) : history.length > 0 ? (
                    history.map((h, idx) => {
                      const delta = h.new_score - h.old_score;
                      return (
                        <div key={h.id} className="relative pl-6 pb-4 border-l border-cardBorder/60 last:border-l-0 last:pb-0">
                          {/* Timeline dot */}
                          <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border border-darkBg ${
                            delta > 0 ? 'bg-emerald-500' : delta < 0 ? 'bg-red-500' : 'bg-slate-500'
                          }`}></div>
                          
                          <div className="flex items-start justify-between text-xs">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 block">
                                {parseUTC(h.timestamp).toLocaleString()}
                              </span>
                              <p className="text-slate-300 font-semibold">{h.reason}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-500 font-bold block">
                                {h.old_score} &rarr; {h.new_score}
                              </span>
                              <span className={`text-[10px] font-extrabold ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-slate-500 py-8 text-xs">
                      No adjustments logged. Initial standard base score applies.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 border border-cardBorder rounded-2xl bg-cardBg/20 text-sm">
              Select a user to inspect auditing details.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default TrustRankings;
