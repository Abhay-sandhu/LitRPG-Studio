import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import MentionList from './MentionList'

export default {
  items: ({ query, editor }: any) => {
    // We can inject the lore entities into editor.storage or just rely on a global lookup.
    // For now, let's assume editor.storage.lore.entities has the list.
    const lore = editor.storage.lore?.entities || []
    return lore
      .filter((item: any) => item.name && item.name.toLowerCase().includes((query || '').toLowerCase()))
      .slice(0, 5)
  },

  render: () => {
    let component: any
    let popup: any

    return {
      onStart: (props: any) => {
        if (popup?.[0]) {
          popup[0].destroy()
          popup = null
        }
        if (component) {
          component.destroy()
          component = null
        }

        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props: any) {
        component?.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide()
          return true
        }

        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup?.[0]?.destroy()
        popup = null
        component?.destroy()
        component = null
      },
    }
  },
}
