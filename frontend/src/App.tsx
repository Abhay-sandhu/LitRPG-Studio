import { useState, useEffect } from 'react'
import { Navbar } from './components/Header/Navbar'
import { LeftSidebar } from './components/Sidebar/LeftSidebar'
import { TipTapEditor } from './components/Editor/TipTapEditor'
import { RightInspector } from './components/Inspector/RightInspector'
import './App.css'

export default function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isAnalyzing] = useState(false)

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
    return window.matchMedia('(prefers-color-scheme: dark)').matches || true
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
      {/* Top Navbar */}
      <Navbar
        wordCount={wordCount}
        chapterTitle={activeChapterTitle}
        isAnalyzing={isAnalyzing}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main Workspace: Three-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Chapters & Story Bible */}
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
    </div>
  )
}

