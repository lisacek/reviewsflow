import React, { useEffect, useState } from 'react'
import { setPageSEO } from '../seo.js'
import { getDomains, addDomain, deleteDomainById, getInstances, createInstance } from '../api.js'

export default function Onboarding() {
  useEffect(() => {
    setPageSEO({
      title: 'Onboarding — ReviewsFlow',
      description: 'Configure allowed domains and create review instances to embed on your site.',
    })
  }, [])
  const [domains, setDomains] = useState([])
  const [newDomain, setNewDomain] = useState('')
  const [instances, setInstances] = useState([])
  const [_loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [placeUrl, setPlaceUrl] = useState('')
  const [locales, setLocales] = useState('en-US')
  const [intervalMinutes, setIntervalMinutes] = useState(60)
  const [minRating, setMinRating] = useState(1.0)
  const [maxReviews, setMaxReviews] = useState(200)
  const [sort, setSort] = useState('newest')

  const refresh = async () => {
    setLoading(true); setError(null)
    try {
      const [d, i] = await Promise.all([getDomains(), getInstances()])
      setDomains(Array.isArray(d)?d:[])
      setInstances(Array.isArray(i)?i:[])
    } catch (e) {
      setError(e?.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ refresh() },[])

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return
    await addDomain(newDomain.trim())
    setNewDomain('')
    refresh()
  }
  const handleDeleteDomain = async (id) => { await deleteDomainById(id); refresh() }

  const handleCreateInstance = async () => {
    const body = {
      place_url: placeUrl,
      locales: locales.split(',').map(s=>s.trim()).filter(Boolean),
      interval_minutes: Number(intervalMinutes)||60,
      min_rating: Number(minRating)||1.0,
      max_reviews: Number(maxReviews)||200,
      sort,
    }
    const inst = await createInstance(body)
    setPlaceUrl('')
    refresh()
    alert(`Instance created. Public key: ${inst.public_key}`)
  }

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-xl font-semibold">Onboarding</h2>
      {error && <div className="text-xs text-red-400">{error}</div>}

      {/* Domains */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Allowed Domains</h3>
        <div className="flex gap-2">
          <input value={newDomain} onChange={e=>setNewDomain(e.target.value)} placeholder="example.com" className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2" />
          <button onClick={handleAddDomain} className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded">Add</button>
        </div>
        <ul className="space-y-2">
          {(domains||[]).map(d => (
            <li key={d.id} className="flex items-center justify-between border border-zinc-800 rounded px-3 py-2">
              <span className="text-sm">{d.host} {d.active===false && <em className="text-zinc-500">(inactive)</em>}</span>
              <button onClick={()=>handleDeleteDomain(d.id)} className="text-xs text-red-400">Delete</button>
            </li>
          ))}
          {(!domains || domains.length===0) && <li className="text-xs text-zinc-500">No domains configured. Public requests will be allowed from any origin.</li>}
        </ul>
      </section>

      {/* Instances */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Create Review Instance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm block mb-1">Google Maps Place URL</label>
            <input value={placeUrl} onChange={e=>setPlaceUrl(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" placeholder="https://maps.google.com/..." />
          </div>
          <div>
            <label className="text-sm block mb-1">Locales (comma)</label>
            <input value={locales} onChange={e=>setLocales(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" placeholder="en-US,cs-CZ" />
          </div>
          <div>
            <label className="text-sm block mb-1">Interval minutes</label>
            <input type="number" value={intervalMinutes} onChange={e=>setIntervalMinutes(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm block mb-1">Min rating</label>
            <input type="number" step="0.1" value={minRating} onChange={e=>setMinRating(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm block mb-1">Max reviews</label>
            <input type="number" value={maxReviews} onChange={e=>setMaxReviews(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm block mb-1">Sort</label>
            <select value={sort} onChange={e=>setSort(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2">
              {['newest','oldest','best','worst'].map(o=>(<option key={o} value={o}>{o}</option>))}
            </select>
          </div>
        </div>
        <button onClick={handleCreateInstance} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Create Instance</button>

        <div className="mt-4">
          <h4 className="text-sm font-medium">Existing Instances</h4>
          <ul className="space-y-2 mt-2">
            {(instances||[]).map(it => (
              <li key={it.id} className="border border-zinc-800 rounded p-3 text-xs">
                <div><strong>public_key:</strong> {it.public_key}</div>
                <div><strong>place_url:</strong> {it.place_url}</div>
                <div><strong>locales:</strong> {(it.locales||[]).join(', ')}</div>
              </li>
            ))}
            {(!instances || instances.length===0) && <li className="text-xs text-zinc-500">No instances yet.</li>}
          </ul>
        </div>
      </section>
    </div>
  )
}
