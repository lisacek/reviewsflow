export function setPageSEO({ title, description, canonical } = {}) {
  if (title) {
    document.title = title
    setMeta('og:title', title, true)
    setMeta('twitter:title', title)
  }
  if (description) {
    setMeta('description', description)
    setMeta('og:description', description, true)
    setMeta('twitter:description', description)
  }
  const url = canonical || (typeof window !== 'undefined' ? window.location.href : undefined)
  if (url) {
    setCanonical(url)
    setMeta('og:url', url, true)
  }
}

function setMeta(nameOrProp, content, isProperty = false) {
  const attr = isProperty ? 'property' : 'name'
  let el = document.head.querySelector(`meta[${attr}="${nameOrProp}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, nameOrProp)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

