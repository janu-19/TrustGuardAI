import React, { useState } from 'react';
import { Map, AlertCircle, ShieldCheck } from 'lucide-react';

const CITIES_COORDS = {
  "Mumbai": { x: "65%", y: "58%", country: "IN" },
  "Bengaluru": { x: "66%", y: "63%", country: "IN" },
  "New York": { x: "28%", y: "38%", country: "US" },
  "San Francisco": { x: "15%", y: "42%", country: "US" },
  "London": { x: "48%", y: "30%", country: "GB" },
  "Tokyo": { x: "84%", y: "42%", country: "JP" },
  "Singapore": { x: "72%", y: "65%", country: "SG" },
  "Dubai": { x: "59%", y: "52%", country: "AE" }
};

function Heatmap({ transactions }) {
  const [hoveredCity, setHoveredCity] = useState(null);

  // Group transaction stats by city
  const cityStats = {};
  
  // Initialize defaults
  Object.keys(CITIES_COORDS).forEach(c => {
    cityStats[c] = { count: 0, avgRisk: 0, alerts: 0, totalAmount: 0 };
  });

  transactions.forEach(t => {
    const city = t.city;
    if (cityStats[city]) {
      cityStats[city].count += 1;
      cityStats[city].totalAmount += t.amount;
      cityStats[city].avgRisk += t.risk_score;
      if (t.is_flagged) {
        cityStats[city].alerts += 1;
      }
    }
  });

  // Calculate averages
  Object.keys(cityStats).forEach(c => {
    const s = cityStats[c];
    s.avgRisk = s.count > 0 ? (s.avgRisk / s.count).toFixed(1) : "0.0";
    s.totalAmount = s.totalAmount.toFixed(2);
  });

  const getCityGlowColor = (risk) => {
    const r = parseFloat(risk);
    if (r > 60) return "fill-red-500 stroke-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]";
    if (r > 30) return "fill-amber-500 stroke-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]";
    return "fill-emerald-500 stroke-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]";
  };

  const getCityGlowClass = (risk) => {
    const r = parseFloat(risk);
    if (r > 60) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (r > 30) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Map className="w-6 h-6 text-indigo-400 stroke-[2.5]" /> GLOBAL FRAUD CLUSTERS
        </h2>
        <p className="text-sm text-slate-400">Interactive geo-spatial heat map illustrating city risk score centroids and alerts density.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: City Info panel */}
        <div className="lg:col-span-1 rounded-2xl glass-panel border border-cardBorder p-6 shadow-xl flex flex-col justify-between h-[450px]">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Location Assessment</h3>
            
            {hoveredCity ? (
              <div className="space-y-6">
                <div>
                  <span className="text-2xl font-extrabold text-slate-100">{hoveredCity}</span>
                  <span className="text-xs text-slate-500 block">Country: {CITIES_COORDS[hoveredCity].country}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-cardBorder/40">
                    <span className="text-slate-500 block uppercase text-[9px] font-bold">Risk Index</span>
                    <span className={`text-lg font-extrabold block ${
                      parseFloat(cityStats[hoveredCity].avgRisk) > 60 
                        ? 'text-red-400' 
                        : parseFloat(cityStats[hoveredCity].avgRisk) > 30 
                          ? 'text-amber-400' 
                          : 'text-emerald-400'
                    }`}>
                      {cityStats[hoveredCity].avgRisk}%
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/40 rounded-xl border border-cardBorder/40">
                    <span className="text-slate-500 block uppercase text-[9px] font-bold">Active Alerts</span>
                    <span className="text-lg font-extrabold text-slate-200 block">{cityStats[hoveredCity].alerts}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between border-b border-cardBorder/20 py-1.5">
                    <span>Transaction Volume</span>
                    <span className="font-bold text-slate-300">{cityStats[hoveredCity].count}</span>
                  </div>
                  <div className="flex justify-between border-b border-cardBorder/20 py-1.5">
                    <span>Aggregate Amount</span>
                    <span className="font-bold text-slate-300">${parseFloat(cityStats[hoveredCity].totalAmount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs text-center space-y-2">
                <Map className="w-8 h-8 text-slate-600" />
                <p>Hover on a global location centroid to retrieve risk parameters.</p>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl border bg-slate-950/30 border-cardBorder/40 text-[10px] text-slate-500 leading-normal">
            Centroids adjust dynamically based on transaction velocity, city codes, and flagged fraud incidents.
          </div>
        </div>

        {/* Right Side: Global map SVG layout */}
        <div className="lg:col-span-3 rounded-2xl glass-panel border border-cardBorder p-6 shadow-xl flex items-center justify-center relative overflow-hidden bg-slate-950/20 h-[450px]">
          {/* Stylized dark grid map background */}
          <svg className="w-full h-full opacity-30 pointer-events-none" viewBox="0 0 800 400" fill="none" stroke="currentColor">
            {/* Horizontal grid lines */}
            <line x1="0" y1="50" x2="800" y2="50" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="0" y1="150" x2="800" y2="150" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="0" y1="200" x2="800" y2="200" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="0" y1="250" x2="800" y2="250" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="0" y1="300" x2="800" y2="300" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="0" y1="350" x2="800" y2="350" stroke="#1e293b" strokeWidth="0.5" />

            {/* Vertical grid lines */}
            <line x1="100" y1="0" x2="100" y2="400" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="200" y1="0" x2="200" y2="400" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="300" y1="0" x2="300" y2="400" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="400" y1="0" x2="400" y2="400" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="500" y1="0" x2="500" y2="400" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="600" y1="0" x2="600" y2="400" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="700" y1="0" x2="700" y2="400" stroke="#1e293b" strokeWidth="0.5" />
          </svg>

          {/* Centroids overlays */}
          <div className="absolute inset-0 w-full h-full">
            {Object.entries(CITIES_COORDS).map(([city, coord]) => {
              const stats = cityStats[city];
              const risk = stats ? stats.avgRisk : 0;
              const hasTx = stats ? stats.count > 0 : false;
              
              return (
                <div 
                  key={city}
                  className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: coord.x, top: coord.y }}
                  onMouseEnter={() => setHoveredCity(city)}
                  onMouseLeave={() => setHoveredCity(null)}
                >
                  {/* Pulsating ring for high risk */}
                  {hasTx && parseFloat(risk) > 40 && (
                    <div className="absolute -inset-1.5 w-6 h-6 rounded-full border border-red-500/30 bg-red-500/10 animate-ping opacity-60"></div>
                  )}

                  {/* Centroid dot */}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 10 10">
                    <circle 
                      cx="5" 
                      cy="5" 
                      r="4.5" 
                      className={`${getCityGlowColor(risk)} transition-all`}
                    />
                  </svg>
                  
                  {/* Floating tooltip badge */}
                  <div className="absolute left-6 -top-3 scale-0 group-hover:scale-100 transition-all origin-left px-2 py-1 rounded bg-slate-950 border border-cardBorder text-[9px] font-bold whitespace-nowrap z-50">
                    {city}: {risk}% Risk
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-4 left-6 flex items-center space-x-4 text-[9px] font-bold tracking-wider text-slate-500 uppercase">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 glow-green"></span>
              <span>Trusted</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 glow-yellow"></span>
              <span>Elevated Risk</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 glow-red animate-pulse"></span>
              <span>High Risk Centroid</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Heatmap;
