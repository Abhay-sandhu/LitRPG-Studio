import React, { useState } from 'react'
import {
  FileText,
  FolderClosed,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Sword,
  Users,
  Trash2,
  Download,
  Upload,
} from 'lucide-react'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLore, createChapter, deleteChapter, fetchChapters } from '../../api'
import { useStore } from '../../store'

export interface ChapterItem {
  id: number
  title: string
  words: number
  content?: string
}

interface LeftSidebarProps {
  onNavigateToBible?: () => void
}

const countWords = (htmlText?: string): number => {
  if (!htmlText) return 0
  const plainText = htmlText.replace(/<[^>]*>/g, ' ').trim()
  return plainText ? plainText.split(/\s+/).filter(Boolean).length : 0
}

const ICON_MAP: Record<string, React.FC<any>> = {
  Users: Users,
  Sword: Sword,
  Zap: Zap,
  Shield: Shield
}

export const LeftSidebar: React.FC<LeftSidebarProps> = React.memo(({
  onNavigateToBible,
}) => {
  const { projectId, leftCollapsed: collapsed, setLeftCollapsed, activeChapterId, setActiveChapterId, } = useStore()
  
  const queryClient = useQueryClient()
  
  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', projectId],
    queryFn: () => fetchChapters(projectId)
  })

  const onToggleCollapse = () => setLeftCollapsed(p => !p)
  const onSelectChapter = setActiveChapterId
  const [activeTab, setActiveTab] = useState<'chapters' | 'bible'>('chapters')
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { data: bibleEntities = [] } = useQuery({
    queryKey: ['lore', projectId],
    queryFn: () => fetchLore(projectId)
  })
  
  const createChapterMutation = useMutation({
    mutationFn: (data?: {title?: string, content?: string, order?: number}) => {
      const maxOrder = chapters.reduce((max, ch: any) => Math.max(max, ch.order || 0), 0)
      return createChapter({ 
        project_id: projectId, 
        title: data?.title || 'Untitled Chapter', 
        content: data?.content || '',
        words: countWords(data?.content), 
        order: data?.order ?? (maxOrder + 1)
      })
    },
    onSuccess: (newChapter) => {
      queryClient.setQueryData(['chapters', projectId], (old: any) => old ? [...old, newChapter] : [newChapter])
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      onSelectChapter(newChapter.id)
    },
    onError: (err: any) => {
      alert(`Failed to create chapter: ${err?.message || err}`)
    }
  })

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      // Split by 'Chapter X', 'Chapter One', 'Chapter IV', 'Act X', 'Prologue', 'Epilogue', etc.
      let rawChunks = text.split(/(?:^|\n)(?=#?\s*(?:Chapter|Act|Episode)\s+(?:\d+|[IVXLCDM]+|[A-Za-z]+)|#?\s*Prologue|#?\s*Epilogue)/i)
      let chunks = rawChunks.filter(c => c.trim().length > 0)
      
      // Fallback: If no chapter headings detected, import the entire file as a single chapter
      if (chunks.length === 0 && text.trim().length > 0) {
        const fallbackTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ') || 'Imported Manuscript'
        chunks = [`# ${fallbackTitle}\n` + text]
      }
      
      if (chunks.length === 0) {
        alert("The uploaded manuscript file is empty.")
        return
      }

      let firstCreatedChapterId: number | null = null
      const createdChapters: any[] = []
      const baseOrder = chapters.reduce((max, ch: any) => Math.max(max, ch.order || 0), 0)

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const lines = chunk.split('\n')
        const titleLine = lines[0].replace(/#/g, '').trim()
        const content = lines.slice(1).join('\n').trim()
        
        // Convert basic newlines to paragraphs for TipTap, escaping special characters
        const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const htmlContent = content.split('\n\n').map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')

        const created = await createChapter({
          project_id: projectId,
          title: titleLine || `Chapter ${baseOrder + i + 1}`,
          content: htmlContent,
          words: countWords(htmlContent),
          order: baseOrder + i + 1
        })
        if (created) {
          createdChapters.push(created)
          if (i === 0) {
            firstCreatedChapterId = created.id
          }
        }
      }

      // Synchronously update TanStack Query cache so App.tsx does not fall back to old chapter
      queryClient.setQueryData(['chapters', projectId], (old: any) => [...(old || []), ...createdChapters])
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      if (firstCreatedChapterId) {
        onSelectChapter(firstCreatedChapterId)
      }
      alert(`Successfully imported ${chunks.length} chapter${chunks.length > 1 ? 's' : ''}!`)
    } catch (err) {
      console.error(err)
      alert("Error importing manuscript")
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleExport = () => {
    if (chapters.length === 0) {
      alert("No chapters to export.")
      return
    }

    const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    let combinedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Manuscript Export</title>
<style>
  body { font-family: serif; max-width: 800px; margin: 0 auto; padding: 2em; line-height: 1.6; }
  h1 { text-align: center; margin-top: 2em; margin-bottom: 1em; page-break-before: always; }
  p { text-indent: 1.5em; margin-top: 0; margin-bottom: 0; }
  blockquote, .system-blue-box {
    border-left: 4px solid #0284c7;
    background: #f0f9ff;
    border-radius: 6px;
    padding: 1em 1.25em;
    margin: 1.5em 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: #0369a1;
  }
  blockquote p, .system-blue-box p { text-indent: 0; margin-bottom: 0.5em; }
  blockquote p:last-child, .system-blue-box p:last-child { margin-bottom: 0; }
</style>
</head>
<body>
`
    chapters.forEach(ch => {
      combinedHtml += `\n<h1>${escapeHtml(ch.title)}</h1>\n`
      if (ch.content) {
        combinedHtml += ch.content
      } else {
        combinedHtml += `<p><em>(Empty chapter)</em></p>`
      }
    })

    combinedHtml += `\n</body>\n</html>`

    const blob = new Blob([combinedHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Manuscript_Export.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
  }

  const deleteChapterMutation = useMutation({
    mutationFn: (chapterId: number) => deleteChapter(chapterId),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(['chapters', projectId], (old: any) =>
        old ? old.filter((ch: any) => ch.id !== deletedId) : []
      )
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      if (activeChapterId === deletedId) {
        const remaining = chapters.filter(c => c.id !== deletedId)
        if (remaining.length > 0) {
          onSelectChapter(remaining[0].id)
        } else {
          onSelectChapter(0)
        }
      }
    },
    onError: (err: any) => {
      alert(`Failed to delete chapter: ${err?.message || err}`)
    }
  })

  const filteredChapters = chapters.filter((ch) =>
    ch.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredEntities = bibleEntities.filter((item: any) =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.category || item.type)?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (collapsed) {
    return (
      <aside className="w-12 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 flex flex-col items-center py-3 select-none transition-colors">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          title="Expand Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-4 flex flex-col gap-2 w-full px-2">
          <button
            onClick={() => { setActiveTab('chapters'); onToggleCollapse(); }}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              activeTab === 'chapters' 
                ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Open Chapters"
          >
            <FolderClosed className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setActiveTab('bible'); onToggleCollapse(); }}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              activeTab === 'bible' 
                ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Open Story Bible"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 flex flex-col select-none transition-colors text-sm">
      {/* Header & Tabs */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
        <div className="flex bg-slate-200/50 dark:bg-slate-950/70 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800/80 w-full mr-2">
          <button
            type="button"
            onClick={() => setActiveTab('chapters')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'chapters'
                ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-sky-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Chapters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bible')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'bible'
                ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-sky-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Story Bible
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'chapters' ? 'Filter chapters...' : 'Search lore & stats...'}
            className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-md pl-8 pr-2 py-1 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
          />
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeTab === 'chapters' ? (
            <>
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span>Volume 1</span>
                <div className="flex items-center gap-1">
                  <input 
                    type="file" 
                    accept=".txt,.md" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleImport} 
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className={`hover:text-sky-600 dark:hover:text-sky-400 transition-colors ${isImporting ? 'opacity-50' : ''}`}
                    title="Import Manuscript (.txt, .md)"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => createChapterMutation.mutate({})}
                    className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors ml-1"
                    title="Add Chapter"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            {filteredChapters.map((ch) => (
              <div
                key={ch.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectChapter(ch.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectChapter(ch.id)
                  }
                }}
                className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                  activeChapterId === ch.id
                    ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-2 truncate min-w-0">
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${activeChapterId === ch.id ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate text-xs">{ch.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400">
                    {ch.words}w
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Are you sure you want to delete "${ch.title}"?`)) {
                        deleteChapterMutation.mutate(ch.id)
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-opacity"
                    title="Delete Chapter"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            <div className="mt-6 px-2">
              <button
                type="button"
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Manuscript (HTML)
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Lore Index</span>
              <button
                type="button"
                className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                title="Open Story Bible"
                onClick={() => onNavigateToBible?.()}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {filteredEntities.map((item: any, idx: number) => {
              const iconKey = item.attributes?.icon || item.icon
              const Icon = ICON_MAP[iconKey as keyof typeof ICON_MAP] || FileText
              const rankText = item.attributes?.rank || item.rank || item.category
              return (
                <button
                  key={`${item.id}-${idx}`}
                  type="button"
                  onClick={() => onNavigateToBible?.()}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  title="Open in Story Bible"
                >
                  <div className="flex items-center space-x-2 truncate min-w-0">
                    <Icon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="truncate text-xs">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-transparent shrink-0 ml-2">
                    {rankText}
                  </span>
                </button>
              )
            })}
          </>
        )}
      </div>
    </aside>
  )
})

