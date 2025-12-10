import React, { useEffect, useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { login, register, me } from '../api.js';
import { saveToken } from '../auth.js';
import { setPageSEO } from '../seo.js';
import ErrorBanner from '../components/ErrorBanner.jsx'

export default function AuthPage({ onAuthed, initialMode = 'login' }) {
  useEffect(() => {
    setPageSEO({
      title: 'Login / Register — ReviewsFlow',
      description: 'Access your ReviewsFlow dashboard to manage domains, instances and embed settings.',
    })
  }, [])
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        await register({ email, password });
      }

      const res = await login({ username: email, password });
      const token = res && (res.access_token || res.token || res.jwt);

      if (!token) throw new Error('No access token returned from server');

      saveToken(token);

      try { await me(); } catch { /* ignore */ }

      window.location.hash = '#/generator';
      if (onAuthed) onAuthed();

    } catch (err) {
      console.error(err);
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        {/* Background Decor */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="w-full max-w-md bg-[#09090b] border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">

          {/* Top Highlight Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 mb-4 shadow-inner">
              <Sparkles className="w-6 h-6 text-blue-500" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white mb-6">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>

            {/* --- TOP TOGGLE SWITCH --- */}
            <div className="grid grid-cols-2 p-1 bg-zinc-900/50 border border-zinc-800 rounded-lg relative">
              <button
                  onClick={() => { setMode('login'); setError(null); }}
                  className={`
                relative z-10 py-2 text-sm font-medium rounded-md transition-all duration-200
                ${mode === 'login'
                      ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}
              `}
              >
                Log In
              </button>
              <button
                  onClick={() => { setMode('register'); setError(null); }}
                  className={`
                relative z-10 py-2 text-sm font-medium rounded-md transition-all duration-200
                ${mode === 'register'
                      ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}
              `}
              >
                Sign Up
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-zinc-200 focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 outline-none transition-all placeholder:text-zinc-700"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-zinc-200 focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 outline-none transition-all placeholder:text-zinc-700"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (<ErrorBanner error={error} />)}

            {/* Submit Button */}
            <button
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-lg font-semibold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
              )}
            </button>
          </form>

        </div>
      </div>
  );
}
