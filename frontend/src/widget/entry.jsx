import React from 'react'
import { createRoot } from 'react-dom/client'
import Widget from './Widget.jsx'
import './style.css'

function getScriptEl() {
  let s = document.currentScript
  if (!s) {
    const arr = document.getElementsByTagName('script')
    s = arr[arr.length - 1]
  }
  return s
}

function ensureTarget(scriptEl) {
  const id = scriptEl.getAttribute('data-target') || 'reviews-widget'
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('div')
    el.id = id
    scriptEl.parentNode.insertBefore(el, scriptEl)
  }
  return el
}

function mount() {
  const s = getScriptEl()
  const apiBase = s.getAttribute('data-api-base') || ''
  const instance = s.getAttribute('data-instance') || ''
  const minRating = parseFloat(s.getAttribute('data-min-rating') || '4')
  const maxReviews = parseInt(s.getAttribute('data-max-reviews') || '6', 10)
  const sort = s.getAttribute('data-sort') || 'newest'
  const theme = s.getAttribute('data-theme') || 'dark'
  const design = s.getAttribute('data-design') || 'grid'
  const target = ensureTarget(s)

  const root = createRoot(target)
  root.render(
    <Widget
      apiBase={apiBase}
      instance={instance}
      minRating={minRating}
      maxReviews={maxReviews}
      sort={sort}
      theme={theme}
      design={design}
    />
  )
}

if (document.readyState !== 'loading') mount()
else document.addEventListener('DOMContentLoaded', mount)

