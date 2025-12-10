import React from 'react';
import { ReviewsWidget } from './ReviewsWidget';

export default function CodePreviewSection() {
    return (
        <section className="px-6 pb-24">
            {/* 1. Main Container: Relative wrapper to position the arrow */}
            <div className="max-w-3xl mx-auto relative group">

                {/* --- 2. THE CURVED ARROW SVG --- */}
                {/* Positioned absolutely to the left. Hidden on mobile/tablet to prevent overflow. */}
                <div className="absolute -left-28 top-12 bottom-12 w-24 hidden xl:block pointer-events-none">
                    <svg
                        viewBox="0 0 100 400"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full overflow-visible"
                        preserveAspectRatio="none"
                    >

                        {/* The Dashed Curve */}
                        <path
                            d="M 100 50 C 20 50, -20 180, 100 220"
                            stroke="url(#gradient-arrow)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="8 8"
                        />

                        <path
                            d="M 90 210 L 100 220 L 90 230"
                            stroke="#52525b"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            transform="translate(5 0) rotate(10 95 220)"
                        />



                        <defs>
                            <linearGradient id="gradient-arrow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#52525b" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#52525b" stopOpacity="1" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* --- 3. TOP: CODE INPUT --- */}
                <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl relative z-10">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"/>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"/>
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"/>
                        <div className="ml-auto text-xs text-zinc-500 font-mono">index.html</div>
                    </div>
                    <div className="p-6 overflow-x-auto">
                        <pre className="font-mono text-sm leading-relaxed text-zinc-400">
                            <span className="text-blue-400">&lt;script</span> <span className="text-purple-400">src</span>=<span className="text-green-400">"https://api.yoursite.com/widget.js"</span><br/>
                            &nbsp;&nbsp;<span className="text-purple-400">data-instance</span>=<span className="text-green-400">"public_key_e5698a..."</span><br/>
                            &nbsp;&nbsp;<span className="text-purple-400">data-theme</span>=<span className="text-green-400">"dark"</span><br/>
                            &nbsp;&nbsp;<span className="text-purple-400">data-design</span>=<span className="text-green-400">"grid"</span><span className="text-blue-400">&gt;</span><span className="text-blue-400">&lt;/script&gt;</span>
                        </pre>
                    </div>
                </div>

                {/* Spacer between cards */}
                <div className="h-12"></div>

                {/* --- 4. BOTTOM: WIDGET OUTPUT --- */}
                <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl relative z-10">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"/>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"/>
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"/>
                        <div className="ml-auto text-xs text-zinc-500 font-mono">preview.html</div>
                    </div>
                    <ReviewsWidget/>
                </div>
            </div>
        </section>
    );
}
