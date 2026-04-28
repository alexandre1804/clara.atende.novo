'use client'

import { useState, useCallback } from 'react'

interface Result {
  id: string
  title: string
  link: string
  snippet: string
  emails: string[]
  phones: string[]
  status: 'pending' | 'extracting' | 'done' | 'error'
}

type Phase = 'idle' | 'searching' | 'extracting' | 'done'

function StatusBadge({ status }: { status: Result['status'] }) {
  const map = {
    pending: { label: 'Aguardando', cls: 'bg-gray-100 text-gray-500' },
    extracting: { label: 'Buscando…', cls: 'bg-blue-100 text-blue-600 animate-pulse' },
    done: { label: 'Concluído', cls: 'bg-green-100 text-green-700' },
    error: { label: 'Erro', cls: 'bg-red-100 text-red-600' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
  )
}

function exportCSV(results: Result[]) {
  const header = ['Empresa', 'Site', 'Emails', 'Telefones']
  const rows = results.map((r) => [
    r.title,
    r.link,
    r.emails.join(' | '),
    r.phones.join(' | '),
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `emails_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function EmailExtractorApp() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [num, setNum] = useState(10)
  const [phase, setPhase] = useState<Phase>('idle')
  const [results, setResults] = useState<Result[]>([])
  const [error, setError] = useState('')

  const isSearching = phase === 'searching' || phase === 'extracting'
  const doneCount = results.filter((r) => r.status === 'done').length
  const totalEmails = results.reduce((acc, r) => acc + r.emails.length, 0)
  const progress =
    phase === 'searching'
      ? 10
      : phase === 'extracting' && results.length > 0
      ? Math.round(10 + (doneCount / results.length) * 90)
      : phase === 'done'
      ? 100
      : 0

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !location.trim()) {
      setError('Preencha o nicho e a localização')
      return
    }

    setError('')
    setResults([])
    setPhase('searching')

    try {
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), location: location.trim(), num }),
      })

      const searchData = await searchRes.json() as { results?: Array<{ title: string; link: string; snippet: string }>; error?: string }

      if (!searchRes.ok) throw new Error(searchData.error ?? 'Erro ao buscar no Google')

      const items = searchData.results ?? []

      if (items.length === 0) {
        setError('Nenhum resultado encontrado. Tente outros termos.')
        setPhase('idle')
        return
      }

      const initial: Result[] = items.map((r, i) => ({
        id: String(i),
        ...r,
        emails: [],
        phones: [],
        status: 'pending',
      }))
      setResults(initial)
      setPhase('extracting')

      for (const item of initial) {
        setResults((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, status: 'extracting' } : r))
        )

        try {
          const extractRes = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: item.link }),
          })

          const extractData = await extractRes.json() as { emails?: string[]; phones?: string[] }

          setResults((prev) =>
            prev.map((r) =>
              r.id === item.id
                ? { ...r, emails: extractData.emails ?? [], phones: extractData.phones ?? [], status: 'done' }
                : r
            )
          )
        } catch {
          setResults((prev) =>
            prev.map((r) => (r.id === item.id ? { ...r, status: 'error' } : r))
          )
        }
      }

      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setPhase('idle')
    }
  }, [query, location, num])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Extrator de Emails</h1>
          </div>
          <p className="text-blue-100 text-sm ml-13 pl-1">
            Encontre emails de empresas por nicho e localização via Google
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
        {/* Search Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nicho / Segmento
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSearching && void handleSearch()}
                placeholder="ex: clínica odontológica"
                disabled={isSearching}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Localização
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSearching && void handleSearch()}
                placeholder="ex: São Paulo - SP"
                disabled={isSearching}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Quantidade
              </label>
              <div className="flex gap-2">
                <select
                  value={num}
                  onChange={(e) => setNum(Number(e.target.value))}
                  disabled={isSearching}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50"
                >
                  <option value={10}>10 resultados</option>
                  <option value={20}>20 resultados</option>
                  <option value={30}>30 resultados</option>
                  <option value={50}>50 resultados</option>
                </select>
                <button
                  onClick={() => void handleSearch()}
                  disabled={isSearching}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isSearching ? 'Buscando…' : 'Buscar'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {isSearching && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">
                {phase === 'searching' && '🔍 Buscando empresas no Google…'}
                {phase === 'extracting' && `📧 Extraindo emails… ${doneCount} / ${results.length}`}
              </span>
              <span className="text-gray-400">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats + Export */}
        {results.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3 shadow-sm">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{results.length}</span> empresas •{' '}
              <span className="font-semibold text-green-600">{totalEmails}</span> emails extraídos •{' '}
              <span className="font-semibold text-gray-900">{doneCount}/{results.length}</span> processados
            </p>
            <button
              onClick={() => exportCSV(results)}
              disabled={totalEmails === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar CSV
            </button>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-500 w-8">#</th>
                  <th className="px-4 py-3 font-semibold text-gray-500">Empresa / Site</th>
                  <th className="px-4 py-3 font-semibold text-gray-500">Emails</th>
                  <th className="px-4 py-3 font-semibold text-gray-500">Telefones</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((result, i) => (
                  <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>

                    <td className="px-4 py-3 max-w-xs">
                      <a
                        href={result.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline block truncate"
                        title={result.title}
                      >
                        {result.title}
                      </a>
                      <span className="text-gray-400 text-xs block truncate">{result.link}</span>
                    </td>

                    <td className="px-4 py-3">
                      {result.emails.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {result.emails.map((email) => (
                            <span
                              key={email}
                              className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs"
                            >
                              {email}
                            </span>
                          ))}
                        </div>
                      ) : result.status === 'done' ? (
                        <span className="text-gray-400 text-xs italic">Não encontrado</span>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      {result.phones.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {result.phones.map((phone) => (
                            <span key={phone} className="text-gray-600 text-xs">
                              {phone}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={result.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
