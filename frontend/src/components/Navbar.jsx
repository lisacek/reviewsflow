import React, { useState } from 'react';
import { Globe, Layout, LogIn, Sparkles, LogOut, Zap, Star, Code, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Extracted to avoid creating components during render
const NavItem = ({view, label, icon: Icon, activeView, onSetView, mobile = false}) => (
    <button
        onClick={() => onSetView(view)}
        className={`
        relative rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
        ${mobile
            ? 'w-full px-4 py-3 text-left hover:bg-zinc-800/50'
            : 'px-3 py-1.5'}
        ${activeView === view
            ? (mobile ? 'text-white bg-zinc-800' : 'text-white bg-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.5)] ring-1 ring-white/10')
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleMobileNav = (view) => {
        setNavView(view);
        setIsMobileMenuOpen(false);
    };

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-xl">
            <div className="relative mx-auto px-6 h-16 flex items-center justify-between">

                {/* LEFT: Logo */}
                <div onClick={() => setNavView("landing")} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                        <div className="absolute -inset-1 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-500 bg-blue-600/50"></div>
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center relative">
                            <Star className="w-4 h-4 text-white fill-white"/>
                        </div>
                    </div>
                    <span className="font-bold text-lg tracking-tight text-zinc-100">
                        Reviews<span className="text-zinc-500">Flow</span>
                    </span>
                </div>

                {/* CENTER: Navigation (Desktop) */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center p-1 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
                    <NavItem view="generator" label="Widget Builder" icon={Layout} activeView={navView} onSetView={setNavView}/>
                    <NavItem view="api" label="API Docs" icon={Code} activeView={navView} onSetView={setNavView}/>
                </div>

                {/* RIGHT: Actions */}
                <div className="flex items-center gap-3 md:gap-4">

                    {/* API Status */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800">
                        <div className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${apiOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${apiOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
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
                                onClick={() => { setAuthMode('login'); setNavView('auth'); setIsMobileMenuOpen(false); }}
                                className="hidden sm:block text-sm font-medium text-zinc-400 hover:text-white px-3 py-2 transition-colors"
                            >
                                Log in
                            </button>
                            <button
                                onClick={() => { setAuthMode('register'); setNavView('auth'); setIsMobileMenuOpen(false); }}
                                className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-black transition-all duration-200 bg-white font-pj rounded-full focus:outline-none hover:bg-zinc-200"
                            >
                                <Sparkles className="w-3.5 h-3.5 mr-2 text-blue-600"/>
                                <span className="hidden sm:inline">Get Started</span>
                                <span className="sm:hidden">Start</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { clearToken(); setAuthed(false); setNavView('generator'); setIsMobileMenuOpen(false); }}
                            className="flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-md transition-all border border-red-400/20"
                        >
                            <LogOut className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Sign out</span>
                        </button>
                    )}

                    {/* HAMBURGER MENU (Mobile Only) */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* MOBILE DROPDOWN (Absolute Positioned to prevent pushing content) */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        // Changed class here: absolute positioning
                        className="absolute top-full left-0 w-full border-b border-zinc-800 bg-[#09090b] shadow-2xl overflow-hidden md:hidden z-40"
                    >
                        <div className="p-4 flex flex-col gap-2">
                            <NavItem view="generator" label="Widget Builder" icon={Layout} activeView={navView} onSetView={handleMobileNav} mobile />
                            <NavItem view="api" label="API Documentation" icon={Code} activeView={navView} onSetView={handleMobileNav} mobile />

                            {/* Mobile Auth Links */}
                            {!authed && (
                                <button
                                    onClick={() => { setAuthMode('login'); setNavView('auth'); setIsMobileMenuOpen(false); }}
                                    className="w-full px-4 py-3 text-left text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg flex items-center gap-2 sm:hidden"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Log in
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}