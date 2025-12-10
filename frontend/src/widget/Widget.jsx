import React, { useEffect, useState } from 'react'
import ErrorBanner from '../components/ErrorBanner.jsx'

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

export default function Widget({ apiBase, instance, minRating = 4, maxReviews = 6, sort = 'newest' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visibleCount, setVisibleCount] = useState(6)
  const [columns, setColumns] = useState(3)

  useEffect(() => {
    let cancelled = false
    // responsive columns + initial visible rows
    const updateLayout = () => {
      const w = window.innerWidth
      let cols = 1
      if (w >= 1024) cols = 3
      else if (w >= 768) cols = 2
      setColumns(cols)
    }
    updateLayout()
    const w = window.innerWidth
    const initCols = w >= 1024 ? 3 : w >= 768 ? 2 : 1
    setVisibleCount(initCols * 2)

    window.addEventListener('resize', updateLayout)
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const resp = await fetch(`${apiBase}/public/reviews/${encodeURIComponent(instance)}`)
        const body = await resp.json()
        if (!resp.ok) {
          const err = new Error(body?.detail || body?.message || body?.error?.message || `HTTP ${resp.status}`)
          err.status = resp.status
          err.code = body?.error?.code
          err.requestId = body?.requestId
          err.screenshot = body?.error?.screenshot
          err.details = body?.error?.details
          throw err
        }
        const first = Array.isArray(body) ? body[0] : body
        if (!cancelled) setData(first)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true; window.removeEventListener('resize', updateLayout) }
  }, [apiBase, instance, minRating, maxReviews, sort])

  const isDark = true
  const bgColor = isDark ? 'bg-[#09090b]' : 'bg-white'
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900'
  const cardBg = isDark ? 'bg-[#18181b]' : 'bg-gray-50'
  const borderColor = isDark ? 'border-zinc-800' : 'border-gray-200'

  if (loading) {
    return (
      <div className={`w-full h-full p-6 ${bgColor} ${textColor} overflow-y-auto rounded-xl border border-zinc-800`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 animate-pulse">
            <div className="h-6 w-40 bg-zinc-800/70 rounded mx-auto mb-3" />
            <div className="flex items-center justify-center gap-2">
              <div className="h-8 w-16 bg-zinc-800/70 rounded" />
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-4 w-4 bg-zinc-800/70 rounded" />
                ))}
              </div>
              <div className="h-3 w-24 bg-zinc-800/70 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: Math.min(6, maxReviews) }).map((_, i) => (
              <div key={i} className={`p-4 rounded-xl border ${borderColor} ${cardBg} shadow-sm animate-pulse`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800/70" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 bg-zinc-800/70 rounded" />
                    <div className="h-2 w-20 bg-zinc-800/70 rounded" />
                  </div>
                  <div className="w-4 h-4 bg-zinc-800/70 rounded" />
                </div>
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-4 w-4 bg-zinc-800/70 rounded" />
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-zinc-800/70 rounded" />
                  <div className="h-3 bg-zinc-800/70 rounded w-11/12" />
                  <div className="h-3 bg-zinc-800/70 rounded w-9/12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (error) return (
    <div className={`${bgColor} ${textColor} p-4 rounded-lg border border-zinc-800`}>
      <ErrorBanner error={error} compact />
    </div>
  )
  if (!data) return null

  const allReviews = dedupe(data.reviews || [])
  const reviews = allReviews.slice(0, visibleCount)
  const hasMore = reviews.length < allReviews.length
  const handleLoadMore = () => setVisibleCount(prev => prev + (columns * 2))

  return (
    <div className={`w-full h-full p-6 transition-colors duration-300 ${bgColor} ${textColor} overflow-y-auto rounded-xl border border-zinc-800`}>
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
          {reviews.map((review) => (
            <div key={review.reviewId} className={`p-4 rounded-xl border ${borderColor} ${cardBg} shadow-sm`}>
              <div className="flex items-center gap-3 mb-3">
                <img src={review.avatar} alt={review.name} className="w-10 h-10 rounded-full" />
                <div>
                  <h4 className="font-semibold text-sm">{review.name}</h4>
                  <p className="text-xs opacity-60">{review.date}</p>
                </div>
                <div className="ml-auto">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-4 h-4" alt="Google" />
                </div>
              </div>
              <StarRating rating={review.stars} className="mb-2" />
              <p className="text-sm opacity-80 leading-relaxed line-clamp-4">{review.text}</p>
            </div>
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center">
            <button onClick={handleLoadMore} className="mt-6 px-4 py-2 text-sm rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
