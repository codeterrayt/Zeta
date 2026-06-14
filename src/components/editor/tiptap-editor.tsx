"use client"

import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Heading from "@tiptap/extension-heading"
import BulletList from "@tiptap/extension-bullet-list"
import OrderedList from "@tiptap/extension-ordered-list"
import ListItem from "@tiptap/extension-list-item"
import Blockquote from "@tiptap/extension-blockquote"
import Mention from "@tiptap/extension-mention"
import { mergeAttributes } from "@tiptap/core"
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  ImageIcon, Undo, Redo, Code, Quote, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, Highlighter, AtSign, Paperclip, X,
  FileIcon, Download, Trash2, Loader2,
} from "lucide-react"
import * as React from "react"
import { useCallback } from "react"
import suggestion from "./suggestion"
import { fileSuggestion } from "./file-suggestion"
import { useParams } from "next/navigation"
import { getProjectMembersForAssign } from "@/actions/project-members"
import { getAttachmentsForContext } from "@/actions/get-attachments"
import { deleteAttachment } from "@/actions/attachment"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { FileMentionBadge } from "./file-mention-badge"
import { cn } from "@/lib/utils"

interface TiptapEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  minHeight?: string
  projectId?: string
  taskId?: string
  sprintId?: string
  chatGroupId?: string
  onAttachmentUpload?: (att: any) => void
}

let fileMentionCount = 0

const FileMentionNodeView = ({ node, editor }: any) => {
  const { id, label } = node.attrs
  const [attachments, setAttachments] = React.useState<any[]>(() => {
    return (editor.storage as any)?.fileMention?.attachments || editor.options?.attachments || []
  })

  React.useEffect(() => {
    const handleUpdate = () => {
      setAttachments((editor.storage as any)?.fileMention?.attachments || editor.options?.attachments || [])
    }
    editor.on("transaction", handleUpdate)
    return () => {
      editor.off("transaction", handleUpdate)
    }
  }, [editor])

  const meta = attachments.find((a: any) => a.id === id || a.name === label)

  return (
    <NodeViewWrapper className="inline-block align-middle">
      <FileMentionBadge
        id={id}
        name={label}
        url={meta?.url}
        type={meta?.type}
        size={meta?.size}
      />
    </NodeViewWrapper>
  )
}

export function TiptapEditor({
  content = "",
  onChange,
  placeholder = "Add a description...",
  minHeight = "150px",
  projectId: manualProjectId,
  taskId: manualTaskId,
  sprintId: manualSprintId,
  chatGroupId,
  onAttachmentUpload,
}: TiptapEditorProps) {
  const params = useParams()
  const { data: session } = useSession()
  const projectId = manualProjectId || (params.projectId as string)
  const taskId = manualTaskId || (params.taskId as string)
  const sprintId = manualSprintId || (params.sprintId as string)

  const [members, setMembers] = React.useState<any[]>([])
  const [attachments, setAttachments] = React.useState<any[]>([])
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Resolve projectId for mentions (backtrace from taskId if needed)
  React.useEffect(() => {
    async function resolveProject() {
      if (chatGroupId) {
        const { getChatGroup } = await import("@/actions/chat")
        const res = await getChatGroup(chatGroupId)
        if (res.success && res.group) {
          setMembers((res.group as any).members.map((m: any) => m.user))
        }
        const { getAttachmentsForContext } = await import("@/actions/get-attachments")
        getAttachmentsForContext({ chatGroupId }).then(res => {
          setAttachments(res || [])
        })
        return
      }

      let activeProjectId = projectId

      if (!activeProjectId && params.taskId) {
        const { getTaskById } = await import("@/actions/task")
        const res = await getTaskById(params.taskId as string)
        if (res.success && res.task) {
          activeProjectId = res.task.projectId
        }
      }

      if (activeProjectId) {
        getProjectMembersForAssign(activeProjectId).then(res => {
          setMembers(res || [])
        })
        getAttachmentsForContext({ projectId: activeProjectId, taskId, sprintId }).then(res => {
          setAttachments(res || [])
        })
      }
    }
    resolveProject()
  }, [projectId, taskId, sprintId, chatGroupId, params.taskId])

  const attachmentsRef = React.useRef<any[]>([])
  const membersRef = React.useRef<any[]>([])

  React.useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  React.useEffect(() => {
    membersRef.current = members
  }, [members])

  const FileMention = React.useMemo(() => {
    return Mention.extend({
      name: "fileMention",

      addStorage() {
        return {
          attachments: [],
        }
      },

      addAttributes() {
        return {
          id: { default: null },
          label: { default: null },
        }
      },

      parseHTML() {
        return [
          {
            tag: 'span[data-type="file-mention"]',
            getAttrs: dom => {
              const element = dom as HTMLElement
              return {
                id: element.getAttribute('data-id'),
                label: element.getAttribute('data-label'),
              }
            },
          },
        ]
      },

      renderHTML({ node, HTMLAttributes }) {
        return [
          'span',
          mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
            'data-type': 'file-mention',
            'data-id': node.attrs.id,
            'data-label': node.attrs.label,
          }),
          `📎 ${node.attrs.label}`,
        ]
      },

      addNodeView() {
        return ReactNodeViewRenderer(FileMentionNodeView)
      },

    }).configure({
      suggestion: {
        ...fileSuggestion,
        allowSpaces: true,
        char: "@file:",
        items: ({ query }: { query: string }) =>
          attachmentsRef.current
            .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8),
      },
    })
  }, [])

  const editor = useEditor(
    {
      extensions: [
        // StarterKit WITHOUT the extensions we supply ourselves to avoid duplicates
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          blockquote: false,
          bold: {},
          italic: {},
          strike: {},
          code: {},
          codeBlock: false,
          underline: false,
        } as any),
        Heading.configure({ levels: [1, 2, 3] }),
        BulletList,
        OrderedList,
        ListItem,
        Blockquote,
        Image.configure({ inline: false, allowBase64: true }),
        Placeholder.configure({ placeholder }),
        Underline,
        Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer" } }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Highlight.configure({ multicolor: true }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold border border-primary/20",
          },
          suggestion: {
            ...suggestion,
            allowSpaces: true,
            items: ({ query }: { query: string }) =>
              membersRef.current
                .filter(item =>
                  (item.name || "").toLowerCase().startsWith(query.toLowerCase()) ||
                  (item.email || "").toLowerCase().startsWith(query.toLowerCase())
                )
                .slice(0, 5),
          },
        }),
        // File @file: mention
        FileMention,
      ],
      attachments, // Pass attachments here so NodeView can access them
      content,
      onUpdate: ({ editor }: { editor: any }) => {
        onChange?.(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class: cn("prose max-w-none focus:outline-none px-4 py-3", `min-h-[${minHeight}]`),
          style: `min-height: ${minHeight}`,
        },
      },
    } as any,
    []
  )

  // Sync attachments with editor options & storage for NodeView access
  React.useEffect(() => {
    if (editor) {
      editor.setOptions({ attachments } as any)
      if ((editor.storage as any)?.fileMention) {
        (editor.storage as any).fileMention.attachments = attachments
        editor.view.dispatch(editor.state.tr)
      }
    }
  }, [editor, attachments])

  // Handle external content clearing (e.g. after comment is successfully added)
  React.useEffect(() => {
    if (editor && content === "") {
      const currentHTML = editor.getHTML()
      if (currentHTML !== "" && currentHTML !== "<p></p>") {
        editor.commands.setContent("")
      }
    }
  }, [editor, content])

  const addImage = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !editor) return
      const reader = new FileReader()
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [editor])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    if (taskId) formData.append("taskId", taskId)
    if (sprintId) formData.append("sprintId", sprintId)
    if (chatGroupId) formData.append("chatGroupId", chatGroupId)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        const att = data.attachment
        setAttachments(prev => [att, ...prev])
        onAttachmentUpload?.(att)
        toast.success(`"${att.name}" uploaded`)
        // Auto-insert the fileMention node into the editor
        editor.chain().focus().insertContent([
          {
            type: "fileMention",
            attrs: { id: att.id, label: att.name }
          },
          {
            type: "text",
            text: " "
          }
        ]).run()
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch {
      toast.error("Upload error")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm("Delete this attachment?")) return
    const res = await deleteAttachment(id)
    if (res.success) {
      setAttachments(prev => prev.filter(a => a.id !== id))
      toast.success("Attachment deleted")
    } else {
      toast.error(res.error)
    }
  }

  if (!editor) return null

  const ToolbarButton = ({ onClick, active, title, children }: {
    onClick: () => void; active?: boolean; title: string; children: React.ReactNode
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded hover:bg-secondary transition-colors ${active ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-border rounded-xl overflow-visible focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-secondary/10 flex-wrap rounded-t-xl">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
          <Code className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
          <Highlighter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton onClick={addImage} title="Insert Image">
          <ImageIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().insertContent("@").run()} title="Mention User or File use @user / @file:filename">
          <AtSign className="w-3.5 h-3.5" />
        </ToolbarButton>
        {/* File Upload Button */}
        <label
          title="Attach File"
          className={`p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground cursor-pointer flex items-center justify-center ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>

        <div className="flex-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="bg-background rounded-b-xl">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function getFileEmoji(type: string, name: string) {
  if (type.startsWith("image/")) return "🖼️"
  if (type === "application/pdf") return "📄"
  if (type.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return "📝"
  if (type.includes("sheet") || name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return "📊"
  if (type.includes("presentation") || name.endsWith(".ppt") || name.endsWith(".pptx")) return "📑"
  if (type.includes("zip") || name.endsWith(".zip") || name.endsWith(".rar")) return "🗜️"
  if (type.startsWith("video/")) return "🎬"
  if (type.startsWith("audio/")) return "🎵"
  if (type.includes("javascript") || type.includes("typescript") || name.match(/\.(ts|js|py|go|rs|java|c|cpp)$/)) return "💻"
  return "📎"
}

function formatBytes(bytes: number) {
  if (!bytes) return "–"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

