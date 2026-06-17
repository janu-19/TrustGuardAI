import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import DashboardOverview from './components/DashboardOverview';
import LiveFeed from './components/LiveFeed';
import AlertsList from './components/AlertsList';
import TrustRankings from './components/TrustRankings';
import InvestigationPortal from './components/InvestigationPortal';
import AnalyticsCharts from './components/AnalyticsCharts';
import Heatmap from './components/Heatmap';
import AdminControls from './components/AdminControls';
import Login from './components/Login';

const BACKEND_URL = "http://localhost:8000";
const WS_URL = "ws://localhost:8000";

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, ratio: 0.0, fallback_mode: true });
  const [dbStats, setDbStats] = useState({ total_transactions: 0, flagged_transactions: 0, pending_reviews: 0, fraud_rate: 0.0 });
  const [simulatorStatus, setSimulatorStatus] = useState({ is_running: false, interval_seconds: 2.0 });
  const wsRef = useRef(null);

  // Load user data on startup if token exists
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
      fetchInitialTransactions();
      fetchCacheStats();
      fetchDbStats();
      fetchSimulatorStatus();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setTransactions([]);
      if (wsRef.current) {
        wsRef.current.close();
      }
    }
  }, [token]);

  // Set up WebSocket connection for real-time transaction streaming
  useEffect(() => {
    if (!token || !user) return;

    const connectWebSocket = () => {
      const socketUrl = `${WS_URL}/ws/transactions?token=${token}`;
      logger("Connecting to WebSocket feed...");
      const ws = new WebSocket(socketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        logger("WebSocket feed connected!");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "NEW_TRANSACTION") {
            const tx = payload.data;
            setTransactions(prev => [tx, ...prev].slice(0, 300)); // Cap local list at 300
            
            // Periodically refresh cache metrics and simulator telemetry
            fetchCacheStats();
            fetchDbStats();
            
            // Trigger browser notification or UI toast if flagged
            if (tx.is_flagged) {
              playAlertSound();
            }
          }
        } catch (err) {
          console.error("Error parsing websocket message:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        logger("WebSocket feed closed. Attempting reconnect...");
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (token) connectWebSocket();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, user]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  const fetchInitialTransactions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/transactions/?limit=100`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  const fetchCacheStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/admin/cache/stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCacheStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch cache stats:", err);
    }
  };

  const fetchSimulatorStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/admin/simulator/status`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatorStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch simulator status:", err);
    }
  };

  const fetchDbStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/transactions/stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDbStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch database stats:", err);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
  };

  const playAlertSound = () => {
    try {
      // Audio synth beep for quick visual/auditory confirmation
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 520; // 520Hz pitch
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // short beep
    } catch (e) {
      // Suppress sound context errors (e.g. user hasn't interacted with page yet)
    }
  };

  const logger = (msg) => {
    console.log(`[TrustGuard UI] ${msg}`);
  };

  if (!token) {
    return <Login setToken={setToken} backendUrl={BACKEND_URL} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-darkBg text-slate-100 font-sans">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
        isConnected={isConnected} 
      />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <DashboardOverview 
            transactions={transactions} 
            cacheStats={cacheStats}
            simulatorStatus={simulatorStatus}
            setActiveTab={setActiveTab}
            setSelectedTxId={setSelectedTxId}
            dbStats={dbStats}
          />
        )}
        
        {activeTab === 'live-feed' && (
          <LiveFeed 
            transactions={transactions} 
            setSelectedTxId={setSelectedTxId}
            setActiveTab={setActiveTab}
          />
        )}
        
        {activeTab === 'alerts' && (
          <AlertsList 
            transactions={transactions} 
            setTransactions={setTransactions}
            token={token}
            backendUrl={BACKEND_URL}
            setSelectedTxId={setSelectedTxId}
            setActiveTab={setActiveTab}
            fetchCacheStats={fetchCacheStats}
            fetchDbStats={fetchDbStats}
          />
        )}
        
        {activeTab === 'users' && (
          <TrustRankings 
            token={token} 
            backendUrl={BACKEND_URL} 
          />
        )}
        
        {activeTab === 'reports' && (
          <InvestigationPortal 
            selectedTxId={selectedTxId} 
            setSelectedTxId={setSelectedTxId}
            transactions={transactions}
            token={token} 
            backendUrl={BACKEND_URL}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsCharts 
            transactions={transactions} 
          />
        )}

        {activeTab === 'heatmap' && (
          <Heatmap 
            transactions={transactions} 
          />
        )}
        
        {activeTab === 'admin' && (
          <AdminControls 
            token={token} 
            backendUrl={BACKEND_URL} 
            simulatorStatus={simulatorStatus}
            fetchSimulatorStatus={fetchSimulatorStatus}
            cacheStats={cacheStats}
            fetchCacheStats={fetchCacheStats}
          />
        )}
      </main>
      
      <footer className="py-4 text-center border-t border-cardBorder/40 bg-cardBg/30 text-xs text-slate-500">
        <p>TrustGuard AI Fraud Intelligence Platform &copy; 2026. Inspired by Stripe & TrustGuard Risk Infrastructure.</p>
      </footer>
    </div>
  );
}

export default App;
