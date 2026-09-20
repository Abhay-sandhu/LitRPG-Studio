import React from 'react'
import { BookOpen, Sparkles, CheckCircle2, Menu, Maximize } from 'lucide-react'

interface NavbarProps {
  wordCount: number
  chapterTitle: string
  isAnalyzing: boolean
  saveStatus: 'synced' | 'saving' | 'error'
  onChangeTitle?: (newTitle: string) => void
  onToggleZenMode: () => void
  onOpenNav: () => void
}

export const Navbar: React.FC<NavbarProps> = React.memo(({ wordCount, chapterTitle, isAnalyzing, saveStatus, onChangeTitle, onToggleZenMode, onOpenNav }) => {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between select-none z-10 transition-colors">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenNav}
          className="p-1.5 -ml-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          title="Open Main Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            ChronicleRPG
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 dark:border-sky-500/30">
              Studio
            </span>
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 min-w-0 flex-1 justify-center px-4">
        <input 
          type="text"
          value={chapterTitle}
          onChange={(e) => onChangeTitle?.(e.target.value)}
          readOnly={!onChangeTitle}
          placeholder="Untitled Chapter"
          className="font-medium text-slate-800 dark:text-slate-200 bg-transparent border-none outline-none truncate hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-sky-500 rounded px-2 py-0.5 text-center transition-colors flex-shrink w-full max-w-[200px] sm:max-w-[300px] md:max-w-md"
        />
        <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 shrink-0">
          {wordCount} words
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {isAnalyzing ? (
          <div className="flex items-center space-x-1.5 text-xs text-sky-600 dark:text-sky-400 animate-pulse bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ambient Engine Active...</span>
          </div>
        ) : saveStatus === 'saving' ? (
          <div className="flex items-center space-x-1.5 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-2.5 py-1 rounded-full animate-pulse">
            <span className="w-3.5 h-3.5 border-2 border-amber-600 dark:border-amber-500 border-t-transparent rounded-full animate-spin"></span>
            <span>Saving...</span>
          </div>
        ) : saveStatus === 'error' ? (
          <div className="flex items-center space-x-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-2.5 py-1 rounded-full">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 dark:bg-red-500 text-white flex items-center justify-center font-bold text-[8px]">!</span>
            <span>Save Failed</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-2.5 py-1 rounded-full transition-all duration-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced</span>
          </div>
        )}
        
        <button 
          onClick={onToggleZenMode}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          title="Enter Zen Mode (Focus Mode)"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
})
