import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

const MentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items?.[index]
    if (item) {
      props.command?.({ id: item.id, label: item.name })
    }
  }

  const upHandler = () => {
    if (!props.items?.length) return
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    if (!props.items?.length) return
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden py-1 min-w-[200px]">
      {props.items?.length ? (
        props.items.map((item: any, index: number) => (
          <button
            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
              index === selectedIndex ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            <span className="font-semibold">{item.name}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{item.category}</span>
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-slate-400 italic">No lore found</div>
      )}
    </div>
  )
})

export default MentionList
