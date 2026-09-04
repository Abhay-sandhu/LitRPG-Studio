import React from 'react'
import { BookOpen, Sparkles, CheckCircle2, Moon, Sun } from 'lucide-react'

interface NavbarProps {
  wordCount: number
  chapterTitle: string
  isAnalyzing: boolean
  isDarkMode: boolean
  onToggleTheme: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ wordCount, chapterTitle, isAnalyzing, isDarkMode, onToggleTheme }) => {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between select-none z-10 transition-colors">
      <div className="flex items-center space-x-3">
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

      <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-800 dark:text-slate-200">{chapterTitle}</span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
          {wordCount} words
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {isAnalyzing ? (
          <div className="flex items-center space-x-1.5 text-xs text-sky-600 dark:text-sky-400 animate-pulse bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ambient Engine Active...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced</span>
          </div>
        )}
        
        <button 
          onClick={onToggleTheme}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          title="Toggle light/dark theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  )
}
