import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { EditorToolbar } from './EditorToolbar'

interface TipTapEditorProps {
  onWordCountChange?: (count: number) => void
  onContentChange?: (content: string) => void
}

const INITIAL_LITRPG_CONTENT = `
<h2>Chapter 1: The Crypt of the Fallen King</h2>
<p>The damp stone walls of the lower catacombs dripped with stagnant water. Ethan tightened his grip on the cracked hilt of his shortsword, his knuckles white in the gloom. His breath plumed in the freezing subterranean air.</p>

<blockquote style="text-align: center">
  <p><strong>[SYSTEM ANNOUNCEMENT]</strong></p>
  <p>You have entered: <mark>The Sunken Catacombs (Floor 1)</mark>.</p>
  <p>Level Requirement: 1-5 | Hazard Level: Low</p>
</blockquote>

<p>Ahead, pair after pair of glowing crimson eyes ignited in the darkness. The skeletal sentinels rattled as they drew rusted iron blades from the earthen floor. Ethan took a slow, measured step forward, feeling the hum of mana dormant within his veins.</p>

<blockquote style="text-align: center">
  <p><strong>[COMBAT ENGAGED]</strong></p>
  <p>Enemy Detected: <u>Skeletal Sentinel</u> (Level 2)</p>
  <p>Warning: Blunt physical resistance +15%.</p>
</blockquote>

<p>He grinned despite the chill. "Let's see what these old bones are worth."</p>
`

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  onWordCountChange,
  onContentChange,
}) => {
  const editor = useEditor({
    extensions: [
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
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'blockquote'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: INITIAL_LITRPG_CONTENT,
    onUpdate: ({ editor }) => {
      const words = editor.storage.characterCount.words()
      if (onWordCountChange) {
        onWordCountChange(words)
      }
      if (onContentChange) {
        onContentChange(editor.getHTML())
      }
    },
  })

  // Set initial word count once editor is ready
  useEffect(() => {
    if (editor && onWordCountChange) {
      onWordCountChange(editor.storage.characterCount.words())
    }
  }, [editor, onWordCountChange])

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
