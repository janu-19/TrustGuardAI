import React, { useState } from 'react';
import { Settings, Play, Square, Database, Cpu, HelpCircle, RefreshCw, Zap } from 'lucide-react';

function AdminControls({ token, backendUrl, simulatorStatus, fetchSimulatorStatus, cacheStats, fetchCacheStats }) {
  const [trainingStatus, setTrainingStatus] = useState('');
  const [seedingStatus, setSeedingStatus] = useState('');
  const [clearingCache, setClearingCache] = useState(false);
  const [togglingSim, setTogglingSim] = useState(false);

  const handleToggleSimulator = async () => {
    setTogglingSim(true);
    const targetState = !simulatorStatus.is_running;
    try {
      const res = await fetch(`${backendUrl}/api/v1/admin/simulator/toggle?run=${targetState}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchSimulatorStatus();
      }
    } catch (err) {
      console.error("Simulator toggle failed:", err);
    } finally {
      setTogglingSim(false);
    }
  };

  const handleInjectFraud = async (fraudType) => {
    try {
      const res = await fetch(`${backendUrl}/api/v1/admin/simulator/inject-fraud?fraud_type=${fraudType}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Successfully injected simulated fraud: ${fraudType}! Transaction: ${data.transaction.transaction_id}`);
      }
    } catch (err) {
      console.error("Fraud injection failed:", err);
    }
  };

  const handleTrainModel = async () => {
    setTrainingStatus('Training job spawned in background...');
    try {
      const res = await fetch(`${backendUrl}/api/v1/admin/train-model?dataset_path=creditcard.csv`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrainingStatus(data.message);
      } else {
        const err = await res.json();
        setTrainingStatus(`Error: ${err.detail}`);
      }
    } catch (err) {
      setTrainingStatus("Failed to initiate training. Check database/CSV connections.");
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/admin/cache/clear`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchCacheStats();
      }
    } catch (err) {
      console.error("Cache flush failed:", err);
    } finally {
      setClearingCache(false);
    }
  };

  const handleSeedDatabase = async () => {
    setSeedingStatus('Seeding database tables...');
    try {
      const res = await fetch(`${backendUrl}/api/v1/admin/seed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSeedingStatus(data.message);
      }
    } catch (err) {
      setSeedingStatus("Seeding failed. Verify DB connection is healthy.");
    }
  };

  const fraudTypes = [
    { type: 'unusual_amount', label: 'Unusual Amount ($1k+)', desc: 'Initiates high dollar transaction deviating from user baseline.' },
    { type: 'impossible_travel', label: 'Impossible Travel Velocity', desc: 'Fires transaction from far city mismatches last session location.' },
    { type: 'new_device', label: 'New Device Session ID', desc: 'Triggers payments from unrecognized browser fingerprint.' },
    { type: 'multiple_rapid', label: 'Multiple Rapid Transactions', desc: 'Spits high rate transaction waves from user footprint.' },
    { type: 'card_testing', label: 'Card Testing Microtransactions', desc: 'Emits successive micro card validation attempts.' },
    { type: 'night_activity', label: 'Night-Time Velocity Spike', desc: 'Forces transactions during early morning system dormancy.' }
  ];

  return (
    <div className="space-y-6">
      {/* Title & Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400 stroke-[2.5]" /> ADMIN MANAGEMENT CONTROL
        </h2>
        <p className="text-sm text-slate-400">Configure real-time parameters, seed mock context, and manage XGBoost classifiers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel 1: Simulator Controls */}
        <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-400" /> Transaction Simulator Orchestration
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Start or stop the background loop that feeds real-time transaction packets to the dashboard via WebSockets.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-slate-950/40 border-cardBorder/40">
            <div>
              <span className="text-xs font-bold text-slate-400">Simulator Status:</span>
              <span className={`text-xs font-bold ml-2 ${simulatorStatus.is_running ? 'text-emerald-400' : 'text-slate-500'}`}>
                {simulatorStatus.is_running ? 'ACTIVE BROADCASTING' : 'SUSPENDED'}
              </span>
            </div>
            
            <button
              onClick={handleToggleSimulator}
              disabled={togglingSim}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                simulatorStatus.is_running 
                  ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {simulatorStatus.is_running ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Simulator</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Simulator</span>
                </>
              )}
            </button>
          </div>

          {/* Inject Manual Frauds */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Manual Risk/Fraud Vectors Injection</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fraudTypes.map((f) => (
                <button
                  key={f.type}
                  onClick={() => handleInjectFraud(f.type)}
                  className="p-3 text-left bg-slate-950/40 hover:bg-slate-950/80 border border-cardBorder/40 rounded-xl transition-all group flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" /> {f.label}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 leading-normal">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: Model & Cache Database management */}
        <div className="space-y-6">
          
          {/* XGBoost Training Panel */}
          <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" /> XGBoost Model Pipeline Re-Training
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Triggers the background pipeline to load <b>creditcard.csv</b>, execute random under-sampling balancing, map the features, and output a new model binary.
            </p>
            
            <button
              onClick={handleTrainModel}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-Train Model
            </button>

            {trainingStatus && (
              <div className="p-3 bg-slate-950/50 border border-cardBorder/40 rounded-xl text-[10px] font-mono text-emerald-400">
                {trainingStatus}
              </div>
            )}
          </div>

          {/* Cache Telemetry and db controls */}
          <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" /> Cache Database Maintenance
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Clear dynamic caches (Redis key mappings and fallback in-memory buckets) to force cache misses and re-scoring updates.
            </p>

            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="py-2.5 px-4 bg-red-500/15 border border-red-500/20 hover:bg-red-500/25 text-red-400 font-bold text-xs tracking-wider uppercase rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" /> Flush Caches
            </button>
          </div>

          {/* Seeding Controls */}
          <div className="p-6 rounded-2xl glass-panel border border-cardBorder shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" /> Seeding & Reset Database
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Seed organization 'org_trustguard', create default analyst and administrator credential hashes if the database has been cleared.
            </p>

            <button
              onClick={handleSeedDatabase}
              className="py-2.5 px-4 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs tracking-wider uppercase rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Seed DB defaults
            </button>

            {seedingStatus && (
              <div className="p-3 bg-slate-950/50 border border-cardBorder/40 rounded-xl text-[10px] font-mono text-emerald-400">
                {seedingStatus}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default AdminControls;
