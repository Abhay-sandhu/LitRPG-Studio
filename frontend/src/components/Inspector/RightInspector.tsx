import React, { useState, useRef } from 'react'
import {
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Check,
  X,
  Heart,
  Droplet,
  Zap,
} from 'lucide-react'

export interface InventoryItem {
  id: string
  name: string
  bonus: string
}

export interface CharacterData {
  name: string
  className: string
  level: number
  stats: {
    str: number
    agi: number
    int: number
    vit: number
  }
  inventory: InventoryItem[]
}

export interface DraftItem {
  id: number
  type: 'item' | 'stat'
  title: string
  desc: string
  context: string
  statKey?: 'str' | 'agi' | 'int' | 'vit'
  amount?: number
  item?: InventoryItem
}

interface RightInspectorProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onAcceptDraft?: (draft: DraftItem) => void
}

export const RightInspector: React.FC<RightInspectorProps> = React.memo(({
  collapsed,
  onToggleCollapse,
  onAcceptDraft,
}) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'drafts'>('sheet')
  const processedDrafts = useRef<Set<number>>(new Set())

  // Live Character State with reactive stats
  const [character, setCharacter] = useState<CharacterData>({
    name: 'Ethan Storm',
    className: 'Novice Spellsword',
    level: 1,
    stats: {
      str: 10,
      agi: 12,
      int: 8,
      vit: 10,
    },
    inventory: [
      { id: 'starter-blade', name: 'Worn Dagger', bonus: '+1 Atk' },
    ],
  })

  // Dynamic formula derivation
  const maxHp = character.stats.vit * 10
  const maxMana = character.stats.int * 10

  // Pending ambient drafts queue
  const [drafts, setDrafts] = useState<DraftItem[]>([
    {
      id: 1,
      type: 'item',
      title: 'Item Acquisition',
      desc: 'Found: Rusty Shortsword (+2 Attack, Common)',
      context: 'Scene: Upper Catacombs floor',
      item: { id: 'rusty-sword', name: 'Rusty Shortsword', bonus: '+2 Atk' },
    },
    {
      id: 2,
      type: 'stat',
      title: 'Stat Change',
      desc: 'Strength increased: 10 ➔ 12 (+2)',
      context: 'After lifting the iron gate',
      statKey: 'str',
      amount: 2,
    },
  ])

  // Dismiss: Remove from queue without modifying character
  const handleDismiss = (id: number) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }

  // Accept: Actually apply the stat change or inventory item to the character
  const handleAccept = (id: number) => {
    if (processedDrafts.current.has(id)) return
    processedDrafts.current.add(id)

    const draft = drafts.find((d) => d.id === id)
    if (!draft) return

    setCharacter((prev) => {
      const updated = { ...prev }

      // Apply stat changes if payload contains statKey and a valid number
      if (draft.statKey && draft.amount !== undefined) {
        updated.stats = {
          ...prev.stats,
          [draft.statKey]: prev.stats[draft.statKey] + draft.amount,
        }
      }

      // Add item to inventory if payload contains an item
      if (draft.item) {
        updated.inventory = [...prev.inventory, draft.item]
      }

      return updated
    })

    // Remove the accepted draft from the queue
    setDrafts((prev) => prev.filter((d) => d.id !== id))

    // Notify parent if callback provided
    if (onAcceptDraft) {
      onAcceptDraft(draft)
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
            title="Open Character Sheet"
          >
            <User className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setActiveTab('drafts'); onToggleCollapse(); }}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              activeTab === 'drafts' 
                ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Open AI Drafts"
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
      {/* Header & Tabs */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded transition-colors mr-2"
          title="Collapse Inspector"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex bg-slate-200/50 dark:bg-slate-950/70 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800/80 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'sheet'
                ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-sky-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Character Sheet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'drafts'
                ? 'bg-white dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-amber-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>AI Drafts</span>
            {drafts.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center border border-amber-200 dark:border-amber-500/50">
                {drafts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'sheet' ? (
          <>
            {/* Identity Card */}
            <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 space-y-2 shadow-sm dark:shadow-none transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{character.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Class: {character.className}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/50 px-2 py-0.5 rounded-full">
                    Level {character.level}
                  </span>
                </div>
              </div>

              {/* Resource Bars */}
              <div className="space-y-1.5 pt-2">
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-rose-600 dark:text-rose-400 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> HP
                    </span>
                    <span>{maxHp} / {maxHp}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-medium text-sky-600 dark:text-sky-400 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Droplet className="w-3 h-3" /> Mana
                    </span>
                    <span>{maxMana} / {maxMana}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full w-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Attributes & Formula Breakdown */}
            <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-sm dark:shadow-none transition-colors">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Primary Attributes</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400">STR (Strength)</span>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">{character.stats.str}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400">AGI (Agility)</span>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">{character.stats.agi}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400">INT (Intelligence)</span>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">{character.stats.int}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400">VIT (Vitality)</span>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">{character.stats.vit}</div>
                </div>
              </div>

              <div className="pt-1 text-[11px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-800/50">
                Formula: HP = VIT * 10 ({maxHp}) | Mana = INT * 10 ({maxMana})
              </div>
            </div>

            {/* Inventory / Gear Section */}
            <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 space-y-2 shadow-sm dark:shadow-none transition-colors">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Inventory ({character.inventory.length})
                </h4>
              </div>
              <div className="space-y-1.5">
                {character.inventory.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
                  >
                    <span className="truncate min-w-0 mr-2">{item.name}</span>
                    <span className="text-[10px] text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-300 dark:border-sky-800/40 shrink-0">
                      {item.bonus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Pending AI Draft Cards */}
            <div className="space-y-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Ambient Findings</span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400">Needs Review</span>
              </div>

              {drafts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 space-y-2">
                  <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs">No pending stat changes detected.</p>
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
