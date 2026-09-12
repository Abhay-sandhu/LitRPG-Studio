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
import { fetchCharacters, fetchCharacterLedger, acceptActionDraft, createLore } from '../../api'

export interface DraftItem {
  id: number
  type: 'item' | 'stat' | 'lore' | string
  title: string
  desc: string
  context: string
  changes?: Record<string, any>
  lore_entity?: Record<string, any>
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

  // Fetch Characters
  const { data: characters = [], isLoading: isCharsLoading } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => fetchCharacters(projectId)
  })

  const protagonist = characters.find((c: any) => c.is_protagonist) || characters[0]
  
  // Fetch Ledger for protagonist
  const { data: ledger = [], isLoading: isLedgerLoading } = useQuery({
    queryKey: ['ledger', protagonist?.id],
    queryFn: () => fetchCharacterLedger(protagonist.id),
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
    if (!draft || !protagonist) return

    if (draft.changes && typeof draft.changes === 'object' && Object.keys(draft.changes).length > 0 && !activeChapterId) {
        alert("Cannot accept draft: No active chapter found. Please ensure you are viewing a chapter.")
        return
    }

    processedDrafts.current.add(id)

    try {
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
        const updatedStats = { ...protagonist.stats }
        
        Object.entries(draft.changes).forEach(([statKey, changeVal]: [string, any]) => {
          // A. Handle numeric / scalar stat changes
          if (changeVal.new !== undefined) {
            let nestedFound = false
            for (const [category, attributes] of Object.entries(updatedStats)) {
              if (typeof attributes === 'object' && attributes !== null && !Array.isArray(attributes) && statKey in attributes) {
                // Prevent hallucination from overwriting an array with a scalar
                if (!Array.isArray((attributes as any)[statKey])) {
                    updatedStats[category] = { ...attributes, [statKey]: changeVal.new }
                } else {
                    console.warn(`Type safety: Refused to overwrite array ${statKey} with scalar ${changeVal.new}`)
                }
                nestedFound = true
                break
              }
            }
            if (!nestedFound) {
              // Prevent hallucination from overwriting a root array with a scalar
              if (updatedStats[statKey] !== undefined && Array.isArray(updatedStats[statKey])) {
                  console.warn(`Type safety: Refused to overwrite root array ${statKey} with scalar ${changeVal.new}`)
              } else {
                  updatedStats[statKey] = changeVal.new
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
        })

        const ledgerEntry = {
          character_id: protagonist.id,
          chapter_id: activeChapterId!,
          event_name: draft.title,
          changes: draft.changes || {},
          source_type: "AI Draft"
        }

        await acceptActionDraft(protagonist.id, { stats: updatedStats }, ledgerEntry)
        
        queryClient.invalidateQueries({ queryKey: ['characters'] })
        queryClient.invalidateQueries({ queryKey: ['ledger', protagonist.id] })
        acceptedSomething = true
      }

      if (!acceptedSomething) {
        console.warn("AI draft had no valid lore_entity or changes attached.")
      }
      
      setDrafts((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      console.error("Failed to accept draft:", err)
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
        ) : !protagonist ? (
            <div className="text-center py-8 text-slate-400 text-xs">No character data available.</div>
        ) : activeTab === 'sheet' ? (
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

            {/* Formulas Breakdown */}
            {protagonist.formulas && Object.keys(protagonist.formulas).length > 0 && (
                <div className="pt-1 space-y-1">
                    {Object.entries(protagonist.formulas).map(([key, formula]: [string, any]) => (
                        <div key={key} className="text-[10px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-800/50">
                            {key} = {formula}
                        </div>
                    ))}
                </div>
            )}
          </>
        ) : activeTab === 'ledger' ? (
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
