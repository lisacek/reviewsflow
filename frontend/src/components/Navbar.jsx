import React from 'react';
import {Globe, Layout, LogIn, Sparkles, LogOut, Zap, Star, Code} from 'lucide-react';

// Extracted to avoid creating components during render
const NavItem = ({view, label, icon: Icon, activeView, onSetView}) => (
    <button
        onClick={() => onSetView(view)}
        className={`
        relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
        ${activeView === view
            ? 'text-white bg-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.5)] ring-1 ring-white/10'
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'}
      `}
    >
        <Icon className="w-4 h-4"/>
        {label}
    </button>
);

export default function Navbar({
                                   apiOnline,
                                   navView,
                                   setNavView,
                                   authed,
                                   setAuthMode,
                                   clearToken,
                               setAuthed
                           }) {
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-xl">
            {/* Přidáno 'relative' pro absolutní pozicování potomka */}
            <div className="relative mx-auto px-6 h-16 flex items-center justify-between">

                {/* LEFT: Logo */}
                <div onClick={() => setNavView("landing")} className="flex items-center gap-3">
                    <div className="relative group cursor-pointer" onClick={() => setNavView('generator')}>
                        <div
                            className="absolute -inset-1  rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
                        <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                            <Star className="w-3 h-3 text-white fill-white"/>
                        </div>
                    </div>
                    <span className="font-bold text-lg tracking-tight text-zinc-100">
                        Review<span className="text-zinc-500">Flow</span>
                    </span>
                </div>

                {/* CENTER: Navigation - NYNÍ ABSOLUTNĚ UPROSTŘED */}
                <div
                    className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center p-1 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
                    <NavItem view="generator" label="Widget Builder" icon={Layout} activeView={navView} onSetView={setNavView}/>
                    <NavItem view="api" label="API Docs" icon={Code} activeView={navView} onSetView={setNavView}/>
                    {/* You can add more tabs here easily */}
                </div>

                {/* RIGHT: Actions */}
                <div className="flex items-center gap-4">

                    {/* API Status Indicator */}
                    <div
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800">
                        <div className="relative flex h-2 w-2">
                            <span
                                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${apiOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span
                                className={`relative inline-flex rounded-full h-2 w-2 ${apiOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                            {apiOnline ? 'System Normal' : 'Offline'}
                        </span>
                    </div>

                    <div className="h-4 w-px bg-zinc-800 hidden sm:block"></div>

                    {/* Auth Actions */}
                    {!authed ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setAuthMode('login');
                                    setNavView('auth');
                                }}
                                className="text-sm font-medium text-zinc-400 hover:text-white px-3 py-2 transition-colors"
                            >
                                Log in
                            </button>
                            <button
                                onClick={() => {
                                    setAuthMode('register');
                                    setNavView('auth');
                                }}
                                className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-black transition-all duration-200 bg-white font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:bg-zinc-200"
                            >
                                <Sparkles className="w-3.5 h-3.5 mr-2 text-blue-600"/>
                                Get Started
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                clearToken();
                                setAuthed(false);
                                setNavView('generator');
                            }}
                            className="flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-md transition-all border border-red-400/20"
                        >
                            <LogOut className="w-3.5 h-3.5"/>
                            Sign out
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
