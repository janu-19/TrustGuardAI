import React from 'react';
import { Shield, LayoutDashboard, Radio, AlertTriangle, Users, FileText, BarChart3, Settings, LogOut, Map } from 'lucide-react';

function Navbar({ activeTab, setActiveTab, user, onLogout, isConnected }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-feed', label: 'Live Feed', icon: Radio },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'users', label: 'Trust Rankings', icon: Users },
    { id: 'reports', label: 'AI Reports', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'heatmap', label: 'Heatmap', icon: Map },
    { id: 'admin', label: 'Admin Panel', icon: Settings },
  ];

  return (
    <header className="w-full bg-cardBg/80 backdrop-blur-md border-b border-cardBorder/60 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Brand Logo & Connection Status */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <Shield className="w-6 h-6 text-indigo-400 stroke-[2.5]" />
            <span className="font-extrabold tracking-wider bg-gradient-to-r from-indigo-300 via-purple-300 to-emerald-300 bg-clip-text text-transparent">
              TRUSTGUARD
            </span>
          </div>
          
          {/* Active Connection Indicator */}
          <div className="flex items-center space-x-2 bg-slate-950/60 border border-cardBorder px-2.5 py-1 rounded-full text-xs font-semibold">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 glow-green' : 'bg-red-500 glow-red animate-pulse'}`}></span>
            <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
              {isConnected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive 
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label.toUpperCase()}</span>
              </button>
            );
          })}
        </nav>

        {/* User context & Logout */}
        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-xs font-bold text-slate-300">{user.username.toUpperCase()}</span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{user.role} | {user.organization_id}</span>
            </div>
          )}
          
          <button
            onClick={onLogout}
            className="flex items-center justify-center p-2 rounded-xl border border-cardBorder bg-slate-950/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 active:scale-95 transition-all"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex overflow-x-auto border-t border-cardBorder/40 px-2 py-1.5 space-x-1 bg-slate-950/20">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap tracking-wide transition-all ${
                isActive 
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                  : 'text-slate-400 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

export default Navbar;
