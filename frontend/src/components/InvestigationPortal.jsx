import React, { useState, useEffect } from 'react';
import { Eye, FileText, Search, Play, RefreshCw, CheckCircle2, ChevronRight, User } from 'lucide-react';

function InvestigationPortal({ selectedTxId, setSelectedTxId, transactions, token, backendUrl, onLogout }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeAgentTab, setActiveAgentTab] = useState('summary'); // "summary", "investigator", "analyst"
  const [reinvestigating, setReinvestigating] = useState(false);

  // Filter flagged transactions that have reports
  const flaggedTxs = transactions.filter(t => t.is_flagged || t.status === "HIGH_RISK");

  useEffect(() => {
    if (selectedTxId) {
      fetchReport(selectedTxId);
    } else if (flaggedTxs.length > 0) {
      setSelectedTxId(flaggedTxs[0].transaction_id);
    }
  }, [selectedTxId]);

  const fetchReport = async (txId) => {
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch(`${backendUrl}/api/v1/reports/${txId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else if (res.status === 401 && onLogout) {
        onLogout();
      }
    } catch (err) {
      console.error("Failed to fetch report:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReinvestigate = async () => {
    if (!selectedTxId) return;
    setReinvestigating(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/reports/${selectedTxId}/reinvestigate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else if (res.status === 401 && onLogout) {
        onLogout();
      }
    } catch (err) {
      console.error("Reinvestigate failed:", err);
    } finally {
      setReinvestigating(false);
    }
  };

  // Convert raw markdown strings into clean structured elements (since we want premium readability)
  const renderMarkdown = (mdText) => {
    if (!mdText) return null;
    
    // Very clean, simple parser that handles titles, tables, bullet points, and quotes
    const lines = mdText.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-xl font-bold text-slate-100 border-b border-cardBorder/60 pb-2 mb-4 mt-6">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-base font-extrabold text-slate-200 mt-6 mb-3">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-bold text-slate-300 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className="ml-4 list-disc text-slate-300 text-xs py-1">{line.replace(/^[-*]\s+/, '')}</li>;
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="p-3 my-3 border-l-4 border-l-indigo-500 bg-slate-950/40 rounded-r-xl text-xs italic text-slate-400">
            {line.replace('> ', '')}
          </blockquote>
        );
      }
      if (line.startsWith('|') && line.includes('---')) {
        // Divider row
        return null;
      }
      if (line.startsWith('|')) {
        // Table row helper
        const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
        // Check if header row (just styling)
        const isHeader = idx > 0 && lines[idx - 1].startsWith('#');
        return (
          <div key={idx} className={`flex text-xs py-2 px-4 justify-between border-b border-cardBorder/30 ${isHeader ? 'bg-slate-900/60 font-bold' : ''}`}>
            <span className="text-slate-400">{cols[0]}</span>
            <span className="font-mono text-slate-200">{cols[1]}</span>
          </div>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2"></div>;
      }
      return <p key={idx} className="text-xs text-slate-300 leading-relaxed mb-2">{line}</p>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400 stroke-[2.5]" /> AGENTIC AI INVESTIGATION PORTAL
          </h2>
          <p className="text-sm text-slate-400">LangGraph automated investigation workflows (Investigator &rarr; Analyst &rarr; Report Generator).</p>
        </div>

        {selectedTxId && (
          <button
            onClick={handleReinvestigate}
            disabled={reinvestigating || loading}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
          >
            {reinvestigating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>INVESTIGATING...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>RE-RUN AI AGENTS</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Flagged transactions checklist */}
        <div className="lg:col-span-1 rounded-2xl glass-panel border border-cardBorder overflow-hidden shadow-xl h-[600px] flex flex-col">
          <div className="p-4 bg-slate-950/40 border-b border-cardBorder flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Flagged Alerts</span>
            <Search className="w-4 h-4 text-slate-500" />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-cardBorder/30">
            {flaggedTxs.length > 0 ? (
              flaggedTxs.map((tx) => (
                <div
                  key={tx.transaction_id}
                  onClick={() => setSelectedTxId(tx.transaction_id)}
                  className={`p-4 cursor-pointer transition-colors flex items-center justify-between ${
                    selectedTxId === tx.transaction_id
                      ? 'bg-indigo-600/10 border-r-2 border-r-indigo-500'
                      : 'hover:bg-slate-950/20'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-200">{tx.merchant}</div>
                    <div className="text-[10px] text-slate-500">{tx.transaction_id} &bull; {tx.user_id}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs font-extrabold text-slate-100">${tx.amount.toFixed(2)}</div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold border border-red-500/20 bg-red-500/10 text-red-400">
                      {tx.risk_score}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">No flagged anomalies in current session.</div>
            )}
          </div>
        </div>

        {/* Right Side: Agent visualizer and final report markdown viewer */}
        <div className="lg:col-span-2 space-y-6 flex flex-col h-[600px]">
          
          {/* Agent Workflow Progress visualizer */}
          <div className="p-4 rounded-2xl glass-panel border border-cardBorder shadow-lg">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Agent Node Workflow State</div>
            
            <div className="flex items-center justify-between max-w-lg mx-auto text-xs font-semibold text-slate-400">
              {/* Node 1: Investigator */}
              <div className="flex flex-col items-center space-y-1.5">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold ${
                  loading || reinvestigating 
                    ? 'border-indigo-500/40 text-indigo-400 animate-pulse' 
                    : report 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'border-cardBorder text-slate-500'
                }`}>
                  1
                </div>
                <span>Investigator</span>
              </div>

              <ChevronRight className="w-5 h-5 text-cardBorder" />

              {/* Node 2: Analyst */}
              <div className="flex flex-col items-center space-y-1.5">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold ${
                  reinvestigating 
                    ? 'border-indigo-500/40 text-indigo-400 animate-pulse' 
                    : report 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'border-cardBorder text-slate-500'
                }`}>
                  2
                </div>
                <span>Risk Analyst</span>
              </div>

              <ChevronRight className="w-5 h-5 text-cardBorder" />

              {/* Node 3: Report Generator */}
              <div className="flex flex-col items-center space-y-1.5">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold ${
                  reinvestigating 
                    ? 'border-indigo-500/40 text-indigo-400 animate-pulse' 
                    : report 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'border-cardBorder text-slate-500'
                }`}>
                  3
                </div>
                <span>Report Gen</span>
              </div>
            </div>
          </div>

          {/* Central Report display panel */}
          <div className="flex-1 rounded-2xl glass-panel border border-cardBorder overflow-hidden shadow-xl flex flex-col">
            <div className="p-2 bg-slate-950/40 border-b border-cardBorder flex space-x-1 text-xs">
              <button
                onClick={() => setActiveAgentTab('summary')}
                className={`px-4 py-1.5 rounded-lg font-bold tracking-wide transition-all uppercase ${
                  activeAgentTab === 'summary' ? 'bg-indigo-600/15 text-indigo-400' : 'text-slate-400'
                }`}
              >
                Markdown Report
              </button>
              
              <button
                onClick={() => setActiveAgentTab('investigator')}
                className={`px-4 py-1.5 rounded-lg font-bold tracking-wide transition-all uppercase ${
                  activeAgentTab === 'investigator' ? 'bg-indigo-600/15 text-indigo-400' : 'text-slate-400'
                }`}
              >
                Investigator Logs
              </button>
              
              <button
                onClick={() => setActiveAgentTab('analyst')}
                className={`px-4 py-1.5 rounded-lg font-bold tracking-wide transition-all uppercase ${
                  activeAgentTab === 'analyst' ? 'bg-indigo-600/15 text-indigo-400' : 'text-slate-400'
                }`}
              >
                Analyst Logs
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-cardBg/10">
              {loading || reinvestigating ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                  <span className="text-sm font-semibold tracking-wide text-indigo-400/80">LANGGRAPH NODES RUNNING...</span>
                </div>
              ) : report ? (
                <>
                  {activeAgentTab === 'summary' && (
                    <div className="prose prose-invert max-w-none space-y-1">
                      {renderMarkdown(report.report_summary)}
                    </div>
                  )}

                  {activeAgentTab === 'investigator' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-200">Investigator Agent Raw Analysis Output</h3>
                      <pre className="p-4 bg-slate-950 rounded-xl border border-cardBorder text-[10px] font-mono text-emerald-400 overflow-x-auto">
                        {JSON.stringify(report.investigator_analysis, null, 2)}
                      </pre>
                    </div>
                  )}

                  {activeAgentTab === 'analyst' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-200">Risk Analyst Agent Raw Analysis Output</h3>
                      <pre className="p-4 bg-slate-950 rounded-xl border border-cardBorder text-[10px] font-mono text-emerald-400 overflow-x-auto">
                        {JSON.stringify(report.analyst_analysis, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  Select a flagged transaction or trigger an investigation to generate a report.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default InvestigationPortal;
