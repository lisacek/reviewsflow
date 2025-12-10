import React, {useState, useEffect} from 'react';
import {
    Globe, Settings, Sun, Moon, RefreshCw, Code, Copy,
    Check, AlertCircle, MapPin, Plus, Trash2, Layout,
    Hash, Lock, Unlock, ChevronDown
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {getDomains, addDomain, deleteDomainById, createInstance, getInstances, patchInstance, deleteInstanceById} from '../api.js';
import {ReviewsWidget} from '../components/ReviewsWidget.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx'
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-markup"; // html
import { setPageSEO } from "../seo.js";

export default function Builder() {
    // --- STATE ---
    const [domains, setDomains] = useState([]);
    const [instances, setInstances] = useState([]); // List of existing instances

    // Selection State
    const [selectedInstanceId, setSelectedInstanceId] = useState('new'); // 'new' or integer ID
    const [isReadOnly, setIsReadOnly] = useState(false);

    const [newDomain, setNewDomain] = useState('');
    const [generatedInstance, setGeneratedInstance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [activeTab, setActiveTab] = useState('preview');
    const [copied, setCopied] = useState(false);

    // Form Config
    const [config, setConfig] = useState({
        placeUrl: '',
        locales: ['en-US'],
        minRating: 4.0,
        maxReviews: 6,
        sort: 'newest',
        theme: 'dark',
    });
    const [localeInput, setLocaleInput] = useState('en-US');

    useEffect(() => {
        setPageSEO({
            title: 'Builder — ReviewsFlow',
            description: 'Visually configure your self‑hosted Google Reviews widget and generate the embed code.',
        })
    }, [])

    // --- INITIAL LOAD ---
    useEffect(() => {
        fetchData();
    }, []);

    // Sync locale string input to config array
    useEffect(() => {
        setConfig(prev => ({...prev, locales: localeInput.split(',').map(s => s.trim()).filter(Boolean)}));
    }, [localeInput]);

    // --- ACTIONS ---

    async function fetchData() {
        try {
            const [d, i] = await Promise.all([getDomains(), getInstances()]);
            setDomains(Array.isArray(d) ? d : []);
            setInstances(Array.isArray(i) ? i : []);
        } catch (e) {
            console.error("Failed to load data", e);
        }
    }

    // Handle Dropdown Change
    const handleInstanceSelect = (e) => {
        const val = e.target.value;
        setSelectedInstanceId(val);
        setError(null);

        if (val === 'new') {
            // Reset to defaults for creating new
            setIsReadOnly(false);
            setGeneratedInstance(null);
            setConfig({
                placeUrl: '',
                locales: ['en-US'],
                minRating: 4.0,
                maxReviews: 6,
                sort: 'newest',
                theme: 'dark',
            });
            setLocaleInput('en-US');
        } else {
            // Find and populate existing instance
            const inst = instances.find(i => i.id === Number(val));
            if (inst) {
                // Allow editing for existing instances (we support PATCH)
                setIsReadOnly(false);
                setGeneratedInstance(inst); // Important: Sets the public_key for the snippet
                setConfig({
                    placeUrl: inst.place_url,
                    locales: inst.locales || [],
                    minRating: inst.min_rating,
                    maxReviews: inst.max_reviews,
                    sort: inst.sort,
                    theme: 'dark', // API doesn't store theme yet, default to dark
                });
                setLocaleInput((inst.locales || []).join(', '));
            }
        }
    };

    async function handleAddDomain() {
        if (!newDomain.trim()) return;
        setLoading(true);
        try {
            await addDomain(newDomain.trim());
            setNewDomain('');
            await fetchData();
        } catch (e) {
            setError(e || e?.message || 'Failed to add domain');
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteDomain(id) {
        try {
            await deleteDomainById(id);
            await fetchData();
        } catch (e) {
            setError(e || e?.message || 'Failed to delete domain');
        }
    }

    async function handleGenerateInstance() {
        if (isReadOnly) return; // Prevent generation if read-only
        if (!config.placeUrl) {
            setError('Please enter a Google Maps URL');
            return;
        }

        setLoading(true);
        setError(null);

        const body = {
            place_url: config.placeUrl,
            locales: config.locales,
            min_rating: Number(config.minRating),
            max_reviews: Number(config.maxReviews),
            sort: config.sort,
            interval_minutes: 60,
        };

        try {
            const inst = await createInstance(body);
            setGeneratedInstance(inst);
            setActiveTab('code');
            await fetchData(); // Refresh list to show new instance in dropdown
            setSelectedInstanceId(inst.id); // Auto-select the new instance
            setIsReadOnly(false); // Keep editable to allow PATCH updates
        } catch (e) {
            setError(e || e?.message || 'Failed to create instance');
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateInstance() {
        const id = Number(selectedInstanceId);
        if (!id || isNaN(id)) return;
        setLoading(true);
        setError(null);
        try {
            const body = {
                locales: config.locales,
                min_rating: Number(config.minRating),
                max_reviews: Number(config.maxReviews),
                sort: config.sort,
            };
            const updated = await patchInstance(id, body);
            setGeneratedInstance(updated);
            await fetchData();
        } catch (e) {
            setError(e || e?.message || 'Failed to update instance');
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteInstance() {
        const id = Number(selectedInstanceId);
        if (!id || isNaN(id)) return;
        const ok = window.confirm('Delete this instance? This cannot be undone.');
        if (!ok) return;
        setLoading(true);
        setError(null);
        try {
            await deleteInstanceById(id);
            await fetchData();
            // Reset builder to New
            setSelectedInstanceId('new');
            setGeneratedInstance(null);
            setConfig({
                placeUrl: '',
                locales: ['en-US'],
                minRating: 4.0,
                maxReviews: 6,
                sort: 'newest',
                theme: 'dark',
            });
            setLocaleInput('en-US');
            setIsReadOnly(false);
        } catch (e) {
            setError(e || e?.message || 'Failed to delete instance');
        } finally {
            setLoading(false);
        }
    }

    function getSnippetCode() {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const apiBase = import.meta.env.VITE_API_BASE || window.location.origin;
        const publicKey = generatedInstance?.public_key || 'YOUR_PUBLIC_KEY';
        return `<div id="reviews-widget"></div>

<link rel=\"stylesheet\" href=\"${origin}/widget.css\" />
<script src=\"${origin}/widget.js\"
  data-api-base=\"${apiBase}\"
  data-instance=\"${publicKey}\"
  data-theme=\"${config.theme}\"
></script>`;
    }

    function handleCopy() {
        navigator.clipboard.writeText(getSnippetCode());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    // --- STYLES ---
    const inputClass = `w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-200 focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 outline-none transition-all placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-900/50`;
    const labelClass = "block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide";
    const sectionTitle = "text-xs font-bold text-zinc-500 mb-4 flex items-center gap-2 uppercase tracking-wider";

    return (
        <div className="bg-transparent text-zinc-100 font-sans selection:bg-blue-500/30">
            <main className="grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-73px)]">

                {/* === LEFT SIDEBAR === */}
                <div
                    className="lg:col-span-3 border-r border-zinc-800 p-6 overflow-y-auto bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-800">
                    <div className="space-y-8">

                        {/* 1. INSTANCE SELECTOR (NEW) */}
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
                            <label className={labelClass + " flex items-center justify-between"}>
                                Select Instance
                                {isReadOnly ? <Lock className="w-3 h-3 text-yellow-500"/> :
                                    <Unlock className="w-3 h-3 text-green-500"/>}
                            </label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-3 w-4 h-4 text-zinc-500"/>
                                <select
                                    value={selectedInstanceId}
                                    onChange={handleInstanceSelect}
                                    className={`${inputClass} pl-9 appearance-none cursor-pointer`}
                                >
                                    <option value="new">+ Create New Instance</option>
                                    {instances.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            #{inst.id} - {inst.place_url.substring(0, 25)}...
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    className="absolute right-3 top-3 w-4 h-4 text-zinc-500 pointer-events-none"/>
                            </div>
                            {isReadOnly && (
                                <div
                                    className="mt-2 text-[10px] text-yellow-500/80 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                                    Read-only mode. Create new to edit.
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-zinc-800/50"/>

                        {/* 2. CONFIGURATION */}
                        <div>
                            <h3 className={sectionTitle}>
                                <Settings className="w-3.5 h-3.5"/> Widget Settings
                            </h3>

                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>Google Maps URL</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500"/>
                                        <input
                                            value={config.placeUrl}
                                            disabled={selectedInstanceId !== 'new'}
                                            onChange={e => setConfig({...config, placeUrl: e.target.value})}
                                            placeholder="https://maps.google.com/..."
                                            className={`${inputClass} pl-9`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Locales</label>
                                    <input
                                        value={localeInput}
                                        onChange={e => setLocaleInput(e.target.value)}
                                        placeholder="en-US, cs-CZ"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>Sort Order</label>
                                    <select
                                        value={config.sort}
                                        onChange={e => setConfig({...config, sort: e.target.value})}
                                        className={`${inputClass} appearance-none cursor-pointer`}
                                    >
                                        {['newest', 'oldest', 'best', 'worst'].map(o => (
                                            <option key={o} value={o}>{o}</option>))}
                                    </select>
                                </div>

                                {/* Sliders */}
                                <div className="space-y-6 pt-2">
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-400">Min Rating</span>
                                            <span
                                                className="text-zinc-200 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">{config.minRating}</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="5" step="0.5"
                                            value={config.minRating}
                                            onChange={e => setConfig({
                                                ...config,
                                                minRating: parseFloat(e.target.value)
                                            })}
                                            className={`w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${isReadOnly ? 'accent-zinc-600' : 'accent-blue-600 hover:accent-blue-500'}`}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-400">Max Reviews</span>
                                            <span
                                                className="text-zinc-200 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">{config.maxReviews}</span>
                                        </div>
                                        <input
                                            type="range" min="3" max="20" step="1"
                                            value={config.maxReviews}
                                            onChange={e => setConfig({...config, maxReviews: parseInt(e.target.value)})}
                                            className={`w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${isReadOnly ? 'accent-zinc-600' : 'accent-blue-600 hover:accent-blue-500'}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-zinc-800/50"/>

                        {/* 3. APPEARANCE (Always editable for preview, but not saved to backend yet) */}
                        <div>
                            <h3 className={sectionTitle}>
                                <Layout className="w-3.5 h-3.5"/> Appearance
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {['light', 'dark', 'system'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setConfig({...config, theme: t})}
                                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs transition-all duration-200 ${
                                            config.theme === t
                                                ? 'bg-blue-600/10 border-blue-600 text-blue-400 ring-1 ring-blue-600/20'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                                        }`}
                                    >
                                        {t === 'light' && <Sun className="w-4 h-4 mb-2"/>}
                                        {t === 'dark' && <Moon className="w-4 h-4 mb-2"/>}
                                        {t === 'system' && <Settings className="w-4 h-4 mb-2"/>}
                                        <span className="capitalize font-medium">{t}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. DOMAINS */}
                        <div>
                            <h3 className={sectionTitle}>
                                <Globe className="w-3.5 h-3.5"/> Allowed Domains
                            </h3>
                            <div className="flex gap-2 mb-3">
                                <input
                                    value={newDomain}
                                    onChange={e => setNewDomain(e.target.value)}
                                    placeholder="example.com"
                                    className={inputClass}
                                />
                                <button
                                    onClick={handleAddDomain}
                                    disabled={loading}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 rounded-lg border border-zinc-700 transition-colors flex items-center justify-center"
                                >
                                    <Plus className="w-4 h-4"/>
                                </button>
                            </div>
                            <ul className="space-y-2">
                                {domains.map(d => (
                                    <li key={d.id}
                                        className="group flex items-center justify-between bg-zinc-900/50 border border-zinc-800/50 rounded-md px-3 py-2 text-xs transition-colors hover:border-zinc-700">
                                        <span className="text-zinc-300 font-mono">{d.host}</span>
                                        <button onClick={() => handleDeleteDomain(d.id)}
                                                className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 className="w-3.5 h-3.5"/>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {error && (
                            <motion.div initial={{opacity: 0, y: -5}} animate={{opacity: 1, y: 0}}>
                                <ErrorBanner error={error} />
                            </motion.div>
                        )}

                        {selectedInstanceId === 'new' && (
                            <button
                                onClick={handleGenerateInstance}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 text-sm"
                            >
                                {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <>Create Widget <RefreshCw
                                    className="w-4 h-4"/></>}
                            </button>
                        )}

                        {selectedInstanceId !== 'new' && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleUpdateInstance}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 text-sm"
                                >
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <>Save Changes</>}
                                </button>
                                <button
                                    onClick={handleDeleteInstance}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 text-sm"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* === RIGHT MAIN PREVIEW === */}
                <div className="lg:col-span-9 bg-zinc-900 flex flex-col relative">

                    <div
                        className="absolute top-6 right-8 z-20 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-full p-1 flex gap-1 shadow-2xl">
                        <button onClick={() => setActiveTab('preview')}
                                className={`px-4 py-1.5 text-xs font-medium rounded-full flex items-center gap-2 transition-all ${activeTab === 'preview' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>
                            <Globe className="w-3.5 h-3.5"/> Preview
                        </button>
                        <button onClick={() => setActiveTab('code')}
                                className={`px-4 py-1.5 text-xs font-medium rounded-full flex items-center gap-2 transition-all ${activeTab === 'code' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>
                            <Code className="w-3.5 h-3.5"/> Get Code
                        </button>
                    </div>

                    <div
                        className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-900 to-black">
                        <AnimatePresence mode='wait'>
                            {activeTab === 'preview' ? (
                                <motion.div
                                    key="preview"
                                    initial={{opacity: 0, scale: 0.95, y: 10}}
                                    animate={{opacity: 1, scale: 1, y: 0}}
                                    exit={{opacity: 0, scale: 0.95, y: 10}}
                                    transition={{duration: 0.3, ease: "backOut"}}
                                    className={`w-full max-w-5xl h-[650px] rounded-xl overflow-hidden shadow-2xl border flex flex-col ${config.theme === 'dark' ? 'border-zinc-700 bg-black' : 'border-zinc-200 bg-white'}`}
                                >
                                    <div
                                        className={`h-10 border-b flex items-center px-4 gap-2 ${config.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'}`}>
                                        <div className="w-3 h-3 rounded-full bg-red-500/80"/>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"/>
                                        <div className="w-3 h-3 rounded-full bg-green-500/80"/>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <ReviewsWidget
                                            // Theme (always client-side for preview)
                                            theme={config.theme}

                                            // Prefer instance review flow
                                            instanceId={selectedInstanceId !== 'new' ? Number(selectedInstanceId) : null}
                                            publicKey={isReadOnly ? generatedInstance?.public_key : null}

                                            // Legacy manual props are ignored now; kept for placeholder mode
                                            placeUrl={config.placeUrl}
                                            minRating={config.minRating}
                                            maxReviews={config.maxReviews}
                                            locale={config.locales[0]}
                                        />
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="code"
                                    initial={{opacity: 0, y: 20}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: -20}}
                                    className="w-full max-w-3xl bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5"
                                >
                                    <div
                                        className="flex justify-between items-center px-5 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"/>
                                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"/>
                                            </div>
                                            <span className="text-xs text-zinc-500 font-mono ml-2">index.html</span>
                                        </div>
                                        <button onClick={handleCopy}
                                                className="text-xs flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-md border border-zinc-700/50">
                                            {copied ? <Check className="w-3.5 h-3.5 text-green-400"/> :
                                                <Copy className="w-3.5 h-3.5"/>}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <pre className="relative p-6 text-xs font-mono overflow-x-auto rounded-xl bg-[#050505] shadow-[0_0_40px_rgba(0,0,0,0.6)]">
                                      <code
                                          className="language-html prism-code"
                                          dangerouslySetInnerHTML={{
                                              __html: Prism.highlight(
                                                  getSnippetCode(),
                                                  Prism.languages.markup,
                                                  "html"
                                              )
                                          }}
                                      />
                                    </pre>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
