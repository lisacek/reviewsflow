import React, { useEffect, useState } from 'react'

// --- 1. PLACEHOLDER DATA (Shown when setting up) ---
const PLACEHOLDER_DATA = {
  averageRating: 4.9,
  count: 128,
  reviews: [
    { reviewId: 'm1', name: 'Sarah Jenkins', date: '2 days ago', stars: 5, text: 'Absolutely stunning service! The atmosphere was cozy and the staff went above and beyond.', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
    { reviewId: 'm2', name: 'David Miller', date: '1 week ago', stars: 4, text: 'Great experience overall. The wait time was a bit longer than expected.', avatar: 'https://i.pravatar.cc/150?u=a04258a24620826712d' },
    { reviewId: 'm3', name: 'Emily Chen', date: '3 weeks ago', stars: 5, text: 'Best place in town! I highly recommend checking this out.', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
    { reviewId: 'm4', name: 'Michael Brown', date: '1 month ago', stars: 5, text: 'The attention to detail was impressive. Will definitely be coming back.', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e' },
    { reviewId: 'm5', name: 'Jessica Davis', date: '2 months ago', stars: 4, text: 'Good value for money. The location is very convenient.', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f' },
    { reviewId: 'm6', name: 'Chris Wilson', date: '2 months ago', stars: 5, text: 'Simply amazing. I have no complaints whatsoever.', avatar: 'https://i.pravatar.cc/150?u=a042581f4e290267050' }
  ]
}

// --- 2. HELPERS & ICONS ---
const StarRating = ({ rating, className = '' }) => (
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
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
      ))}
    </div>
)

function dedupe(items) {
  const seen = new Set()
  const out = []
  for (const r of items || []) {
    const id = (r && (r.reviewId || r.id)) || JSON.stringify(r)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(r)
  }
  return out
}

// --- 3. MAIN COMPONENT ---
export const   ReviewsWidget = ({
                                placeUrl,
                                minRating = 4,
                                maxReviews = 20, // Default higher to allow load more
                                sort = 'newest',
                                theme = 'dark',
                                locale,
                                publicKey = null
                              }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [effectiveTheme, setEffectiveTheme] = useState('light')

  // Load More State
  const [visibleCount, setVisibleCount] = useState(6)
  const [columns, setColumns] = useState(3)

  // --- THEME HANDLING ---
  useEffect(() => {
    const checkTheme = () => {
      if (theme === 'system') {
        setEffectiveTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      } else {
        setEffectiveTheme(theme)
      }
    }
    checkTheme()
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', checkTheme)
    return () => window.removeEventListener('change', checkTheme)
  }, [theme])

  // --- RESPONSIVE COLUMNS (For Load More) ---
  useEffect(() => {
    const updateLayout = () => {
      const w = window.innerWidth
      let cols = 1
      if (w >= 1024) cols = 3
      else if (w >= 768) cols = 2
      setColumns(cols)
    }
    updateLayout()
    // Set initial count to 2 rows
    const w = window.innerWidth
    const initialCols = w >= 1024 ? 3 : w >= 768 ? 2 : 1
    setVisibleCount(initialCols * 2)

    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [])

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + (columns * 2))
  }

  // --- DATA FETCHING ---
  useEffect(() => {
    // 1. Placeholder Mode
    if (!placeUrl && !publicKey) {
      setData(PLACEHOLDER_DATA)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const apiBase = import.meta.env.VITE_API_BASE || ''
        let resp

        // 2. Production Mode (Existing Instance)
        if (publicKey) {
          resp = await fetch(`${apiBase}/public/reviews/${encodeURIComponent(publicKey)}`)
        }
        // 3. Preview Mode (Manual)
        else {
          resp = await fetch(`${apiBase}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              place_url: placeUrl,
              locales: [locale || 'en-US'],
              min_rating: Number(minRating),
              max_reviews: Number(maxReviews),
              sort: sort
            })
          })
        }

        const body = await resp.json()
        if (!resp.ok) throw new Error(body?.detail || body?.message || `HTTP ${resp.status}`)

        // Robust check: body might be Array or Object
        const first = Array.isArray(body) ? body[0] : body

        if (!cancelled) {
          if (first && Array.isArray(first.reviews)) {
            setData(first)
            // Reset pagination on new data
            const w = window.innerWidth
            const initialCols = w >= 1024 ? 3 : w >= 768 ? 2 : 1
            setVisibleCount(initialCols * 2)
          } else {
            throw new Error("No reviews found")
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [placeUrl, minRating, maxReviews, sort, locale, publicKey])

  // --- STYLES ---
  const isDark = effectiveTheme === 'dark'
  const bgColor = isDark ? 'bg-[#09090b]' : 'bg-white'
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900'
  const cardBg = isDark ? 'bg-[#18181b]' : 'bg-gray-50'
  const borderColor = isDark ? 'border-zinc-800' : 'border-gray-200'

  if (loading) {
    return (
        <div className={`w-full h-full p-6 ${bgColor} ${textColor} overflow-y-auto rounded-xl border ${borderColor}`}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 animate-pulse">
              <div className={`h-6 w-40 ${isDark ? 'bg-zinc-800/70' : 'bg-gray-200'} rounded mx-auto mb-3`} />
              <div className="flex items-center justify-center gap-2">
                <div className={`h-8 w-16 ${isDark ? 'bg-zinc-800/70' : 'bg-gray-200'} rounded`} />
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`h-4 w-4 ${isDark ? 'bg-zinc-800/70' : 'bg-gray-200'} rounded`} />
                  ))}
                </div>
                <div className={`h-3 w-24 ${isDark ? 'bg-zinc-800/70' : 'bg-gray-200'} rounded`} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${borderColor} ${cardBg} shadow-sm animate-pulse`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-zinc-800/70' : 'bg-gray-200'}`} />
                      <div className="flex-1 space-y-2">
                        <div className={`h-3 w-28 ${isDark ? 'bg-zinc-800/70' : 'bg-gray-200'} rounded`} />
                        <div className={`h-2 w-20 ${isDark ? 'bg-zinc-800/70' : 'bg-gray-200'} rounded`} />
                      </div>
                    </div>
                    <div className="space-y-2 mt-4">
                      <div className={`h-3 ${isDark ? 'bg-zinc-800/70' : 'bg-gray-200'} rounded`} />
                      <div className={`h-3 ${isDark ? 'bg-zinc-800/70' : 'bg-gray-200'} rounded w-11/12`} />
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
    )
  }

  if (error) return <div className={`${bgColor} ${textColor} p-4 rounded-lg border ${borderColor}`}>{error}</div>

  if (!data) return null

  // --- RENDER REVIEWS ---
  const allReviews = dedupe(data.reviews || [])
  const displayedReviews = allReviews.slice(0, visibleCount)
  const hasMore = visibleCount < allReviews.length

  return (
      <div className={`w-full h-full p-6 transition-colors duration-300 ${bgColor} ${textColor} overflow-y-auto rounded-xl border ${borderColor}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Customer Reviews</h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold">{data.averageRating}</span>
              <StarRating rating={Math.round(data.averageRating)} />
              <span className="text-sm opacity-60">({data.count} reviews)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedReviews.map((review) => (
                <div key={review.reviewId || Math.random()} className={`p-4 rounded-xl border ${borderColor} ${cardBg} shadow-sm transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={review.avatar || "https://www.gravatar.com/avatar/?d=mp"} alt={review.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <h4 className="font-semibold text-sm">{review.name}</h4>
                      <p className="text-xs opacity-60">{review.date}</p>
                    </div>
                    <div className="ml-auto">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Google_Favicon_2025.svg/960px-Google_Favicon_2025.svg.png" className="w-4 h-4 opacity-80" alt="Google" />
                    </div>
                  </div>
                  <StarRating rating={review.stars} className="mb-2" />
                  <p className="text-sm opacity-80 leading-relaxed line-clamp-4">{review.text}</p>
                </div>
            ))}
          </div>

          {hasMore && (
              <div className="mt-8 text-center">
                <button
                    onClick={handleLoadMore}
                    className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200 border ${
                        isDark
                            ? 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                            : 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Load more reviews
                </button>
              </div>
          )}
        </div>
      </div>
  )
}
