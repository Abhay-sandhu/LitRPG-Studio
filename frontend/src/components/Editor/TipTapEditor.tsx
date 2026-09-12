import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { EditorToolbar } from './EditorToolbar'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateChapter } from '../../api'

interface TipTapEditorProps {
  chapterId?: number
  initialContent?: string
  onWordCountChange?: (count: number) => void
  onContentChange?: (content: string) => void
  onSaveStatusChange?: (status: 'synced' | 'saving' | 'error') => void
}

const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    blockquote: {
      HTMLAttributes: {
        class: 'system-blue-box',
      },
    },
  }),
  Placeholder.configure({
    placeholder: 'Write your story here or insert a [System Box]...',
  }),
  CharacterCount,
  TextAlign.configure({
    types: ['heading', 'paragraph', 'blockquote'],
  }),
  Highlight.configure({
    multicolor: true,
  }),
]

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  chapterId,
  initialContent = '',
  onWordCountChange,
  onContentChange,
  onSaveStatusChange
}) => {
  const queryClient = useQueryClient()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSaveRef = useRef<{ id: number; content: string; words: number } | null>(null)

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
        }).catch(err => {
          console.error("Cleanup save failed:", err)
        })
      }
    }
  }, [queryClient])
  
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
    extensions: TIPTAP_EXTENSIONS,
    content: initialContent,
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
