import React, { useState } from 'react';

function Login({ setToken, backendUrl }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('analyst');
  const [password, setPassword] = useState('analyst123');
  const [orgId, setOrgId] = useState('org_trustguard');
  const [orgName, setOrgName] = useState('TrustGuard Risk');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        if (isLogin) {
        // Use JSON login endpoint for simpler fetch behavior
        const res = await fetch(`${backendUrl}/api/v1/auth/login_json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (res.ok) {
          const data = await res.json();
          setToken(data.access_token);
        } else {
          const errData = await res.json();
          setError(errData.detail || "Authentication failed. Check credentials.");
        }
      } else {
        // Sign Up Flow
        // 1. Create Organization first
        const orgRes = await fetch(`${backendUrl}/api/v1/auth/organization`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: orgId, name: orgName })
        });
        
        // Ignore error if organization already exists, just continue to user signup
        
        // 2. Create User
        const userRes = await fetch(`${backendUrl}/api/v1/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username,
            password: password,
            role: "analyst",
            organization_id: orgId
          })
        });

        if (userRes.ok) {
          // Immediately log in
          setIsLogin(true);
          setLoading(false);
          setError("Account created successfully! Please click Login to continue.");
        } else {
          const errData = await userRes.json();
          setError(errData.detail || "Registration failed. Try a different username.");
        }
      }
    } catch (err) {
      setError("Unable to connect to backend server. Make sure the FastAPI app is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-darkBg text-slate-100 font-sans">
      <div className="absolute top-10 flex items-center space-x-3">
        <span className="text-3xl">🛡️</span>
        <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
          TRUSTGUARD AI
        </h1>
      </div>

      <div className="w-full max-w-md p-8 rounded-2xl glass-panel glow-indigo border border-cardBorder shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex border-b border-cardBorder/60 mb-6">
          <button 
            type="button"
            className={`flex-1 pb-3 text-sm font-semibold tracking-wide transition-colors ${isLogin ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            SIGN IN
          </button>
          <button 
            type="button"
            className={`flex-1 pb-3 text-sm font-semibold tracking-wide transition-colors ${!isLogin ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            CREATE ORGANIZATION
          </button>
        </div>

        <h2 className="text-xl font-bold mb-4 text-slate-200">
          {isLogin ? "Sign In to Risk Dashboard" : "Register New Merchant Org"}
        </h2>

        {error && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${error.includes('successfully') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Organization ID</label>
                <input 
                  type="text" 
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className="w-full px-4 py-2.5 bg-slate-950/60 rounded-xl border border-cardBorder focus:border-indigo-500 focus:outline-none text-slate-100 text-sm"
                  placeholder="e.g. org_trustguard"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Merchant Name</label>
                <input 
                  type="text" 
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 rounded-xl border border-cardBorder focus:border-indigo-500 focus:outline-none text-slate-100 text-sm"
                  placeholder="e.g. TrustGuard India Pvt Ltd"
                  required
                />
              </div>
            </>
          )}

          {isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Select Organization</label>
              <input 
                type="text" 
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 rounded-xl border border-cardBorder focus:border-indigo-500 focus:outline-none text-slate-100 text-sm"
                placeholder="org_trustguard"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950/60 rounded-xl border border-cardBorder focus:border-indigo-500 focus:outline-none text-slate-100 text-sm"
              placeholder="analyst"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950/60 rounded-xl border border-cardBorder focus:border-indigo-500 focus:outline-none text-slate-100 text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 mt-2 font-bold tracking-wide uppercase rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white shadow-lg shadow-indigo-600/30 transition-all text-sm disabled:opacity-50"
          >
            {loading ? "PROCESSING..." : (isLogin ? "SIGN IN" : "REGISTER")}
          </button>
        </form>

        {isLogin && (
          <div className="mt-6 text-center text-xs text-slate-500">
            <p>Demo accounts available: <b>analyst / analyst123</b> or <b>admin / admin123</b></p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
