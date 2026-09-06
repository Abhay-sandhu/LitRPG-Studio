import React, { useEffect } from 'react'
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
}) => {
  const queryClient = useQueryClient()
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>()
  const isUpdatingRef = React.useRef(false)
  
  const mutation = useMutation({
    mutationFn: (vars: { id: number, payload: any }) => updateChapter(vars.id, vars.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
    }
  })

  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return
      const words = editor.storage.characterCount.words()
      const content = editor.getHTML()
      
      if (onWordCountChange) onWordCountChange(words)
      if (onContentChange) onContentChange(content)

      if (chapterId) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          mutation.mutate({ id: chapterId, payload: { content, words } })
        }, 1000)
      }
    },
  })

  // Sync editor content when active chapter changes
  useEffect(() => {
    if (editor && chapterId) {
      isUpdatingRef.current = true
      editor.commands.setContent(initialContent)
      setTimeout(() => { isUpdatingRef.current = false }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, chapterId])

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
