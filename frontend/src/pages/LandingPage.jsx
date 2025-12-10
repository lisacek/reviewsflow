import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Zap, Code2, Globe,
    Layout, Star, ArrowRight, CheckCircle2, Terminal, Copy, Check, Github
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CodePreviewSection from "../components/CodePreviewSection.jsx";
import { setPageSEO } from "../seo.js";

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0, filter: 'blur(4px)' },
    visible: {
        y: 0,
        opacity: 1,
        filter: 'blur(0px)',
        transition: { type: "spring", stiffness: 100, damping: 20 }
    }
};

// Added onReadDocs prop to handle navigation
export default function LandingPage({onLogin, onRegister, authed, onReadDocs}) {
    useEffect(() => {
        setPageSEO({
            title: 'ReviewsFlow — Self‑Hosted Reviews Widget',
            description: 'Build and embed a self‑hosted Google Reviews widget. Own your data, control domains, and avoid monthly SaaS fees.',
        })
    }, [])

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-blue-500/30 relative overflow-hidden">
            <BackgroundGrid />

            {/* --- HERO SECTION --- */}
            <section className="relative pt-24 pb-32 px-6">
                {/* Main Top Gradient Blob */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] -z-10 pointer-events-none"
                />

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-4xl mx-auto text-center relative z-10"
                >
                    <motion.div variants={itemVariants}>
                        <div
                            className="inline-flex items-center px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs font-medium text-blue-400 mb-6 backdrop-blur-sm">
                            <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                            v1.0 Self-Hosted Beta
                        </div>
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="mb-6 text-5xl md:text-7xl font-bold tracking-tight leading-tight">
                        <span className="block pb-2">
                          Google Reviews,
                        </span>
                        <span className="block text-white leading-[1.15]">
                          Without the Monthly Fees.
                        </span>
                    </motion.h1>

                    <motion.p variants={itemVariants} className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        A self-hosted widget builder that proxies Google API requests.
                        Secure your keys, lock to specific domains, and embed with a single line of code.
                    </motion.p>

                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={onRegister}
                            className="group h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-[0_0_30px_-10px_rgba(37,99,235,0.6)] hover:shadow-[0_0_40px_-5px_rgba(37,99,235,0.8)] flex items-center gap-2"
                        >
                            Start Building <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                        </button>
                        {!authed && <button
                            onClick={onLogin}
                            className="h-12 px-8 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white text-zinc-200 font-medium transition-all backdrop-blur-sm"
                        >
                            Log In
                        </button>}
                    </motion.div>
                </motion.div>
            </section>


            {/* --- SECTION HEADER --- */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12 mt-20 relative z-10"
            >
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest bg-black/60 backdrop-blur-md px-6 py-1 rounded-full inline-block relative z-10 border border-zinc-800/50">
                    Simple Copy-Paste Integration
                </h3>
                {/* Decorative line behind text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[300px] h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent -z-10 opacity-50"></div>
            </motion.div>

            {/* --- CODE PREVIEW SECTION --- */}
            <CodePreviewSection/>


            {/* --- QUICK INSTALL SECTION --- */}
            <section className="py-20 px-6 border-t border-zinc-900/50 bg-zinc-950/30">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">Go self-hosted with Quick Install</h2>
                        <p className="text-zinc-400 text-lg">Get up and running in seconds with Docker Compose.</p>
                    </motion.div>

                    <InstallTabs />

                    {/* --- CUSTOM INTEGRATION FOLLOW-UP --- */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mt-8 max-w-3xl mx-auto"
                    >
                        {/* Divider */}
                        <div className="flex items-center gap-4 mb-8 opacity-60">
                            <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent flex-1" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Or Integrate Our API</span>
                            <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent flex-1" />
                        </div>

                        {/* Integration Card */}
                        <div className="relative group p-1 rounded-2xl bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                            <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6 bg-[#09090b] rounded-xl">
                                <div className="flex-shrink-0 w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 text-blue-400 shadow-inner">
                                    <Code2 className="w-8 h-8" />
                                </div>
                                <div className="text-center sm:text-left flex-1">
                                    <h3 className="text-lg font-bold text-zinc-100 mb-1">Custom API Integration</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        Need full control? Skip the widget builder and fetch raw JSON data programmatically using our REST endpoints.
                                    </p>
                                </div>
                                <button
                                    onClick={onReadDocs}
                                    className="flex-shrink-0 px-6 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_-3px_rgba(255,255,255,0.2)]"
                                >
                                    API Docs <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </section>

            {/* --- FEATURES GRID (Same as before) --- */}
            <section className="py-32 px-6 relative">
                {/* Secondary animated background blob */}
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.2, 0.3, 0.2],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute top-1/4 right-0 translate-x-1/3 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -z-10 pointer-events-none"
                />

                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">Architecture & Security</h2>
                        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Why developers prefer self-hosting their review widgets over relying on third-party services.</p>
                    </motion.div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        <FeatureCard
                            icon={ShieldCheck}
                            title="Domain Locking"
                            description="Your API key is never exposed. Requests are proxied and only allowed from domains you explicitly whitelist."
                        />
                        <FeatureCard
                            icon={Zap}
                            title="Aggressive Caching"
                            description="We cache Google API responses to minimize quota usage and ensure your site loads instantly, even if Google is slow."
                        />
                        <FeatureCard
                            icon={Layout}
                            title="Headless or UI"
                            description="Use our pre-built, beautiful React widget, or fetch the raw JSON data to build your own custom UI."
                        />
                        <FeatureCard
                            icon={Globe}
                            title="Multi-Locale"
                            description="Serve reviews in multiple languages. Our widget automatically adapts to the user's browser locale settings."
                        />
                        <FeatureCard
                            icon={Code2}
                            title="Zero Dependencies"
                            description="The generated widget script is standalone. No React or heavy libraries required on the client side."
                        />
                        <FeatureCard
                            icon={Star}
                            title="Smart Filtering"
                            description="Only show your best side. Automatically filter out reviews below 4 stars or reviews without text."
                        />
                    </motion.div>
                </div>
            </section>

            {/* --- HOW IT WORKS (Same as before) --- */}
            <section className="py-32 px-6 border-t border-zinc-900/50 bg-zinc-950/30 relative overflow-hidden">
                {/* Bottom subtle blob */}
                <div className="absolute bottom-0 left-1/4 -translate-x-1/2 translate-y-1/2 w-[800px] h-[500px] bg-blue-900/10 rounded-full blur-[150px] -z-10 pointer-events-none" />

                <div className="max-w-4xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl font-bold mb-16 text-center bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent"
                    >
                        Deployment Workflow
                    </motion.h2>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className="space-y-6"
                    >
                        <Step
                            num="01"
                            title="Create an Instance"
                            desc="Paste your Google Maps URL into the Builder. Configure filters, sorting, and caching rules."
                        />
                        <Step
                            num="02"
                            title="Whitelist Domain"
                            desc="Add your production domain (e.g., myshop.com) to the security settings to prevent API theft."
                        />
                        <Step
                            num="03"
                            title="Embed & Forget"
                            desc="Copy the generated HTML snippet. The widget will auto-refresh reviews in the background."
                        />
                    </motion.div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="py-12 border-t border-zinc-900 text-center relative z-10 bg-black">
                <div className="flex items-center justify-center gap-3 font-bold text-zinc-100 mb-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-md opacity-50 animate-pulse"></div>
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center relative">
                            <Star className="w-4 h-4 text-white fill-white"/>
                        </div>
                    </div>
                    <span className="font-bold text-xl tracking-tight text-zinc-100">
                        Review<span className="text-zinc-500">Flow</span>
                    </span>
                </div>
                <p className="text-zinc-500 text-sm">
                    &copy; {new Date().getFullYear()} Self-Hosted Solutions. Open Source MIT License.
                </p>
                <div className="mt-3 flex items-center justify-center gap-3 font-bold text-zinc-100">
                    <a href="https://github.com/lisacek/reviewsflow" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                        <Github className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View on GitHub</span>
                    </a>
                </div>
            </footer>
        </div>
    );
}

// --- SUB-COMPONENTS ---

const BackgroundGrid = () => (
    <div className="absolute inset-0 -z-20 pointer-events-none">
        <svg className="absolute h-full w-full stroke-white/5 [mask-image:radial-gradient(100%_100%_at_top_center,white,transparent)]" aria-hidden="true">
            <defs>
                <pattern id="grid-pattern" width={100} height={100} x="50%" y={-1} patternUnits="userSpaceOnUse">
                    <path d="M.5 200V.5H200" fill="none" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" strokeWidth={0} fill="url(#grid-pattern)" />
        </svg>
    </div>
);

// Install Tabs Component
const InstallTabs = () => {
    const [os, setOs] = useState('linux'); // 'linux' | 'windows'
    const [copied, setCopied] = useState(false);

    const commands = {
        linux: `#!/usr/bin/env bash

# Source: github.com/lisacek/reviewsflow
curl -L https://raw.githubusercontent.com/lisacek/reviewsflow/refs/heads/main/docker-compose.ghcr.yml \\
  -o docker-compose.ghcr.yml

# Start the stack
docker compose -f docker-compose.ghcr.yml up -d

# Open: http://<YOUR_SERVER_IP>:4380`,
        windows: `# Source: github.com/lisacek/reviewsflow
Invoke-WebRequest \`
  -Uri "https://raw.githubusercontent.com/lisacek/reviewsflow/refs/heads/main/docker-compose.ghcr.yml" \`
  -OutFile "docker-compose.ghcr.yml"

# Start the stack
docker compose -f docker-compose.ghcr.yml up -d

# Open: http://<YOUR_SERVER_IP>:4380`
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(commands[os]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full max-w-3xl mx-auto bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl relative group"
        >
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
                <div className="flex gap-2">
                    <button
                        onClick={() => setOs('linux')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${os === 'linux' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Linux / macOS
                    </button>
                    <button
                        onClick={() => setOs('windows')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${os === 'windows' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Windows (PowerShell)
                    </button>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>

            <div className="relative">
                {/* Glow effect inside terminal */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

                <pre className="p-6 text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre scrollbar-thin scrollbar-thumb-zinc-700">
                    <code className="block">
                        {commands[os].split('\n').map((line, i) => (
                            <div key={i} className="table-row">
                                <span className="table-cell select-none text-zinc-700 w-8 pr-4 text-right">{i+1}</span>
                                <span className="table-cell">
                                    {line.startsWith('#') ? (
                                        <span className="text-zinc-500 italic">{line}</span>
                                    ) : (
                                        <span dangerouslySetInnerHTML={{
                                            __html: line
                                                .replace(/(curl|docker|Invoke-WebRequest)/g, '<span class="text-blue-400">$1</span>')
                                                .replace(/(?<!text)(-[a-zA-Z]+)/g, '<span class="text-purple-400">$1</span>')
                                                .replace(/(https?:\/\/[^\s\\]+)/g, '<span class="text-green-400">$1</span>')
                                        }} />
                                    )}
                                </span>
                            </div>
                        ))}
                    </code>
                </pre>
            </div>
        </motion.div>
    );
};

const FeatureCard = ({icon: Icon, title, description}) => (
    <motion.div variants={itemVariants} className="group relative p-1 rounded-2xl bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/80 transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative p-6 h-full rounded-xl bg-black/40 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center mb-5 text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-all duration-300 shadow-inner">
                <Icon className="w-6 h-6"/>
            </div>
            <h3 className="text-xl font-bold text-zinc-100 mb-3">{title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
        </div>
    </motion.div>
);

const Step = ({num, title, desc}) => (
    <motion.div
        variants={itemVariants}
        className="flex items-start gap-6 p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-700 transition-all duration-300 backdrop-blur-sm relative overflow-hidden group"
    >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <span className="text-4xl font-black text-zinc-800/80 group-hover:text-zinc-700 transition-colors font-mono relative z-10">{num}</span>
        <div className="relative z-10">
            <h3 className="text-xl font-bold text-zinc-200 mb-2 flex items-center gap-2">
                {title} <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-500/10"/>
            </h3>
            <p className="text-zinc-400 leading-relaxed">{desc}</p>
        </div>
    </motion.div>
);