import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navbar } from './components/Header/Navbar'
import { LeftSidebar } from './components/Sidebar/LeftSidebar'
import { TipTapEditor } from './components/Editor/TipTapEditor'
import { RightInspector } from './components/Inspector/RightInspector'
import type { DraftItem } from './components/Inspector/RightInspector'
import { GlobalNav } from './components/Navigation/GlobalNav'
import type { ViewType } from './components/Navigation/GlobalNav'
import { ProjectsView, BibleView, AnalyticsView, SettingsView } from './components/Views/PlaceholderViews'
import { fetchChapters, updateChapter, triggerTacticalAI, triggerAmbientAI } from './api'
import './App.css'

export default function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Manage Global Navigation
  const [navOpen, setNavOpen] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>('editor')

  const projectId = 1 // Hardcoded for now
  
  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', projectId],
    queryFn: () => fetchChapters(projectId)
  })

  const [activeChapterId, setActiveChapterId] = useState<number | null>(null)

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
  const activeChapterTitle = activeChapter?.title || 'Untitled Chapter'

  // Sync word count on chapter mount/change
  useEffect(() => {
    if (activeChapter) {
      setWordCount(activeChapter.words ?? 0)
    }
  }, [activeChapterId, activeChapter?.words])

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

  // AI Pipeline State
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleContentChangeForAI = useCallback((content: string) => {
    // Look for system boxes
    if (!content.includes('<blockquote')) return

    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    
    // Wait 7 seconds after typing stops before hitting Tactical AI
    aiDebounceRef.current = setTimeout(async () => {
      try {
        setIsAnalyzing(true)
        const response = await triggerTacticalAI({
          system_box_text: content,
          surrounding_text: content,
          project_id: projectId
        })
        if (response.drafts?.length > 0) {
          const stampedDrafts = response.drafts.map((d: any, idx: number) => ({
            ...d,
            id: Date.now() + idx
          }))
          setDrafts(prev => {
            const existingTitles = new Set(prev.map(d => d.title))
            const uniqueNew = stampedDrafts.filter((d: any) => !existingTitles.has(d.title))
            return [...prev, ...uniqueNew]
          })
        }
      } catch (err) {
        console.error("Tactical AI failed:", err)
      } finally {
        setIsAnalyzing(false)
      }
    }, 7000)
  }, [projectId])

  const handleScanChapter = useCallback(async () => {
    if (!activeChapter) return
    try {
      setIsAnalyzing(true)
      const response = await triggerAmbientAI({
        narrative_text: activeChapter.content,
        project_id: projectId
      })
      if (response.drafts?.length > 0) {
        const stampedDrafts = response.drafts.map((d: any, idx: number) => ({
          ...d,
          id: Date.now() + idx
        }))
        setDrafts(prev => {
          const existingTitles = new Set(prev.map(d => d.title))
          const uniqueNew = stampedDrafts.filter((d: any) => !existingTitles.has(d.title))
          return [...prev, ...uniqueNew]
        })
        setRightCollapsed(false) // Open right sidebar if there's results
      }
    } catch (err) {
      console.error("Ambient AI failed:", err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [activeChapter, projectId])

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
            onContentChange={handleContentChangeForAI}
          />

          {/* Right Inspector: Live Character Sheet & AI Draft Queue */}
          <RightInspector
            collapsed={rightCollapsed}
            onToggleCollapse={toggleRightCollapse}
            drafts={drafts}
            setDrafts={setDrafts}
            onScanChapter={handleScanChapter}
            activeChapterId={activeChapterId ?? undefined}
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
