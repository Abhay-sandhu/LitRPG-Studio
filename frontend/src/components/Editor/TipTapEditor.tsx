import React, { useEffect, useRef, useMemo } from 'react'
import { FileText } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Mention from '@tiptap/extension-mention'
import { EditorToolbar } from './EditorToolbar'
import suggestion from './LoreMention'
import { LoreHighlighter } from './LoreHighlighter'
import 'tippy.js/dist/tippy.css'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { updateChapter, fetchLore } from '../../api'

interface TipTapEditorProps {
  chapterId?: number
  initialContent?: string
  projectId?: number
  onWordCountChange?: (count: number) => void
  onContentChange?: (content: string) => void
  onSaveStatusChange?: (status: 'synced' | 'saving' | 'error') => void
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  chapterId,
  initialContent = '',
  projectId = 1,
  onWordCountChange,
  onContentChange,
  onSaveStatusChange
}) => {
  const queryClient = useQueryClient()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSaveRef = useRef<{ id: number; content: string; words: number } | null>(null)
  
  // Fetch global lore for highlighting and autocomplete
  const { data: lore = [] } = useQuery({
    queryKey: ['lore', projectId],
    queryFn: () => fetchLore(projectId),
    enabled: !!projectId
  })

  // Memoize extensions to prevent unnecessary re-initialization
  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      blockquote: { HTMLAttributes: { class: 'system-blue-box' } },
    }),
    Underline,
    Placeholder.configure({
      placeholder: 'Write your story here or insert a [System Box]...',
    }),
    CharacterCount,
    TextAlign.configure({ types: ['heading', 'paragraph', 'blockquote'] }),
    Highlight.configure({ multicolor: true }),
    Mention.configure({
      HTMLAttributes: {
        class: 'mention bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 px-1 rounded-sm font-semibold',
      },
      suggestion,
    }),
    LoreHighlighter,
  ], [])

  const mutation = useMutation({
    mutationFn: (vars: { id: number, payload: any }) => updateChapter(vars.id, vars.payload),
    onMutate: () => {
      onSaveStatusChange?.('saving')
    },
    onSuccess: () => {
      onSaveStatusChange?.('synced')
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
    },
    onError: () => {
      onSaveStatusChange?.('error')
    }
  })

  const editor = useEditor({
    extensions,
    content: initialContent,
    onCreate: ({ editor }) => {
      onWordCountChange?.(editor.storage.characterCount.words())
    },
    onUpdate: ({ editor }) => {
      const words = editor.storage.characterCount.words()
      const content = editor.getHTML()
      
      if (onWordCountChange) onWordCountChange(words)
      if (onContentChange) onContentChange(content)

      if (chapterId) {
        pendingSaveRef.current = { id: chapterId, content, words }
        onSaveStatusChange?.('saving')
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          mutation.mutate({ id: chapterId, payload: { content, words } })
          pendingSaveRef.current = null
        }, 1000)
      }
    },
  })

  // Ensure lore is loaded into editor storage
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.view) {
      const storage = editor.storage as any
      storage.loreHighlighter = storage.loreHighlighter || {}
      storage.loreHighlighter.entities = lore
      
      storage.lore = storage.lore || {}
      storage.lore.entities = lore
      
      // Force a transaction to trigger the highlighter plugin update
      editor.view.dispatch(editor.state.tr.setMeta('loreUpdate', true))
    }
  }, [lore, editor])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      const savedData = pendingSaveRef.current
      if (savedData) {
        // Optimistically update cache instantly to prevent rapid double-switch bug
        queryClient.setQueriesData({ queryKey: ['chapters'] }, (old: any) => {
          if (!old) return old
          return old.map((c: any) => 
            c.id === savedData.id 
              ? { ...c, content: savedData.content, words: savedData.words } 
              : c
          )
        })

        updateChapter(savedData.id, {
          content: savedData.content,
          words: savedData.words
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['chapters'] })
          onSaveStatusChange?.('synced')
        }).catch((err: any) => {
          console.error("Cleanup save failed:", err)
          onSaveStatusChange?.('error')
        })
      }
    }
  }, [queryClient, onSaveStatusChange])

  // Ensure save status is clean upon chapter mount
  useEffect(() => {
    if (chapterId) {
      onSaveStatusChange?.('synced')
    }
  }, [chapterId, onSaveStatusChange])

  if (!chapterId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-950 text-slate-400 dark:text-slate-500 select-none">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500 shadow-sm">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Chapter Selected</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">
          Select an existing chapter from the left sidebar or click <strong className="text-sky-600 dark:text-sky-400">+</strong> to create a new chapter.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden transition-colors">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto px-8 py-8 md:px-16 lg:px-24">
        <div className="max-w-3xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
