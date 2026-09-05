import React from 'react'
import {
  X,
  PenTool,
  Library,
  BookOpen,
  LineChart,
  Settings,
} from 'lucide-react'

export type ViewType = 'editor' | 'projects' | 'bible' | 'analytics' | 'settings'

interface GlobalNavProps {
  isOpen: boolean
  onClose: () => void
  currentView: ViewType
  onChangeView: (view: ViewType) => void
}

export const GlobalNav: React.FC<GlobalNavProps> = ({
  isOpen,
  onClose,
  currentView,
  onChangeView,
}) => {
  const navItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: 'editor', label: 'Writing Editor', icon: PenTool },
    { id: 'projects', label: 'My Projects', icon: Library },
    { id: 'bible', label: 'Global Story Bible', icon: BookOpen },
    { id: 'analytics', label: 'Analytics & Goals', icon: LineChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div
        inert={!isOpen ? "" : undefined}
        className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <span className="font-bold text-slate-800 dark:text-slate-200">Main Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id)
                  onClose()
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-xs">
              AU
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-200">Author User</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Pro Plan</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
