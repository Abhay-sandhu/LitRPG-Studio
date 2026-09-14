import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const LoreHighlighter = Extension.create({
  name: 'loreHighlighter',

  addStorage() {
    return {
      entities: [],
    }
  },

  addProseMirrorPlugins() {
    const { editor } = this
    
    return [
      new Plugin({
        key: new PluginKey('loreHighlighter'),
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, oldState) {
            const storage = editor.storage as any
            
            // Fix performance lag: if document hasn't changed and lore hasn't updated, just map the old decorations
            if (!tr.docChanged && !tr.getMeta('loreUpdate')) {
              return oldState.map(tr.mapping, tr.doc)
            }

            const entities = storage.loreHighlighter?.entities || []
            if (!entities.length) return DecorationSet.empty

            const decorations: Decoration[] = []
            
            const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

            tr.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const text = node.text
                entities.forEach((entity: any) => {
                  if (!entity.name?.trim()) return
                  
                  const escaped = escapeRegExp(entity.name.trim())
                  const prefix = /^\w/.test(entity.name.trim()) ? '\\b' : ''
                  const suffix = /\w$/.test(entity.name.trim()) ? '\\b' : ''
                  const regex = new RegExp(`${prefix}${escaped}${suffix}`, 'gi')
                  let match
                  while ((match = regex.exec(text)) !== null) {
                    if (match[0].length === 0) break
                    
                    decorations.push(
                      Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                        class: 'lore-tooltip-target',
                        'data-lore-id': entity.id,
                        'data-lore-name': entity.name,
                        'data-lore-cat': entity.category,
                        'data-lore-desc': entity.description,
                      })
                    )
                  }
                })
              }
            })

            return DecorationSet.create(tr.doc, decorations)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})
