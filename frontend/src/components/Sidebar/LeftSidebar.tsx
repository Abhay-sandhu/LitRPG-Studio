import React, { useState } from 'react'
import {
  FileText,
  FolderClosed,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Sword,
  Users,
} from 'lucide-react'

interface LeftSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  collapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'chapters' | 'bible'>('chapters')
  const [searchQuery, setSearchQuery] = useState('')

  const chapters = [
    { id: 'ch1', title: 'Chapter 1: The Crypt of the Fallen King', words: 1420, active: true },
    { id: 'ch2', title: 'Chapter 2: The First Catalyst', words: 2150, active: false },
    { id: 'ch3', title: 'Chapter 3: Embers in the Gloom', words: 890, active: false },
  ]

  const bibleEntities = [
    { id: 'entity-ethan', name: 'Ethan Storm', type: 'Character', icon: Users, rank: 'Lv. 1 Novice' },
    { id: 'entity-shortsword', name: 'Rusty Shortsword', type: 'Item', icon: Sword, rank: 'Common' },
    { id: 'entity-spark', name: 'Mana Spark', type: 'Skill', icon: Zap, rank: 'Tier 1' },
    { id: 'entity-catacombs', name: 'Sunken Catacombs', type: 'Location', icon: Shield, rank: 'Floor 1' },
  ]

  const filteredChapters = chapters.filter((ch) =>
    ch.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredEntities = bibleEntities.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (collapsed) {
    return (
      <aside className="w-12 border-r border-slate-800/80 bg-slate-900/60 flex flex-col items-center py-3 select-none transition-all">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Expand Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-4 flex flex-col gap-3 text-slate-500">
          <FolderClosed className="w-4 h-4" />
          <FileText className="w-4 h-4 text-sky-400" />
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-900/60 flex flex-col select-none transition-all text-sm">
      {/* Header & Tabs */}
      <div className="p-3 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex bg-slate-950/70 p-0.5 rounded-lg border border-slate-800/80 w-full mr-2">
          <button
            type="button"
            onClick={() => setActiveTab('chapters')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'chapters'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chapters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bible')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'bible'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Story Bible
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-800/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'chapters' ? 'Filter chapters...' : 'Search lore & stats...'}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-md pl-8 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
          />
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeTab === 'chapters' ? (
          <>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Volume 1</span>
              <button
                type="button"
                className="hover:text-sky-400 transition-colors"
                title="Add Chapter"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {filteredChapters.map((ch) => (
              <div
                key={ch.id}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                  ch.active
                    ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${ch.active ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span className="truncate text-xs">{ch.title}</span>
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-slate-400 shrink-0">
                  {ch.words}w
                </span>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Lore Index</span>
              <button
                type="button"
                className="hover:text-sky-400 transition-colors"
                title="Add Lore Entry"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {filteredEntities.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-300 hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Icon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate text-xs">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded">
                    {item.rank}
                  </span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </aside>
  )
}
