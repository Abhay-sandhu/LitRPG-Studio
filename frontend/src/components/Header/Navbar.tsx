import React from 'react'
import { BookOpen, Sparkles, CheckCircle2 } from 'lucide-react'

interface NavbarProps {
  wordCount: number
  chapterTitle: string
  isAnalyzing: boolean
}

export const Navbar: React.FC<NavbarProps> = ({ wordCount, chapterTitle, isAnalyzing }) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between select-none z-10">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            ChronicleRPG
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
              Studio
            </span>
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 text-sm text-slate-400">
        <span className="font-medium text-slate-200">{chapterTitle}</span>
        <span className="text-slate-600">•</span>
        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">
          {wordCount} words
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {isAnalyzing ? (
          <div className="flex items-center space-x-1.5 text-xs text-sky-400 animate-pulse bg-sky-950/50 border border-sky-800/60 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ambient Engine Active...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced</span>
          </div>
        )}
      </div>
    </header>
  )
}
