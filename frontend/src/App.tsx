import { useState } from 'react'
import { Navbar } from './components/Header/Navbar'
import { LeftSidebar } from './components/Sidebar/LeftSidebar'
import { TipTapEditor } from './components/Editor/TipTapEditor'
import { RightInspector } from './components/Inspector/RightInspector'
import './App.css'

export default function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [chapterTitle] = useState('Chapter 1: The Crypt of the Fallen King')
  const [isAnalyzing] = useState(false)

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Navbar
        wordCount={wordCount}
        chapterTitle={chapterTitle}
        isAnalyzing={isAnalyzing}
      />

      {/* Main Workspace: Three-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Chapters & Story Bible */}
        <LeftSidebar
          collapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed(!leftCollapsed)}
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
