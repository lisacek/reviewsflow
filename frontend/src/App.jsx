import React, {useEffect, useState} from 'react';

import {getHealth, getLocales, postReviews, getStats, DEFAULT_SORT} from './api.js';
import AuthPage from './pages/Auth.jsx';
import Onboarding from './pages/Onboarding.jsx';
import LandingPage from './pages/LandingPage.jsx';
import {getToken, clearToken} from './auth.js';
import Builder from "./pages/Builder.jsx";
import ApiDocs from "./pages/ApiDocs.jsx";
import Navbar from "./components/Navbar.jsx";

const MOCK_REVIEWS = {
    success: true,
    averageRating: 4.8,
    count: 124,
    reviews: [
        {
            reviewId: '1',
            name: 'Alice Johnson',
            date: '2 days ago',
            stars: 5,
            text: 'Absolutely stunning service! The atmosphere was cozy and the staff went above and beyond.',
            avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
            profileLink: '#',
        },
        {
            reviewId: '2',
            name: 'Mark Smith',
            date: '1 week ago',
            stars: 4,
            text: 'Great experience overall, though the wait time was a bit longer than expected.',
            avatar: 'https://i.pravatar.cc/150?u=a04258a24620826712d',
            profileLink: '#',
        },
        {
            reviewId: '3',
            name: 'Sophie DeVille',
            date: '3 weeks ago',
            stars: 5,
            text: 'Best place in town. I highly recommend the special menu.',
            avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
            profileLink: '#',
        },
    ],
};

const StarRating = ({rating, className = ''}) => (
    <div className={`flex ${className}`}>
        {[1, 2, 3, 4, 5].map((star) => (
            <svg
                key={star}
                className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
        ))}
    </div>
);

const SkeletonHeader = () => (
    <div className="text-center mb-8 animate-pulse">
        <div className="h-6 w-40 bg-zinc-800/70 rounded mx-auto mb-3"/>
        <div className="flex items-center justify-center gap-2">
            <div className="h-8 w-16 bg-zinc-800/70 rounded"/>
            <div className="flex gap-1">
                {Array.from({length: 5}).map((_, i) => (
                    <div key={i} className="h-4 w-4 bg-zinc-800/70 rounded"/>
                ))}
            </div>
            <div className="h-3 w-24 bg-zinc-800/70 rounded"/>
        </div>
    </div>
);

const SkeletonCard = ({borderColor, cardBg}) => (
    <div className={`p-4 rounded-xl border ${borderColor} ${cardBg} shadow-sm animate-pulse`}>
        <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800/70"/>
            <div className="flex-1 space-y-2">
                <div className="h-3 w-28 bg-zinc-800/70 rounded"/>
                <div className="h-2 w-20 bg-zinc-800/70 rounded"/>
            </div>
            <div className="w-4 h-4 bg-zinc-800/70 rounded"/>
        </div>
        <div className="flex gap-1 mb-2">
            {Array.from({length: 5}).map((_, i) => (
                <div key={i} className="h-4 w-4 bg-zinc-800/70 rounded"/>
            ))}
        </div>
        <div className="space-y-2">
            <div className="h-3 bg-zinc-800/70 rounded"/>
            <div className="h-3 bg-zinc-800/70 rounded w-11/12"/>
            <div className="h-3 bg-zinc-800/70 rounded w-9/12"/>
        </div>
    </div>
);

const WidgetPreview = ({settings, isDarkMode, data, stats, loading}) => {
    const dataToShow = data || MOCK_REVIEWS;
    const bgColor = isDarkMode ? 'bg-[#09090b]' : 'bg-white';
    const textColor = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const cardBg = isDarkMode ? 'bg-[#18181b]' : 'bg-gray-50';
    const borderColor = isDarkMode ? 'border-zinc-800' : 'border-gray-200';


    return (
        <div className={`w-full h-full p-6 transition-colors duration-300 ${bgColor} ${textColor} overflow-y-auto`}>
            <div className="max-w-4xl mx-auto">
                {loading ? (
                    <>
                        <SkeletonHeader/>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({length: settings.maxReviews}).slice(0, 6).map((_, i) => (
                                <SkeletonCard key={i} borderColor={borderColor} cardBg={cardBg}/>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold mb-2">Customer Reviews</h2>
                            <div className="flex items-center justify-center gap-2">
                                <span
                                    className="text-3xl font-bold">{(stats && stats.averageRating) ?? dataToShow.averageRating}</span>
                                <StarRating
                                    rating={Math.round((stats && stats.averageRating) ?? dataToShow.averageRating)}/>
                                <span
                                    className="text-sm opacity-60">({(stats && (stats.totalCount ?? stats.count)) ?? dataToShow.count} reviews)</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dataToShow.reviews.slice(0, settings.maxReviews).map((review) => (
                                <div
                                    key={review.reviewId}
                                    className={`p-4 rounded-xl border ${borderColor} ${cardBg} shadow-sm`}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <img src={review.avatar} alt={review.name} className="w-10 h-10 rounded-full"/>
                                        <div>
                                            <h4 className="font-semibold text-sm">{review.name}</h4>
                                            <p className="text-xs opacity-60">{review.date}</p>
                                        </div>
                                        <div className="ml-auto">
                                            <img
                                                src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
                                                className="w-4 h-4" alt="Google"/>
                                        </div>
                                    </div>
                                    <StarRating rating={review.stars} className="mb-2"/>
                                    <p className="text-sm opacity-80 leading-relaxed line-clamp-4">{review.text}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default function App() {
    const [settings, setSettings] = useState({placeUrl: '', minRating: 4, maxReviews: 6, theme: 'dark'});
    const [activeTab, setActiveTab] = useState('preview');
    const [copied, setCopied] = useState(false);
    const [apiOnline, setApiOnline] = useState(false);
    const [locales, setLocales] = useState([]);
    const [selectedLocales, setSelectedLocales] = useState([]);
    const [sort, setSort] = useState(DEFAULT_SORT);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reviewsData, setReviewsData] = useState(null);
    const [statsData, setStatsData] = useState(null);
    const [authed, setAuthed] = useState(!!getToken());
    const [navView, setNavView] = useState('landing'); // 'landing' | 'generator' | 'auth' | 'onboarding' | 'api'
    const [authMode, setAuthMode] = useState('login');

    const previewMode = settings.theme === 'system' ? 'dark' : settings.theme;

    const handleToggleLocale = (code) => {
        setSelectedLocales((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
    };

    // Sync API/meta fetches
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const health = await getHealth();
                if (!cancelled) setApiOnline(health?.status === 'ok');
            } catch {
                if (!cancelled) setApiOnline(false);
            }
            try {
                const ls = await getLocales();
                if (!cancelled && Array.isArray(ls)) setLocales(ls);
            } catch {
                void 0;
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Lightweight hash routing to reflect/sync URL with view
    useEffect(() => {
        const hashToView = (hash) => {
            const h = (hash || '').replace(/^#/, '');
            switch (h) {
                case '/auth':
                case 'auth':
                    return 'auth';
                case '/onboarding':
                case 'onboarding':
                    return 'onboarding';
                case '/generator':
                case 'generator':
                case '/builder':
                case 'builder':
                    return 'generator';
                case '/api':
                case 'api':
                    return 'api';
                case '/landing':
                case 'landing':
                case '':
                    return 'landing';
                default:
                    return 'landing';
            }
        };

        const viewToHash = (view) => {
            switch (view) {
                case 'auth':
                    return '#/auth';
                case 'onboarding':
                    return '#/onboarding';
                case 'generator':
                    return '#/generator';
                case 'api':
                    return '#/api';
                case 'landing':
                default:
                    return '#/landing';
            }
        };

        // Initialize from hash on first load
        const initView = hashToView(typeof window !== 'undefined' ? window.location.hash : '');
        if (initView !== navView) {
            setNavView(initView);
        }

        // Listen for back/forward navigation
        const onHashChange = () => {
            const next = hashToView(window.location.hash);
            setNavView(next);
        };
        window.addEventListener('hashchange', onHashChange);

        // Keep URL updated when view changes
        const desired = viewToHash(initView);
        if (typeof window !== 'undefined' && window.location.hash !== desired) {
            window.location.hash = desired;
        }

        return () => {
            window.removeEventListener('hashchange', onHashChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reflect navView changes into URL hash
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const current = window.location.hash;
        const map = {
            auth: '#/auth',
            onboarding: '#/onboarding',
            generator: '#/generator',
            api: '#/api',
            landing: '#/landing',
        };
        const target = map[navView] || '#/landing';
        if (current !== target) {
            window.location.hash = target;
        }
    }, [navView]);

    const handleUpdate = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);
        setReviewsData(null);
        setStatsData(null);
        try {
            const payload = {
                place_url: settings.placeUrl,
                min_rating: settings.minRating,
                max_reviews: settings.maxReviews,
                sort,
                force_refresh: true,
            };
            if (selectedLocales.length) payload.locales = selectedLocales;
            const result = await postReviews(payload);
            const first = Array.isArray(result) ? result[0] : result;
            if (first && Array.isArray(first.reviews)) {
                const seen = new Set();
                const unique = first.reviews.filter((r) => {
                    const id = r?.reviewId ?? r?.id ?? JSON.stringify(r);
                    if (seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });
                setReviewsData({...first, reviews: unique});
            } else {
                setReviewsData(first || null);
            }
            // fetch stats for a single locale (first selected if available)
            try {
                const singleLocale = selectedLocales.length ? [selectedLocales[0]] : undefined;
                const stats = await getStats({
                    place_url: settings.placeUrl,
                    locales: singleLocale,
                    force_refresh: true
                });
                setStatsData(stats);
            } catch {
                setStatsData(null);
            }
        } catch (e) {
            setError(e?.message || 'Failed to fetch reviews');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        const host = typeof window !== 'undefined' ? window.location.origin : ''
        const apiBase = import.meta.env.VITE_API_BASE || ''
        const snippet = [
            '<div id="reviews-widget"></div>',
            `<link rel="stylesheet" href="${host}/widget.css" />`,
            `<script src="${host}/widget.js"`,
            `  data-api-base="${apiBase}"`,
            '  data-instance="PUBLIC_KEY"',
            `  data-locales="${(selectedLocales && selectedLocales.length ? selectedLocales : ['cs-CZ', 'en-US']).join(',')}"`,
            `  data-min-rating="${settings.minRating}"`,
            `  data-max-reviews="${settings.maxReviews}"`,
            `  data-sort="${sort}"></script>`,
        ].join('\n');
        navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans">
            <Navbar
                apiOnline={apiOnline}
                navView={navView}
                setNavView={setNavView}
                authed={authed}
                setAuthMode={setAuthMode}
                clearToken={clearToken}
                setAuthed={setAuthed}
            />

            {navView === 'auth' && (
                <main className="p-6">
                    <AuthPage initialMode={authMode} onAuthed={() => {
                        setAuthed(true);
                        setNavView('onboarding');
                    }}/>
                </main>
            )}

            {navView === 'landing' && (
                <main>
                    <LandingPage
                        onLogin={() => {
                            setAuthMode('login');
                            setNavView('auth');
                        }}
                        onRegister={() => {
                            setAuthMode('register');
                            setNavView('auth');
                        }}
                        authed={authed}
                    />
                </main>
            )}

            {navView === 'onboarding' && authed && (
                <main className="p-6">
                    <Onboarding/>
                </main>
            )}

            {navView === 'generator' && authed && (
                <main>
                    <Builder/>
                </main>
            )}
            {navView === 'generator' && !authed && (
                <main>
                    <LandingPage onLogin={() => {
                        setAuthMode('login');
                        setNavView('auth');
                    }} onRegister={() => {
                        setAuthMode('register');
                        setNavView('auth');
                    }}/>
                </main>
            )}

            {navView === 'api' && authed && (
                <main>
                    <ApiDocs/>
                </main>
            )}
            {navView === 'api' && !authed && (
                <main>
                    <LandingPage onLogin={() => {
                        setAuthMode('login');
                        setNavView('auth');
                    }} onRegister={() => {
                        setAuthMode('register');
                        setNavView('auth');
                    }}/>
                </main>
            )}
        </div>
    );
}









