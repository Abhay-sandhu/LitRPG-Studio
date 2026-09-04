import { useState, useEffect } from 'react'
import { Navbar } from './components/Header/Navbar'
import { LeftSidebar } from './components/Sidebar/LeftSidebar'
import { TipTapEditor } from './components/Editor/TipTapEditor'
import { RightInspector } from './components/Inspector/RightInspector'
import { GlobalNav } from './components/Navigation/GlobalNav'
import type { ViewType } from './components/Navigation/GlobalNav'
import { ProjectsView, BibleView, AnalyticsView, SettingsView } from './components/Views/PlaceholderViews'
import './App.css'

export default function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isAnalyzing] = useState(false)

  // Manage Global Navigation
  const [navOpen, setNavOpen] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>('editor')

  // Manage Chapters
  const [chapters] = useState([
    { id: 'ch1', title: 'Chapter 1: The Crypt of the Fallen King', words: 1420 },
    { id: 'ch2', title: 'Chapter 2: The First Catalyst', words: 2150 },
    { id: 'ch3', title: 'Chapter 3: Embers in the Gloom', words: 890 },
  ])
  const [activeChapterId, setActiveChapterId] = useState('ch1')

  const activeChapterTitle = chapters.find(c => c.id === activeChapterId)?.title || 'Untitled Chapter'

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

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      <GlobalNav
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        currentView={currentView}
        onChangeView={setCurrentView}
      />

      {/* Top Navbar */}
      <Navbar
        wordCount={wordCount}
        chapterTitle={currentView === 'editor' ? activeChapterTitle : 'Global Dashboard'}
        isAnalyzing={isAnalyzing}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenNav={() => setNavOpen(true)}
      />

      {/* Main Workspace Area based on selected View */}
      {currentView === 'editor' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Chapters & Local Story Bible */}
          <LeftSidebar
            collapsed={leftCollapsed}
            onToggleCollapse={() => setLeftCollapsed(!leftCollapsed)}
            chapters={chapters}
            activeChapterId={activeChapterId}
            onSelectChapter={setActiveChapterId}
          />

          {/* Center Canvas: TipTap Rich Text Editor */}
          <TipTapEditor
            onWordCountChange={setWordCount}
          />

          {/* Right Inspector: Live Character Sheet & AI Draft Queue */}
          <RightInspector
            collapsed={rightCollapsed}
            onToggleCollapse={() => setRightCollapsed(!rightCollapsed)}
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
