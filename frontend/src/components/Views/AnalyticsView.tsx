import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { fetchChapters, fetchCharacters, fetchCharacterLedger } from '../../api'

interface AnalyticsViewProps {
  projectId: number
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ projectId }) => {
  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', projectId],
    queryFn: () => fetchChapters(projectId)
  })

  const { data: characters = [] } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => fetchCharacters(projectId)
  })

  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)

  // Auto-select first character when characters load or project switches
  React.useEffect(() => {
    if (characters.length > 0) {
      const exists = characters.some(c => c.id === selectedCharacterId)
      if (!exists) {
        setSelectedCharacterId(characters[0].id)
      }
    } else {
      setSelectedCharacterId(null)
    }
  }, [characters, selectedCharacterId])

  const { data: ledgerData = [] } = useQuery({
    queryKey: ['ledger', selectedCharacterId],
    queryFn: () => (selectedCharacterId ? fetchCharacterLedger(selectedCharacterId) : Promise.resolve([])),
    enabled: selectedCharacterId !== null
  })

  // Format Word Count Chart Data
  const wordCountData = useMemo(() => {
    return chapters.map((c: any) => ({
      name: c.title.substring(0, 15) + (c.title.length > 15 ? '...' : ''),
      words: c.words || 0
    }))
  }, [chapters])

  const totalWords = chapters.reduce((sum: number, c: any) => sum + (c.words || 0), 0)

  const selectedChar = characters.find((c: any) => c.id === selectedCharacterId)

  const getBaseStat = (statName: string): number => {
    if (!selectedChar?.stats || typeof selectedChar.stats !== 'object') return 0
    for (const [k, v] of Object.entries(selectedChar.stats)) {
      if (typeof v === 'number' && k.toLowerCase() === statName.toLowerCase()) return v
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        for (const [nestedK, nestedV] of Object.entries(v)) {
          if (typeof nestedV === 'number' && nestedK.toLowerCase() === statName.toLowerCase()) return nestedV
        }
      }
    }
    return 0
  }

  // Format Stat Progression Chart Data
  const statProgressionData = useMemo(() => {
    if (!ledgerData || ledgerData.length === 0) return { data: [], lines: [] }
    
    // Get all unique stat names
    const statNames = new Set<string>()

    // Reconstruct the states at each point in time
    const currentState: Record<string, number> = {}
    const timelineData: Array<Record<string, any>> = []

    // Sort by timestamp asc
    const sorted = [...ledgerData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    sorted.forEach((entry: any, index: number) => {
      let anyStatUpdated = false
      const changes = entry.changes || {}

      for (const [stat, val] of Object.entries(changes)) {
        let numVal: number | null = null
        const canonicalStat = Array.from(statNames).find(s => s.toLowerCase() === stat.toLowerCase()) || stat

        if (typeof val === 'number') {
          numVal = val
        } else if (typeof val === 'object' && val !== null) {
          if (typeof (val as any).new === 'number') {
            numVal = (val as any).new
          } else if (typeof (val as any).new === 'string' && !isNaN(Number((val as any).new)) && (val as any).new.trim() !== '') {
            numVal = Number((val as any).new)
          } else if ((val as any).delta !== undefined && (val as any).delta !== null) {
            const cleanDelta = String((val as any).delta).replace(/\s+/g, '')
            const parsedDelta = parseFloat(cleanDelta)
            if (!isNaN(parsedDelta)) {
              const currentVal = currentState[canonicalStat] !== undefined ? currentState[canonicalStat] : getBaseStat(canonicalStat)
              numVal = currentVal + parsedDelta
            }
          }
        } else if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
          numVal = Number(val)
        }

        if (numVal !== null && !isNaN(numVal)) {
          statNames.add(canonicalStat)
          currentState[canonicalStat] = numVal
          anyStatUpdated = true
        }
      }

      if (anyStatUpdated) {
        timelineData.push({
          name: entry.event_name ? (entry.event_name.length > 20 ? entry.event_name.substring(0, 18) + '...' : entry.event_name) : `Event ${index + 1}`,
          ...currentState
        })
      }
    })

    return {
      data: timelineData,
      lines: Array.from(statNames)
    }
  }, [ledgerData, selectedChar])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics & Goals</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your writing velocity and character progressions.</p>
        </header>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Project Words</h3>
            <div className="text-4xl font-bold text-slate-800 dark:text-slate-100">{totalWords.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Chapters</h3>
            <div className="text-4xl font-bold text-slate-800 dark:text-slate-100">{chapters.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Avg Words / Chapter</h3>
            <div className="text-4xl font-bold text-slate-800 dark:text-slate-100">
              {chapters.length > 0 ? Math.round(totalWords / chapters.length).toLocaleString() : 0}
            </div>
          </div>
        </div>

        {/* Word Count Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">Chapter Word Counts</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wordCountData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(51, 65, 85, 0.2)' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                />
                <Bar dataKey="words" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Character Progression Line Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Character Stat Progression</h2>
            
            <select 
              value={selectedCharacterId || ''} 
              disabled={characters.length === 0}
              onChange={(e) => setSelectedCharacterId(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block p-2 text-slate-900 dark:text-slate-200 disabled:opacity-50"
            >
              {characters.length === 0 ? (
                <option value="">No characters available</option>
              ) : (
                characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              )}
            </select>
          </div>

          {statProgressionData.data && statProgressionData.data.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statProgressionData.data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {statProgressionData.lines.map((statName: string, index: number) => (
                    <Line 
                      key={statName}
                      type="monotone" 
                      dataKey={statName} 
                      stroke={COLORS[index % COLORS.length]} 
                      strokeWidth={2}
                      dot={{ r: 4, fill: COLORS[index % COLORS.length] }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 w-full flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="text-center">
                <p className="text-slate-500 dark:text-slate-400">No ledger history available.</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Accept AI stat drafts to see progression over time.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
