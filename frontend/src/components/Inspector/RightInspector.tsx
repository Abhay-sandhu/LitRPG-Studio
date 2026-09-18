import React, { useState, useRef } from 'react'
import {
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Check,
  X,
  History,
  Activity,
  Zap,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCharacters, fetchCharacterLedger, acceptActionDraft, createLore, updateCharacter, createLoreRelationshipsBulk } from '../../api'

export interface DraftItem {
  id: number
  type: 'item' | 'stat' | 'lore' | string
  title: string
  desc: string
  context: string
  changes?: Record<string, any>
  lore_entity?: Record<string, any>
  relationships?: Array<{source: string, target: string, type: string}>
}

interface RightInspectorProps {
  collapsed: boolean
  onToggleCollapse: () => void
  projectId?: number
  drafts: DraftItem[]
  setDrafts: React.Dispatch<React.SetStateAction<DraftItem[]>>
  onScanChapter: () => void
  activeChapterId?: number
}

function getAllStatVariables(stats: Record<string, any>): Record<string, number> {
  const vars: Record<string, number> = {}
  if (!stats || typeof stats !== 'object') return vars

  for (const [key, val] of Object.entries(stats)) {
    if (typeof val === 'number') {
      vars[key.toLowerCase()] = val
      vars[key] = val
    } else if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
      vars[key.toLowerCase()] = Number(val)
      vars[key] = Number(val)
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      for (const [innerKey, innerVal] of Object.entries(val)) {
        if (typeof innerVal === 'number') {
          vars[innerKey.toLowerCase()] = innerVal
          vars[innerKey] = innerVal
        } else if (typeof innerVal === 'string' && !isNaN(Number(innerVal)) && innerVal.trim() !== '') {
          vars[innerKey.toLowerCase()] = Number(innerVal)
          vars[innerKey] = Number(innerVal)
        }
      }
    }
  }
  return vars
}

export function evaluateFormula(formula: string, stats: Record<string, any>): number | null {
  if (!formula || typeof formula !== 'string') return null
  try {
    const vars = getAllStatVariables(stats)
    const tokenized = formula.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (match) => {
      if (match in vars) return String(vars[match])
      const lower = match.toLowerCase()
      if (lower in vars) return String(vars[lower])
      return match
    })

    if (!/^[0-9+\-*/().\s]+$/.test(tokenized)) {
      return null
    }

    const result = Function(`"use strict"; return (${tokenized})`)()
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return Math.round(result * 100) / 100
    }
    return null
  } catch {
    return null
  }
}

export const RightInspector: React.FC<RightInspectorProps> = React.memo(({
  collapsed,
  onToggleCollapse,
  projectId = 1,
  drafts,
  setDrafts,
  onScanChapter,
  activeChapterId,
}) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'ledger' | 'drafts'>('sheet')
  const [isEditingFormulas, setIsEditingFormulas] = useState(false)
  const [editedFormulaRows, setEditedFormulaRows] = useState<Array<{id: string, key: string, value: string}>>([])
  const [newFormulaKey, setNewFormulaKey] = useState('')
  const [newFormulaValue, setNewFormulaValue] = useState('')

  // Fetch Characters
  const { data: characters = [], isLoading: isCharsLoading } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => fetchCharacters(projectId)
  })

  const protagonist = characters.find((c: any) => c.is_protagonist) || characters[0]
  
  // Fetch Ledger for protagonist
  const { data: ledger = [], isLoading: isLedgerLoading } = useQuery({
    queryKey: ['ledger', protagonist?.id],
    queryFn: () => (protagonist?.id ? fetchCharacterLedger(protagonist.id) : Promise.resolve([])),
    enabled: !!protagonist?.id
  })
  const queryClient = useQueryClient()
  const processedDrafts = useRef<Set<number>>(new Set())

  const handleDismiss = (id: number) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }

  const handleAccept = async (id: number) => {
    if (processedDrafts.current.has(id)) return

    const draft = drafts.find((d) => d.id === id)
    if (!draft) return

    if (draft.changes && typeof draft.changes === 'object' && Object.keys(draft.changes).length > 0 && !activeChapterId) {
        alert("Cannot accept draft: No active chapter found. Please ensure you are viewing a chapter.")
        return
    }

    try {
      processedDrafts.current.add(id)
      let acceptedSomething = false

      // 1. Process World-Building Lore if present
      if (draft.lore_entity) {
        await createLore({
          project_id: projectId,
          name: draft.lore_entity.name || draft.title,
          category: draft.lore_entity.category || 'Concept',
          attributes: draft.lore_entity.attributes || {},
          description: draft.lore_entity.description || draft.desc,
          is_promoted: false
        })
        queryClient.invalidateQueries({ queryKey: ['lore', projectId] })
        acceptedSomething = true
      }

      // 2. Process Character Stat/Item changes if present
      if (draft.changes && typeof draft.changes === 'object' && Object.keys(draft.changes).length > 0) {
        if (!protagonist) {
          alert("Cannot apply stat changes because no protagonist character exists.")
          processedDrafts.current.delete(id)
          return
        }
        const updatedStats = { ...protagonist.stats }
        let updatedFormulas = { ...(protagonist.formulas || {}) }
        let formulasChanged = false
        
        Object.entries(draft.changes).forEach(([statKey, changeVal]: [string, any]) => {
          // A. Handle numeric / scalar stat changes
          let targetVal = changeVal.new
          if (targetVal === undefined && changeVal.delta !== undefined) {
            let existingVal: any = undefined
            for (const [, attributes] of Object.entries(updatedStats)) {
              if (typeof attributes === 'object' && attributes !== null && !Array.isArray(attributes) && statKey in attributes) {
                existingVal = (attributes as any)[statKey]
                break
              }
            }
            if (existingVal === undefined && updatedStats[statKey] !== undefined) {
              existingVal = updatedStats[statKey]
            }
            const numCurrent = typeof existingVal === 'number' ? existingVal : parseFloat(existingVal)
            const numDelta = typeof changeVal.delta === 'number' ? changeVal.delta : parseFloat(changeVal.delta)
            if (!isNaN(numCurrent) && !isNaN(numDelta)) {
              targetVal = numCurrent + numDelta
            } else if (!isNaN(numDelta)) {
              targetVal = numDelta
            }
          }

          if (targetVal !== undefined) {
            let nestedFound = false
            for (const [category, attributes] of Object.entries(updatedStats)) {
              if (typeof attributes === 'object' && attributes !== null && !Array.isArray(attributes) && statKey in attributes) {
                // Prevent hallucination from overwriting an array with a scalar
                if (!Array.isArray((attributes as any)[statKey])) {
                    updatedStats[category] = { ...attributes, [statKey]: targetVal }
                } else {
                    console.warn(`Type safety: Refused to overwrite array ${statKey} with scalar ${targetVal}`)
                }
                nestedFound = true
                break
              }
            }
            if (!nestedFound) {
              // Prevent hallucination from overwriting a root array with a scalar
              if (updatedStats[statKey] !== undefined && Array.isArray(updatedStats[statKey])) {
                  console.warn(`Type safety: Refused to overwrite root array ${statKey} with scalar ${targetVal}`)
              } else {
                  updatedStats[statKey] = targetVal
              }
            }
          }
          
          // B. Handle list additions (Skills, Inventory, Titles, etc.)
          if (changeVal.append !== undefined) {
            let appended = false
            
            // Check root first
            if (updatedStats[statKey] !== undefined) {
                if (Array.isArray(updatedStats[statKey])) {
                    if (!updatedStats[statKey].includes(changeVal.append)) {
                        updatedStats[statKey] = [...updatedStats[statKey], changeVal.append]
                    }
                    appended = true
                } else {
                    console.warn(`Type safety: Refused to append to non-array root scalar ${statKey}`)
                    appended = true // Mark as handled to prevent fallback overwrite
                }
            }
            
            // If not found at root, check nested categories
            if (!appended) {
              for (const [category, attributes] of Object.entries(updatedStats)) {
                if (typeof attributes === 'object' && attributes !== null && statKey in attributes) {
                  if (Array.isArray((attributes as any)[statKey])) {
                      const existing = (attributes as any)[statKey]
                      if (!existing.includes(changeVal.append)) {
                          updatedStats[category] = {
                            ...attributes,
                            [statKey]: [...existing, changeVal.append]
                          }
                      }
                  } else {
                      console.warn(`Type safety: Refused to append to non-array nested scalar ${statKey}`)
                  }
                  appended = true
                  break
                }
              }
            }
            
            // If completely new, safely initialize it as an array
            if (!appended) {
              updatedStats[statKey] = [changeVal.append]
            }
          }
          
          // C. Handle relative stat buffs / delta overrides on formulas
          if (changeVal.delta !== undefined) {
             const deltaStr = String(changeVal.delta)
             if (protagonist.formulas && protagonist.formulas[statKey]) {
                const numMatch = deltaStr.trim().match(/^([+-]\s*\d+(?:\.\d+)?)/)
                if (numMatch) {
                    updatedFormulas[statKey] = `(${updatedFormulas[statKey]}) ${numMatch[1]}`
                    formulasChanged = true
                }
             }
          }
        })

        const ledgerEntry = {
          character_id: protagonist.id,
          chapter_id: activeChapterId!,
          event_name: draft.title,
          changes: draft.changes || {},
          source_type: "AI Draft"
        }

        const payload: any = { stats: updatedStats }
        if (formulasChanged) {
            payload.formulas = updatedFormulas
        }

        await acceptActionDraft(protagonist.id, payload, ledgerEntry)
        
        queryClient.invalidateQueries({ queryKey: ['characters'] })
        queryClient.invalidateQueries({ queryKey: ['ledger', protagonist.id] })
        acceptedSomething = true
      }

      // 3. Process GraphRAG Relationships if present
      if (draft.type === 'relationships' && draft.relationships) {
        await createLoreRelationshipsBulk(projectId, draft.relationships)
        queryClient.invalidateQueries({ queryKey: ['lore', projectId] })
        queryClient.invalidateQueries({ queryKey: ['lore-relationships', projectId] })
        acceptedSomething = true
      }

      if (!acceptedSomething) {
        console.warn("AI draft had no valid lore_entity or changes attached.")
      }
      
      setDrafts((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      console.error("Failed to accept draft:", err)
      alert("Failed to accept draft. Please try again.")
      processedDrafts.current.delete(id)
    }
  }
  if (collapsed) {
    return (
      <aside className="w-12 border-l border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 flex flex-col items-center py-3 select-none transition-colors">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          title="Expand Inspector"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="mt-4 flex flex-col gap-2 w-full px-2">
          <button
            onClick={() => { setActiveTab('sheet'); onToggleCollapse(); }}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              activeTab === 'sheet' 
                ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Character Sheet"
          >
            <User className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setActiveTab('ledger'); onToggleCollapse(); }}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              activeTab === 'ledger' 
                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Ledger History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setActiveTab('drafts'); onToggleCollapse(); }}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              activeTab === 'drafts' 
                ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="AI Drafts"
          >
            <div className="relative">
              <Sparkles className="w-4 h-4" />
              {drafts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
              )}
            </div>
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 flex flex-col select-none transition-colors text-sm">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-slate-200 ml-1">RPG Engine</span>
            <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            title="Collapse Inspector"
            >
            <ChevronRight className="w-4 h-4" />
            </button>
        </div>

        <div className="flex bg-slate-200/50 dark:bg-slate-950/70 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800/80 w-full text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'sheet'
                ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-sky-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Sheet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'ledger'
                ? 'bg-white dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Ledger
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'drafts'
                ? 'bg-white dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-amber-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Drafts</span>
            {drafts.length > 0 && (
              <span className="w-3.5 h-3.5 rounded-full bg-amber-100 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-[9px] font-bold flex items-center justify-center border border-amber-200 dark:border-amber-500/50">
                {drafts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isCharsLoading ? (
            <div className="text-center py-8 text-slate-400"><Activity className="w-6 h-6 mx-auto animate-pulse" /></div>
        ) : activeTab === 'sheet' ? (
          !protagonist ? (
            <div className="text-center py-8 text-slate-400 text-xs">No character data available.</div>
          ) : (
          <>
            {/* Identity Card */}
            <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 shadow-sm transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{protagonist.name}</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Primary Protagonist</p>
                </div>
              </div>
            </div>

            {/* Dynamic Stats Rendering */}
            {protagonist.stats && Object.entries(protagonist.stats).map(([category, attributes]: [string, any]) => (
                <div key={category} className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-sm transition-colors">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>{category}</span>
                    </h4>
                    
                    {Array.isArray(attributes) ? (
                        <div className="flex flex-wrap gap-1.5">
                            {attributes.map((attr, idx) => (
                                <span key={idx} className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-[11px] text-slate-700 dark:text-slate-300">
                                    {attr}
                                </span>
                            ))}
                        </div>
                    ) : typeof attributes === 'object' && attributes !== null ? (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(attributes).map(([key, val]: [string, any]) => (
                                <div key={key} className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-2 rounded-lg flex flex-col">
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{key}</span>
                                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{attributes}</div>
                    )}
                </div>
            ))}

            {/* Formulas Breakdown & Editor */}
            <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Derived Formulas
                    </span>
                    <div className="flex items-center gap-1.5">
                        {isEditingFormulas && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditingFormulas(false)
                                    setEditedFormulaRows([])
                                    setNewFormulaKey("")
                                    setNewFormulaValue("")
                                }}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={async () => {
                                if (isEditingFormulas) {
                                    // Save
                                    try {
                                        const finalFormulas = editedFormulaRows.reduce((acc, row) => {
                                          const trimmedKey = row.key.trim()
                                          if (trimmedKey) acc[trimmedKey] = row.value.trim()
                                          return acc
                                        }, {} as Record<string, string>)
                                        
                                        if (newFormulaKey.trim() && newFormulaValue.trim()) {
                                          finalFormulas[newFormulaKey.trim()] = newFormulaValue.trim()
                                        }
                                        
                                        await updateCharacter(protagonist.id, { formulas: finalFormulas })
                                        queryClient.invalidateQueries({ queryKey: ['characters'] })
                                        setIsEditingFormulas(false)
                                    } catch (err) {
                                        console.error("Failed to save formulas:", err)
                                        alert("Failed to save formulas. Please try again.")
                                    }
                                } else {
                                    // Start editing
                                    const existingFormulas = protagonist.formulas || {}
                                    const rows = Object.entries(existingFormulas).map(([k, v]) => ({
                                      id: Math.random().toString(36).substr(2, 9),
                                      key: k,
                                      value: v as string
                                    }))
                                    setEditedFormulaRows(rows)
                                    setNewFormulaKey("")
                                    setNewFormulaValue("")
                                    setIsEditingFormulas(true)
                                }
                            }}
                            className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-medium transition-colors"
                        >
                            {isEditingFormulas ? 'Save' : 'Edit'}
                        </button>
                    </div>
                </div>

                {isEditingFormulas ? (
                    <div className="space-y-2">
                        {editedFormulaRows.map((row) => (
                            <div key={row.id} className="flex gap-2 items-center">
                                <input
                                    value={row.key}
                                    onChange={(e) => {
                                        setEditedFormulaRows(prev => prev.map(r => r.id === row.id ? { ...r, key: e.target.value } : r))
                                    }}
                                    placeholder="Stat Name"
                                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs"
                                />
                                <span className="text-slate-400">=</span>
                                <input
                                    value={row.value}
                                    onChange={(e) => {
                                        setEditedFormulaRows(prev => prev.map(r => r.id === row.id ? { ...r, value: e.target.value } : r))
                                    }}
                                    placeholder="e.g. Endurance * 10"
                                    className="flex-[2] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                                />
                                <button
                                    onClick={() => {
                                        setEditedFormulaRows(prev => prev.filter(r => r.id !== row.id))
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Remove Formula"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        
                        {/* Add New Formula Row */}
                        <div className="flex gap-2 items-center pt-1 border-t border-slate-100 dark:border-slate-800/50">
                            <input
                                value={newFormulaKey}
                                onChange={(e) => setNewFormulaKey(e.target.value)}
                                placeholder="New Stat (e.g. Max HP)"
                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs"
                            />
                            <span className="text-slate-400">=</span>
                            <input
                                value={newFormulaValue}
                                onChange={(e) => setNewFormulaValue(e.target.value)}
                                placeholder="Formula"
                                className="flex-[2] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newFormulaKey.trim() && newFormulaValue.trim()) {
                                        setEditedFormulaRows(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), key: newFormulaKey.trim(), value: newFormulaValue.trim() }])
                                        setNewFormulaKey("")
                                        setNewFormulaValue("")
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    if (newFormulaKey.trim() && newFormulaValue.trim()) {
                                        setEditedFormulaRows(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), key: newFormulaKey.trim(), value: newFormulaValue.trim() }])
                                        setNewFormulaKey("")
                                        setNewFormulaValue("")
                                    }
                                }}
                                className="text-emerald-600 hover:text-emerald-700 p-1"
                                title="Add Formula"
                            >
                                <Check className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    protagonist.formulas && Object.keys(protagonist.formulas).length > 0 ? (
                        <div className="space-y-1">
                            {Object.entries(protagonist.formulas).map(([key, formula]: [string, any]) => {
                                const computed = evaluateFormula(String(formula), protagonist.stats || {})
                                return (
                                    <div key={key} className="text-[10px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-800/50 flex justify-between items-center">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{key}</span>
                                        <div className="flex items-center gap-1.5">
                                            {computed !== null && (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{computed}</span>
                                            )}
                                            <span className="text-slate-400 dark:text-slate-500">(= {formula})</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-[10px] text-slate-400 italic py-1">No formulas defined.</div>
                    )
                )}
            </div>
          </>
          )
        ) : activeTab === 'ledger' ? (
          !protagonist ? (
            <div className="text-center py-8 text-slate-400 text-xs">No character data available.</div>
          ) : (
          <div className="space-y-3">
             {isLedgerLoading ? (
                 <div className="text-center py-4"><Activity className="w-4 h-4 mx-auto animate-pulse text-slate-400" /></div>
             ) : ledger.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 space-y-2">
                  <History className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs">No progression history yet.</p>
                </div>
             ) : (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-2 space-y-4 pb-4">
                  {ledger.map((entry: any) => (
                      <div key={entry.id} className="relative pl-4">
                          <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-slate-50 dark:ring-slate-900" />
                          <div className="text-[10px] text-slate-400 font-mono mb-0.5">
                              {new Date(entry.timestamp).toLocaleDateString()}
                          </div>
                          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-sm">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">{entry.event_name}</div>
                              {Object.entries(entry.changes || {}).map(([stat, diff]: [string, any]) => {
                                  const diffText = typeof diff === 'object' && diff !== null
                                    ? (diff.delta || (diff.append ? `+ ${diff.append}` : (diff.new !== undefined ? `-> ${diff.new}` : JSON.stringify(diff))))
                                    : String(diff)
                                  return (
                                      <div key={stat} className="flex justify-between items-center text-[11px] bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded mt-1">
                                          <span className="text-slate-600 dark:text-slate-400">{stat}</span>
                                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{diffText}</span>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                  ))}
                </div>
             )}
          </div>
          )
        ) : (
          <>
            {/* Pending AI Draft Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Action Drafts</span>
                <button
                  type="button"
                  onClick={onScanChapter}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors text-xs font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Scan Chapter
                </button>
              </div>

              {drafts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 space-y-2">
                  <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs">No pending drafts detected.</p>
                </div>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-500/30 rounded-xl p-3 space-y-2 shadow-sm hover:border-amber-400 dark:hover:border-amber-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20">
                        {draft.title}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{draft.desc}</p>
                    <p className="text-[11px] text-slate-500 italic">{draft.context}</p>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => handleAccept(draft.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-medium transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismiss(draft.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-medium transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  )
})
