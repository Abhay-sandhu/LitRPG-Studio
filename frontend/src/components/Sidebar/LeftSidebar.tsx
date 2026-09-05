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

export interface ChapterItem {
  id: string
  title: string
  words: number
}

interface LeftSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  chapters: ChapterItem[]
  activeChapterId: string
  onSelectChapter: (id: string) => void
}

export const LeftSidebar: React.FC<LeftSidebarProps> = React.memo(({
  collapsed,
  onToggleCollapse,
  chapters,
  activeChapterId,
  onSelectChapter,
}) => {
  const [activeTab, setActiveTab] = useState<'chapters' | 'bible'>('chapters')
  const [searchQuery, setSearchQuery] = useState('')

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
      <aside className="w-12 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 flex flex-col items-center py-3 select-none transition-colors">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          title="Expand Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-4 flex flex-col gap-2 w-full px-2">
          <button
            onClick={() => { setActiveTab('chapters'); onToggleCollapse(); }}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              activeTab === 'chapters' 
                ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Open Chapters"
          >
            <FolderClosed className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setActiveTab('bible'); onToggleCollapse(); }}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              activeTab === 'bible' 
                ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Open Story Bible"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 flex flex-col select-none transition-colors text-sm">
      {/* Header & Tabs */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
        <div className="flex bg-slate-200/50 dark:bg-slate-950/70 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800/80 w-full mr-2">
          <button
            type="button"
            onClick={() => setActiveTab('chapters')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'chapters'
                ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-sky-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Chapters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bible')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'bible'
                ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-sky-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Story Bible
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'chapters' ? 'Filter chapters...' : 'Search lore & stats...'}
            className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-md pl-8 pr-2 py-1 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
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
                className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                title="Add Chapter"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {filteredChapters.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => onSelectChapter(ch.id)}
                className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                  activeChapterId === ch.id
                    ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-2 truncate min-w-0">
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${activeChapterId === ch.id ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate text-xs">{ch.title}</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400 shrink-0">
                  {ch.words}w
                </span>
              </button>
            ))}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Lore Index</span>
              <button
                type="button"
                className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                title="Add Lore Entry"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {filteredEntities.map((item, idx) => {
              const Icon = item.icon
              return (
                <button
                  key={`${item.id}-${idx}`}
                  type="button"
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate min-w-0">
                    <Icon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="truncate text-xs">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-transparent shrink-0 ml-2">
                    {item.rank}
                  </span>
                </button>
              )
            })}
          </>
        )}
      </div>
    </aside>
  )
})
