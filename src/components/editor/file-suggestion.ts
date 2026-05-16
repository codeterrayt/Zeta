import { ReactRenderer } from "@tiptap/react"
import tippy from "tippy.js"
import { FileMentionList } from "./file-mention-list"

export const fileSuggestion = {
  char: "@file:",
  allowSpaces: false,

  items: ({ query }: { query: string }) => {
    // Overridden by the component
    return []
  },

  render: () => {
    let component: any
    let popup: any

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(FileMentionList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) return

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        })
      },

      onUpdate(props: any) {
        component.updateProps(props)
        if (!props.clientRect) return
        popup[0].setProps({ getReferenceClientRect: props.clientRect })
      },

      onKeyDown(props: any) {
        if (props.event.key === "Escape") {
          popup[0].hide()
          return true
        }
        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
