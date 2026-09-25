import { useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navbar } from './components/Header/Navbar'
import { LeftSidebar } from './components/Sidebar/LeftSidebar'
import { TipTapEditor } from './components/Editor/TipTapEditor'
import { RightInspector } from './components/Inspector/RightInspector'
import { GlobalNav } from './components/Navigation/GlobalNav'
import { SettingsView } from './components/Views/SettingsView'
import { ProjectsView } from './components/Views/ProjectsView'
import { AnalyticsView } from './components/Views/AnalyticsView'
import { BibleView } from './components/Views/BibleView'
import { ConstellationView } from './components/Views/ConstellationView'
import { fetchChapters, fetchProjects } from './api'
import { useStore } from './store'
import { useStoryAI } from './hooks/useStoryAI'
import './App.css'

export default function App() {
  const {
    currentView, setCurrentView,
    navOpen, setNavOpen,
    rightCollapsed, setRightCollapsed,
    theme, setTheme,
    projectId, setProjectId,
    activeChapterId, setActiveChapterId,
    setWordCount,
    zenMode, setZenMode,
    setSaveStatus
  } = useStore()

  useEffect(() => {
    if (projectId) {
      localStorage.setItem('app_project_id', projectId.toString())
    }
  }, [projectId])

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects
  })

  // Ensure active projectId exists among available projects
  useEffect(() => {
    if (allProjects.length > 0) {
      const exists = allProjects.some((p: any) => p.id === projectId)
      if (!exists) {
        setProjectId(allProjects[0].id)
      }
    }
  }, [allProjects, projectId])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
    localStorage.setItem('app_theme', theme)
  }, [theme])
  
  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', projectId],
    queryFn: () => fetchChapters(projectId)
  })

  // Fallback to first chapter if active chapter is deleted or none is active
  useEffect(() => {
    if (chapters.length > 0) {
      const exists = chapters.some((c: any) => c.id === activeChapterId)
      if (!exists) {
        setActiveChapterId(chapters[0].id)
      }
    } else if (activeChapterId !== null) {
      setActiveChapterId(null)
    }
  }, [chapters, activeChapterId])

  const activeChapter = chapters.find((c: any) => c.id === activeChapterId)

  const { drafts, setDrafts, handleContentChangeForAI, handleScanChapter } = useStoryAI()

  const liveContentRef = useRef<string>('')
  
  // Sync word count and live content buffer on chapter mount/change
  useEffect(() => {
    if (activeChapter) {
      setWordCount(activeChapter.words ?? 0)
      liveContentRef.current = activeChapter.content || ''
    } else {
      liveContentRef.current = ''
    }
  }, [activeChapterId, activeChapter?.content])

  const toggleRightCollapse = useCallback(() => setRightCollapsed(p => !p), [setRightCollapsed])
  const openNav = useCallback(() => setNavOpen(true), [setNavOpen])
  const closeNav = useCallback(() => setNavOpen(false), [setNavOpen])

  const onScanChapterClick = useCallback(() => {
    handleScanChapter(activeChapter?.content)
  }, [handleScanChapter, activeChapter])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zenMode) {
        setZenMode(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zenMode])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      <GlobalNav
        isOpen={navOpen}
        onClose={closeNav}
        currentView={currentView}
        onChangeView={setCurrentView}
      />

      {/* Top Navbar */}
      {!zenMode && (
        <Navbar
          onOpenNav={openNav}
        />
      )}

      {/* Main Workspace Area based on selected View */}
      <div className={`flex-1 flex overflow-hidden ${currentView === 'editor' ? '' : 'hidden'}`}>
        {/* Left Sidebar: Chapters & Local Story Bible */}
        {!zenMode && (
          <LeftSidebar
            onNavigateToBible={() => setCurrentView('bible')}
          />
        )}

        {/* Center Canvas: TipTap Rich Text Editor */}
        <div className="flex-1 relative flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
          {zenMode && (
            <button 
              onClick={() => setZenMode(false)}
              className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100 focus:opacity-100 backdrop-blur"
              title="Exit Zen Mode (Esc)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
            </button>
          )}
          <TipTapEditor
            key={activeChapterId ?? 'empty'}
            chapterId={activeChapterId ?? undefined}
            projectId={projectId}
            initialContent={activeChapter?.content || ''}
            onWordCountChange={setWordCount}
            onContentChange={handleContentChangeForAI}
            onSaveStatusChange={setSaveStatus}
          />
        </div>

        {/* Right Inspector: Live Character Sheet & AI Draft Queue */}
        {!zenMode && (
          <RightInspector
            collapsed={rightCollapsed}
            onToggleCollapse={toggleRightCollapse}
            projectId={projectId}
            drafts={drafts}
            setDrafts={setDrafts}
            onScanChapter={onScanChapterClick}
            activeChapterId={activeChapterId ?? undefined}
          />
        )}
      </div>

      {currentView === 'projects' && (
        <ProjectsView 
          activeProjectId={projectId} 
          onSelectProject={setProjectId}
          onOpenProject={(id) => {
            setProjectId(id)
            setCurrentView('editor')
          }}
        />
      )}
      {currentView === 'bible' && <BibleView projectId={projectId} />}
      {currentView === 'constellation' && <ConstellationView projectId={projectId} />}
      {currentView === 'analytics' && <AnalyticsView projectId={projectId} />}
      {currentView === 'settings' && <SettingsView currentTheme={theme} onChangeTheme={setTheme} />}
    </div>
  )
}



