"use client"

import * as React from "react"
import { forwardRef, useImperativeHandle, useState } from "react"

export const MentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({ id: item.id, label: item.name || item.email })
    }
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
        return true
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
        return true
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }

      return false
    },
  }))

  return (
    <div className="bg-popover text-popover-foreground border border-border/50 rounded-xl shadow-2xl overflow-hidden min-w-[200px] flex flex-col p-1 z-[100] pointer-events-auto">
      {props.items.length > 0 ? (
        props.items.map((item: any, index: number) => (
          <button
            key={item.id}
            onMouseDown={(e) => {
              e.preventDefault()
              selectItem(index)
            }}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors w-full text-left ${
              index === selectedIndex ? "bg-primary text-primary-foreground" : "hover:bg-secondary hover:text-foreground"
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border shrink-0">
              {item.image ? (
                <img src={item.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] font-bold text-foreground">{item.name?.[0] ?? item.email?.[0]}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold truncate">{item.name || item.email}</span>
              {item.name && <span className="text-[9px] opacity-70 truncate">{item.email}</span>}
            </div>
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-xs text-muted-foreground italic">No users found</div>
      )}
    </div>
  )
})

MentionList.displayName = "MentionList"
