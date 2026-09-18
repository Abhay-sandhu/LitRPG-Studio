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

            const compiled = entities
              .filter((e: any) => e.name?.trim())
              .sort((a: any, b: any) => b.name.trim().length - a.name.trim().length)
              .map((e: any) => {
                const trimmed = e.name.trim()
                const escaped = escapeRegExp(trimmed)
                const prefix = /^\w/.test(trimmed) ? '\\b' : ''
                const suffix = /\w$/.test(trimmed) ? '\\b' : ''
                return { entity: e, regex: new RegExp(`${prefix}${escaped}${suffix}`, 'gi') }
              })

            tr.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const text = node.text
                const occupied: Array<[number, number]> = []

                compiled.forEach(({ entity, regex }: { entity: any, regex: RegExp }) => {
                  regex.lastIndex = 0
                  let match
                  while ((match = regex.exec(text)) !== null) {
                    if (match[0].length === 0) break
                    const matchStart = match.index
                    const matchEnd = match.index + match[0].length

                    // Prevent nested/overlapping highlights (prioritizes longer entity matches)
                    const overlaps = occupied.some(([s, e]) => Math.max(matchStart, s) < Math.min(matchEnd, e))
                    if (overlaps) continue

                    occupied.push([matchStart, matchEnd])

                    const tooltipText = `${entity.name} (${entity.category})${entity.description ? ' — ' + entity.description : ''}`
                    decorations.push(
                      Decoration.inline(pos + matchStart, pos + matchEnd, {
                        class: 'lore-tooltip-target',
                        title: tooltipText,
                        'data-lore-id': String(entity.id),
                        'data-lore-name': entity.name,
                        'data-lore-cat': entity.category,
                        'data-lore-desc': entity.description || '',
                      })
                    )
                  }
                })
              }
            })

            decorations.sort((a, b) => a.from - b.from)
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
