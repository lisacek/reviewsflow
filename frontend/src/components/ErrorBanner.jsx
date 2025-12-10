import React, { useMemo, useState } from 'react'

export default function ErrorBanner({ error, onRetry, compact = false }) {
  const [showDetails, setShowDetails] = useState(false)

  const info = useMemo(() => {
    if (!error) return null
    if (typeof error === 'string') return { message: error }
    const e = error
    return {
      message: e.message || 'Something went wrong',
      code: e.code,
      status: e.status,
      requestId: e.requestId,
      details: e.details,
      screenshot: e.screenshot,
    }
  }, [error])

  if (!info) return null

  return (
    <div className={`w-full ${compact ? 'p-2' : 'p-3'} rounded-lg bg-red-500/10 border border-red-500/20 text-red-200`}>
      <div className="flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm leading-relaxed break-words">{info.message}</span>
            {info.status && (
              <span className="text-[10px] uppercase tracking-wide bg-red-500/20 border border-red-500/30 rounded px-1.5 py-0.5">{info.status}</span>
            )}
            {info.code && (
              <span className="text-[10px] uppercase tracking-wide bg-red-500/20 border border-red-500/30 rounded px-1.5 py-0.5">{info.code}</span>
            )}
            {info.requestId && (
              <span className="text-[10px] bg-zinc-900/60 border border-zinc-700 rounded px-1.5 py-0.5">req {info.requestId}</span>
            )}
          </div>
          {info.details && !compact && (
            <div className="mt-2">
              <button className="text-xs underline underline-offset-2" onClick={() => setShowDetails(v => !v)}>
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
              {showDetails && (
                <pre className="mt-1 text-[11px] leading-snug whitespace-pre-wrap bg-black/20 p-2 rounded border border-zinc-800 overflow-auto max-h-40">
                  {typeof info.details === 'string' ? info.details : JSON.stringify(info.details, null, 2)}
                </pre>
              )}
            </div>
          )}
          {info.screenshot && !compact && (
            <div className="mt-2 text-xs text-red-300/90">
              Screenshot saved at: <code className="bg-black/20 px-1 py-0.5 rounded border border-zinc-800">{info.screenshot}</code>
            </div>
          )}
          {!compact && (
            <div className="text-[11px] text-red-300/80 mt-2">
              {info.status === 401 && 'Check your login credentials.'}
              {info.status === 403 && 'You do not have permission to perform this action.'}
              {info.status === 404 && 'The requested resource was not found.'}
              {info.status && info.status >= 500 && 'Server issue. Please try again later.'}
            </div>
          )}
        </div>
        {onRetry && (
          <button onClick={onRetry} className="text-xs text-white bg-red-600/30 hover:bg-red-600/40 border border-red-500/40 rounded px-2 py-1">
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
