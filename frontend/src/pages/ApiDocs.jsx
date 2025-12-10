import React, { useMemo, useState, useEffect } from 'react';
import {
    Eye, EyeOff, Copy, Check, Terminal, Key,
    Server, BarChart3, Settings, Globe, Play, ExternalLink, LogIn
} from 'lucide-react';
import { getToken } from '../auth.js';
import { setPageSEO } from '../seo.js';

const API_BASE =
    import.meta.env.VITE_API_BASE?.trim()
        ? import.meta.env.VITE_API_BASE
        : window.location.origin;


export default function ApiDocs() {
    useEffect(() => {
        setPageSEO({
            title: 'API Docs — ReviewsFlow',
            description: 'Developer reference for ReviewsFlow: endpoints for auth, instances, reviews, stats, cache and more.',
        })
    }, [])

    const [revealed, setRevealed] = useState(false);
    const [copiedToken, setCopiedToken] = useState(false);

    // 1. Get Token (might be null)
    const token = getToken();

    // 2. Safe Masking (Only runs if token exists)
    const maskedToken = useMemo(() => {
        if (!token) return '';
        if (revealed) return token;
        return `${token.slice(0, 4)}${'•'.repeat(24)}${token.slice(-4)}`;
    }, [token, revealed]);

    const copyToClipboard = (text, setCopiedState) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedState(true);
        setTimeout(() => setCopiedState(false), 2000);
    };

    // 3. Fallback header for unauthenticated users
    const bearerHeader = token ? `Authorization: Bearer ${token}` : 'Authorization: Bearer <your_access_token>';
    const tokenVal = token || 'YOUR_TOKEN';

    return (
        <div className="min-h-screen bg-black text-zinc-100 p-6 md:p-12 font-sans selection:bg-blue-500/30">
            <div className="max-w-5xl mx-auto">

                {/* --- HEADER --- */}
                <header className="mb-12 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
                            <Terminal className="w-3 h-3" />
                            <span>Developer Documentation</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight mb-3">API Reference</h1>
                        <p className="text-zinc-400 text-lg max-w-2xl">
                            Integrate reviews programmatically using the REST API.
                        </p>
                    </div>

                    <a
                        href={`${API_BASE}/redoc`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-all text-sm font-medium text-zinc-300 hover:text-white"
                    >
                        Explore Full API Docs
                        <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </a>
                </header>

                {/* --- TOKEN CARD --- */}
                <div className="group relative mb-16">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                    <div className="relative bg-[#09090b] border border-zinc-800 rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Key className="w-5 h-5 text-zinc-100" />
                                <h3 className="text-lg font-semibold text-zinc-100">Access Token</h3>
                            </div>
                            <p className="text-zinc-400 text-sm mb-4">
                                Include this token in the <code className="bg-zinc-800/50 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-xs">Authorization</code> header.
                            </p>

                            {/* 4. CONDITIONAL RENDER: Token Input OR Login Button */}
                            {token ? (
                                <div className="relative flex items-center max-w-xl">
                                    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-4 pr-24 font-mono text-sm text-zinc-300 overflow-hidden text-ellipsis">
                                        {maskedToken}
                                    </div>
                                    <div className="absolute right-2 flex gap-1">
                                        <button onClick={() => setRevealed(!revealed)} className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors">
                                            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => copyToClipboard(token, setCopiedToken)} className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors">
                                            {copiedToken ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-xl">
                                    <button
                                        onClick={() => window.location.hash = '#/auth'}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Log in to view your API Key
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="md:text-right border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-8">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Base URL</div>
                            <div className="font-mono text-zinc-300 bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800/50 inline-block">
                                {API_BASE}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- TIMELINE ENDPOINTS --- */}
                <div className="space-y-0">

                    <EndpointSection
                        title="Create Instance"
                        method="POST"
                        path="/instances"
                        description="Initialize a new review monitoring instance. Returns a unique public key."
                        icon={Play}
                        bearer={bearerHeader}
                        snippets={{
                            curl: `curl -X POST ${API_BASE}/instances \\
  -H "${bearerHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "place_url": "http://google...",
    "locales": ["en-US"],
    "min_rating": 4
  }'`,
                            python: `import requests

url = "${API_BASE}/instances"
headers = {
    "Authorization": "Bearer ${tokenVal}",
    "Content-Type": "application/json"
}
data = {
    "place_url": "http://google...",
    "locales": ["en-US"],
    "min_rating": 4
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`,
                            javascript: `const response = await fetch('${API_BASE}/instances', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${tokenVal}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    place_url: 'http://google...',
    locales: ['en-US'],
    min_rating: 4
  })
});
const data = await response.json();`
                        }}
                    />

                    <EndpointSection
                        title="Fetch Reviews"
                        method="GET"
                        path="/api/reviews/{id}"
                        description="Retrieve cached reviews securely."
                        icon={Server}
                        extraInfo="For public frontend use, use GET /public/reviews/{public_key}"
                        bearer={bearerHeader}
                        snippets={{
                            curl: `curl -s ${API_BASE}/api/reviews/123 \\
  -H "${bearerHeader}"`,
                            python: `import requests

url = "${API_BASE}/api/reviews/123"
headers = {"Authorization": "Bearer ${tokenVal}"}

response = requests.get(url, headers=headers)
print(response.json())`,
                            javascript: `const response = await fetch('${API_BASE}/api/reviews/123', {
  headers: { 'Authorization': 'Bearer ${tokenVal}' }
});
const data = await response.json();`
                        }}
                    />

                    <EndpointSection
                        title="List Instances"
                        method="GET"
                        path="/instances"
                        description="Get a list of all your configured instances."
                        icon={Globe}
                        bearer={bearerHeader}
                        snippets={{
                            curl: `curl -s ${API_BASE}/instances \\
  -H "${bearerHeader}"`,
                            python: `import requests

url = "${API_BASE}/instances"
headers = {"Authorization": "Bearer ${tokenVal}"}

response = requests.get(url, headers=headers)
print(response.json())`,
                            javascript: `const response = await fetch('${API_BASE}/instances', {
  headers: { 'Authorization': 'Bearer ${tokenVal}' }
});
const data = await response.json();`
                        }}
                    />

                    <EndpointSection
                        title="Update Configuration"
                        method="PATCH"
                        path="/instances/{id}"
                        description="Modify settings like minimum rating."
                        icon={Settings}
                        bearer={bearerHeader}
                        snippets={{
                            curl: `curl -X PATCH ${API_BASE}/instances/123 \\
  -H "${bearerHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{ "min_rating": 4.5, "max_reviews": 100 }'`,
                            python: `import requests

url = "${API_BASE}/instances/123"
headers = {
    "Authorization": "Bearer ${tokenVal}",
    "Content-Type": "application/json"
}
data = { "min_rating": 4.5, "max_reviews": 100 }

response = requests.patch(url, json=data, headers=headers)
print(response.json())`,
                            javascript: `const response = await fetch('${API_BASE}/instances/123', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ${tokenVal}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ 
    min_rating: 4.5,
    max_reviews: 100
  })
});
const data = await response.json();`
                        }}
                    />

                    <EndpointSection
                        title="Get Statistics"
                        method="GET"
                        path="/api/stats/{id}"
                        description="Get aggregated metrics filtered by query params."
                        icon={BarChart3}
                        bearer={bearerHeader}
                        isLast={true}
                        snippets={{
                            curl: `curl -s "${API_BASE}/api/stats/123?exclude_below=3" \\
  -H "${bearerHeader}"`,
                            python: `import requests

url = "${API_BASE}/api/stats/123"
params = { "exclude_below": 3, "max_reviews": 200 }
headers = { "Authorization": "Bearer ${tokenVal}" }

response = requests.get(url, params=params, headers=headers)
print(response.json())`,
                            javascript: `const params = new URLSearchParams({ 
  exclude_below: 3, 
  max_reviews: 200 
});

const response = await fetch(\`\${API_BASE}/api/stats/123?\${params}\`, {
  headers: { 'Authorization': 'Bearer ${tokenVal}' }
});
const data = await response.json();`
                        }}
                    />

                </div>
            </div>
        </div>
    );
}

// --- REUSABLE COMPONENTS ---

function EndpointSection({ title, method, path, description, snippets, icon: Icon, extraInfo, isLast }) {
    const [activeTab, setActiveTab] = useState('curl');
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(snippets[activeTab]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const methodColors = {
        GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        POST: 'bg-green-500/10 text-green-400 border-green-500/20',
        PATCH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    return (
        <div className={`relative pl-8 md:pl-10 ${!isLast ? 'border-l border-zinc-800 pb-12' : ''}`}>
            {/* Timeline Icon */}
            <div className="absolute -left-[17px] top-0 h-8 w-8 rounded-full bg-[#0c0c0e] border border-zinc-800 flex items-center justify-center text-zinc-500 z-10">
                <Icon className="w-4 h-4" />
            </div>

            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wide ${methodColors[method]}`}>
            {method}
          </span>
                    <code className="text-sm font-mono text-zinc-200">{path}</code>
                </div>
                <h3 className="text-xl font-semibold text-zinc-100 mb-1">{title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">{description}</p>
                {extraInfo && (
                    <div className="mt-2 text-xs bg-zinc-900/50 border-l-2 border-blue-500/50 pl-3 py-1 text-zinc-400 inline-block rounded-r">
                        {extraInfo}
                    </div>
                )}
            </div>

            {/* Code Tabs Block */}
            <div className="relative group rounded-lg border border-zinc-800 bg-[#0c0c0e] overflow-hidden">
                <div className="flex items-center justify-between bg-zinc-900/30 px-2 pt-2 border-b border-zinc-800">
                    <div className="flex gap-1">
                        {['curl', 'python', 'javascript'].map(lang => (
                            <button
                                key={lang}
                                onClick={() => setActiveTab(lang)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                                    activeTab === lang
                                        ? 'bg-[#0c0c0e] text-zinc-200 border-t border-x border-zinc-800 border-b-black -mb-px relative z-10'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                }`}
                            >
                                {lang === 'javascript' ? 'Node.js' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={copyCode}
                        className="mr-2 mb-1 text-xs flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                </div>

                <pre className="p-4 text-xs md:text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700 bg-[#0c0c0e]">
          {/* Very Simple Highlighting */}
                    {snippets[activeTab].split('\n').map((line, i) => (
                        <div key={i} className="table-row">
                            <span className="table-cell select-none text-zinc-700 pr-4 text-right">{i+1}</span>
                            <span className="table-cell">
                 {line.split(/("(?:[^"\\]|\\.)*")/g).map((part, j) =>
                     part.startsWith('"') ? <span key={j} className="text-green-400">{part}</span> : <span key={j} className="text-zinc-300">{part}</span>
                 )}
               </span>
                        </div>
                    ))}
        </pre>
            </div>
        </div>
    );
}