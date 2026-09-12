import { useState, useEffect, useCallback, useRef } from 'react'
import { Navbar } from './components/Header/Navbar'
import { LeftSidebar } from './components/Sidebar/LeftSidebar'
import { TipTapEditor } from './components/Editor/TipTapEditor'
import { RightInspector } from './components/Inspector/RightInspector'
import { GlobalNav } from './components/Navigation/GlobalNav'
import type { ViewType } from './components/Navigation/GlobalNav'
import { ProjectsView, BibleView, AnalyticsView, SettingsView } from './components/Views/PlaceholderViews'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchChapters, updateChapter } from './api'
import './App.css'

export default function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isAnalyzing] = useState(false)

  // Manage Global Navigation
  const [navOpen, setNavOpen] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>('editor')

  const projectId = 1 // Hardcoded for now
  
  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', projectId],
    queryFn: () => fetchChapters(projectId)
  })

  const [activeChapterId, setActiveChapterId] = useState<number | null>(null)

  // Default to first chapter if none is active
  useEffect(() => {
    if (!activeChapterId && chapters.length > 0) {
      setActiveChapterId(chapters[0].id)
    }
  }, [chapters, activeChapterId])

  const activeChapter = chapters.find((c: any) => c.id === activeChapterId)
  const activeChapterTitle = activeChapter?.title || 'Untitled Chapter'

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  })

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  const queryClient = useQueryClient()
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTitleChange = useCallback((newTitle: string) => {
    if (!activeChapterId) return
    
    // Optimistic UI update for instant typing feel
    queryClient.setQueryData(['chapters', projectId], (old: any) => 
      old?.map((c: any) => c.id === activeChapterId ? { ...c, title: newTitle } : c)
    )
    
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
    titleTimeoutRef.current = setTimeout(() => {
      // Background save without invalidating to save an unnecessary network round-trip,
      // as the optimistic UI update already contains the true state.
      updateChapter(activeChapterId, { title: newTitle })
    }, 500)
  }, [activeChapterId, queryClient, projectId])

  // Stable callbacks for memoized child components to prevent re-renders on keystrokes
  const toggleLeftCollapse = useCallback(() => setLeftCollapsed(p => !p), [])
  const toggleRightCollapse = useCallback(() => setRightCollapsed(p => !p), [])
  const toggleTheme = useCallback(() => setIsDarkMode(p => !p), [])
  const openNav = useCallback(() => setNavOpen(true), [])
  const closeNav = useCallback(() => setNavOpen(false), [])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      <GlobalNav
        isOpen={navOpen}
        onClose={closeNav}
        currentView={currentView}
        onChangeView={setCurrentView}
      />

      {/* Top Navbar */}
      <Navbar
        wordCount={wordCount}
        chapterTitle={currentView === 'editor' ? activeChapterTitle : 'Global Dashboard'}
        onChangeTitle={currentView === 'editor' ? handleTitleChange : undefined}
        isAnalyzing={isAnalyzing}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onOpenNav={openNav}
      />

      {/* Main Workspace Area based on selected View */}
      {currentView === 'editor' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Chapters & Local Story Bible */}
          <LeftSidebar
            collapsed={leftCollapsed}
            onToggleCollapse={toggleLeftCollapse}
            chapters={chapters}
            activeChapterId={activeChapterId ?? undefined}
            onSelectChapter={setActiveChapterId}
          />

          {/* Center Canvas: TipTap Rich Text Editor */}
          <TipTapEditor
            key={activeChapterId ?? 'empty'}
            chapterId={activeChapterId ?? undefined}
            initialContent={activeChapter?.content || ''}
            onWordCountChange={setWordCount}
          />

          {/* Right Inspector: Live Character Sheet & AI Draft Queue */}
          <RightInspector
            collapsed={rightCollapsed}
            onToggleCollapse={toggleRightCollapse}
          />
        </div>
      )}

      {currentView === 'projects' && <ProjectsView />}
      {currentView === 'bible' && <BibleView />}
      {currentView === 'analytics' && <AnalyticsView />}
      {currentView === 'settings' && <SettingsView />}
    </div>
  )
}
