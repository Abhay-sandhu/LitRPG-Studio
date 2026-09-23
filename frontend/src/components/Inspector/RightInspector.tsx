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
import { fetchCharacters, fetchCharacterLedger, acceptActionDraft, createLore, updateCharacter, createCharacter, createLoreRelationshipsBulk, sendChatMessage } from '../../api'

export interface DraftItem {
  id: number
  chapter_id?: number
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
    
    // Sort keys by descending length so multi-word or longer keys match before substrings
    const sortedKeys = Object.keys(vars).sort((a, b) => b.length - a.length)
    let tokenized = formula
    for (const key of sortedKeys) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
      tokenized = tokenized.replace(regex, String(vars[key]))
    }

    if (!/^[0-9+\-*/().\s%]+$/.test(tokenized)) {
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
  const [activeTab, setActiveTab] = useState<'sheet' | 'ledger' | 'drafts' | 'chat'>('sheet')
  const [isEditingFormulas, setIsEditingFormulas] = useState(false)
  const [editedFormulaRows, setEditedFormulaRows] = useState<Array<{id: string, key: string, value: string}>>([])
  const [newFormulaKey, setNewFormulaKey] = useState('')
  const [newFormulaValue, setNewFormulaValue] = useState('')

  // Chat State
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([
    { role: 'model', content: 'Hello! I am your AI Co-writer. How can I help you brainstorm today?' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Character Initialization Form State
  const [newCharacterName, setNewCharacterName] = useState('')
  const [isCreatingChar, setIsCreatingChar] = useState(false)

  // Reset chat and project-specific inspector state when projectId changes
  React.useEffect(() => {
    setChatMessages([
      { role: 'model', content: 'Hello! I am your AI Co-writer. How can I help you brainstorm today?' }
    ])
    setChatInput('')
    setNewCharacterName('')
    setIsEditingFormulas(false)
  }, [projectId])

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isChatLoading) return

    const userMessage = { role: 'user', content: chatInput.trim() }
    const updatedMessages = [...chatMessages, userMessage]
    setChatMessages(updatedMessages)
    setChatInput('')
    setIsChatLoading(true)

    try {
      const result = await sendChatMessage(projectId || 1, updatedMessages)
      if (result.status === 'ok') {
        setChatMessages([...updatedMessages, { role: 'model', content: result.response }])
      } else {
        throw new Error("Failed to get response")
      }
    } catch (err) {
      console.error(err)
      setChatMessages([...updatedMessages, { role: 'model', content: 'Oops, something went wrong communicating with the AI.' }])
    } finally {
      setIsChatLoading(false)
    }
  }

  // Auto-scroll chat
  React.useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleAccept = async (id: number) => {
    if (processedDrafts.current.has(id)) return

    const draft = drafts.find((d) => d.id === id)
    if (!draft) return

    const targetChapterId = draft.chapter_id || activeChapterId
    if (draft.changes && typeof draft.changes === 'object' && Object.keys(draft.changes).length > 0 && !targetChapterId) {
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
        let currentChar = protagonist
        if (!currentChar) {
          try {
            currentChar = await createCharacter({
              project_id: projectId,
              name: "Protagonist",
              is_protagonist: true,
              stats: { Attributes: {}, Inventory: [], Skills: [] },
              formulas: {}
            })
            queryClient.invalidateQueries({ queryKey: ['characters'] })
          } catch (e) {
            console.error("Failed to auto-create protagonist:", e)
            alert("Cannot apply stat changes because no protagonist character exists and auto-creation failed.")
            processedDrafts.current.delete(id)
            return
          }
        }
        const updatedStats = { ...(currentChar.stats || {}) }
        let updatedFormulas = { ...(currentChar.formulas || {}) }
        let formulasChanged = false
        
        Object.entries(draft.changes).forEach(([statKey, changeVal]: [string, any]) => {
          if (!changeVal || typeof changeVal !== 'object') return

          // A. Handle numeric / scalar stat changes
          let targetVal = (changeVal.new !== undefined && changeVal.new !== null) ? changeVal.new : undefined
          if (targetVal === undefined && changeVal.delta !== undefined && changeVal.delta !== null) {
            let existingVal: any = undefined

            // Search for existing stat, case-insensitively
            for (const [, attributes] of Object.entries(updatedStats)) {
              if (typeof attributes === 'object' && attributes !== null && !Array.isArray(attributes)) {
                for (const attrKey of Object.keys(attributes)) {
                  if (attrKey.toLowerCase() === statKey.toLowerCase()) {
                    existingVal = (attributes as any)[attrKey]
                    break
                  }
                }
                if (existingVal !== undefined) break
              }
            }

            if (existingVal === undefined) {
              for (const rootKey of Object.keys(updatedStats)) {
                if (rootKey.toLowerCase() === statKey.toLowerCase()) {
                  existingVal = updatedStats[rootKey]
                  break
                }
              }
            }

            const numCurrent = typeof existingVal === 'number' ? existingVal : parseFloat(existingVal)
            const cleanDelta = String(changeVal.delta).replace(/\s+/g, '')
            const numDelta = typeof changeVal.delta === 'number' ? changeVal.delta : parseFloat(cleanDelta)
            if (!isNaN(numCurrent) && !isNaN(numDelta)) {
              targetVal = numCurrent + numDelta
            } else if (!isNaN(numDelta)) {
              targetVal = numDelta
            }
          }

          if (targetVal !== undefined && targetVal !== null && !isNaN(targetVal)) {
            let nestedFound = false
            for (const [category, attributes] of Object.entries(updatedStats)) {
              if (typeof attributes === 'object' && attributes !== null && !Array.isArray(attributes)) {
                const existingKey = Object.keys(attributes).find(k => k.toLowerCase() === statKey.toLowerCase())
                if (existingKey) {
                  // Prevent hallucination from overwriting an array with a scalar
                  if (!Array.isArray((attributes as any)[existingKey])) {
                    updatedStats[category] = { ...attributes, [existingKey]: targetVal }
                  } else {
                    console.warn(`Type safety: Refused to overwrite array ${existingKey} with scalar ${targetVal}`)
                  }
                  nestedFound = true
                  break
                }
              }
            }
            if (!nestedFound) {
              const existingRootKey = Object.keys(updatedStats).find(k => k.toLowerCase() === statKey.toLowerCase())
              const keyToUse = existingRootKey || statKey
              // If Attributes or Stats object exists, nest scalar stat under it for clean card organization
              if (typeof updatedStats.Attributes === 'object' && updatedStats.Attributes !== null && !Array.isArray(updatedStats.Attributes)) {
                updatedStats.Attributes = { ...updatedStats.Attributes, [keyToUse]: targetVal }
              } else if (typeof updatedStats.Stats === 'object' && updatedStats.Stats !== null && !Array.isArray(updatedStats.Stats)) {
                updatedStats.Stats = { ...updatedStats.Stats, [keyToUse]: targetVal }
              } else if (updatedStats[keyToUse] !== undefined && Array.isArray(updatedStats[keyToUse])) {
                console.warn(`Type safety: Refused to overwrite root array ${keyToUse} with scalar ${targetVal}`)
              } else {
                updatedStats[keyToUse] = targetVal
              }
            }
          }
          
          // B. Handle list additions (Skills, Inventory, Titles, etc.)
          if (changeVal.append !== undefined && changeVal.append !== null) {
            const cleanAppend = typeof changeVal.append === 'string' ? changeVal.append.trim() : String(changeVal.append).trim()
            if (cleanAppend) {
              let appended = false
              
              // Check root first
              const rootKey = Object.keys(updatedStats).find(k => k.toLowerCase() === statKey.toLowerCase())
              if (rootKey && Array.isArray(updatedStats[rootKey])) {
                if (!updatedStats[rootKey].some((item: any) => String(item).toLowerCase() === cleanAppend.toLowerCase())) {
                  updatedStats[rootKey] = [...updatedStats[rootKey], cleanAppend]
                }
                appended = true
              }
              
              // If not found at root, check nested categories
              if (!appended) {
                for (const [category, attributes] of Object.entries(updatedStats)) {
                  if (typeof attributes === 'object' && attributes !== null) {
                    const nestedKey = Object.keys(attributes).find(k => k.toLowerCase() === statKey.toLowerCase())
                    if (nestedKey && Array.isArray((attributes as any)[nestedKey])) {
                      const existing = (attributes as any)[nestedKey]
                      if (!existing.some((item: any) => String(item).toLowerCase() === cleanAppend.toLowerCase())) {
                        updatedStats[category] = {
                          ...attributes,
                          [nestedKey]: [...existing, cleanAppend]
                        }
                      }
                      appended = true
                      break
                    }
                  }
                }
              }
              
              // If completely new, safely initialize it as an array
              if (!appended) {
                const keyToUse = rootKey || statKey
                updatedStats[keyToUse] = [cleanAppend]
              }
            }
          }
          
          // C. Handle relative stat buffs / delta overrides on formulas
          if (changeVal.delta !== undefined && currentChar?.formulas) {
             const deltaStr = String(changeVal.delta)
             const formulaKey = Object.keys(updatedFormulas).find(k => k.toLowerCase() === statKey.toLowerCase())
             if (formulaKey && updatedFormulas[formulaKey]) {
                const numMatch = deltaStr.trim().match(/^([+-]\s*\d+(?:\.\d+)?)/)
                if (numMatch) {
                    updatedFormulas[formulaKey] = `(${updatedFormulas[formulaKey]}) ${numMatch[1]}`
                    formulasChanged = true
                }
             }
          }
        })

        const ledgerEntry = {
          character_id: currentChar.id,
          chapter_id: targetChapterId!,
          event_name: draft.title,
          changes: draft.changes || {},
          source_type: "AI Draft"
        }

        const payload: any = { stats: updatedStats }
        if (formulasChanged) {
            payload.formulas = updatedFormulas
        }

        await acceptActionDraft(currentChar.id, payload, ledgerEntry)
        
        queryClient.invalidateQueries({ queryKey: ['characters'] })
        queryClient.invalidateQueries({ queryKey: ['characters', projectId] })
        queryClient.invalidateQueries({ queryKey: ['ledger', currentChar.id] })
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
          <button
            onClick={() => { setActiveTab('chat'); onToggleCollapse(); }}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              activeTab === 'chat' 
                ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="AI Brainstorming Chat"
          >
            <Zap className="w-4 h-4" />
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
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-indigo-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Chat
          </button>
        </div>
      </div>

      <div className={`flex-1 ${activeTab === 'chat' ? 'flex flex-col p-3 overflow-hidden h-full' : 'overflow-y-auto p-4 space-y-4'}`}>
        {isCharsLoading ? (
            <div className="text-center py-8 text-slate-400"><Activity className="w-6 h-6 mx-auto animate-pulse" /></div>
        ) : activeTab === 'sheet' ? (
          !protagonist ? (
            <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 text-center space-y-3 shadow-sm transition-colors">
              <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Character Initialized</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Create a protagonist character to track RPG stats, status screens, and growth ledgers for this project.
                </p>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const nameToUse = newCharacterName.trim() || 'Protagonist'
                  setIsCreatingChar(true)
                  try {
                    await createCharacter({
                      project_id: projectId,
                      name: nameToUse,
                      is_protagonist: true,
                      stats: {
                        Attributes: { Strength: 10, Agility: 10, Vitality: 10, Intelligence: 10 },
                        Inventory: [],
                        Skills: []
                      },
                      formulas: { "Max HP": "Vitality * 10", "Max MP": "Intelligence * 10" }
                    })
                    setNewCharacterName('')
                    queryClient.invalidateQueries({ queryKey: ['characters'] })
                    queryClient.invalidateQueries({ queryKey: ['characters', projectId] })
                  } catch (err: any) {
                    alert(`Failed to create character: ${err?.message || err}`)
                  } finally {
                    setIsCreatingChar(false)
                  }
                }}
                className="space-y-2 pt-1"
              >
                <input
                  type="text"
                  placeholder="Character Name (e.g. Roland)"
                  value={newCharacterName}
                  onChange={(e) => setNewCharacterName(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={isCreatingChar}
                  className="w-full text-xs py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isCreatingChar ? 'Creating...' : 'Initialize Protagonist'}
                </button>
              </form>
            </div>
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
                                        queryClient.invalidateQueries({ queryKey: ['characters', projectId] })
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
                                            {computed !== null ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{computed}</span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 italic text-[9px]">—</span>
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
                              {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
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
        ) : activeTab === 'drafts' ? (
            <>
              {/* Pending AI Draft Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Action Drafts {drafts.length > 0 && `(${drafts.length})`}
                </span>
                <div className="flex items-center gap-1.5">
                  {drafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDrafts([])}
                      className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      title="Dismiss all drafts"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onScanChapter}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors text-xs font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Scan Chapter
                  </button>
                </div>
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
        ) : activeTab === 'chat' ? (
          <div className="flex flex-col h-full bg-white dark:bg-slate-950/70 border border-indigo-200 dark:border-indigo-500/20 rounded-xl overflow-hidden shadow-sm flex-1">
            <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={chatScrollRef}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`text-xs px-3 py-2 rounded-xl max-w-[90%] shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200 dark:border-slate-700'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-start">
                  <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl rounded-bl-sm border border-slate-200 dark:border-slate-700 text-xs text-slate-500 italic flex items-center gap-1 shadow-sm">
                    <span className="animate-pulse inline-block w-1 h-1 bg-slate-400 rounded-full"></span>
                    <span className="animate-pulse inline-block w-1 h-1 bg-slate-400 rounded-full" style={{ animationDelay: '200ms' }}></span>
                    <span className="animate-pulse inline-block w-1 h-1 bg-slate-400 rounded-full" style={{ animationDelay: '400ms' }}></span>
                  </div>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask your AI co-writer..."
                className="flex-1 bg-white dark:bg-slate-950 text-xs rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                disabled={isChatLoading}
              />
              <button 
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-md transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </aside>
  )
})
