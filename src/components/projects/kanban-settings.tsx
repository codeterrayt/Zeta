"use client"

import * as React from "react"
import { Plus, GripVertical, Trash2, Edit2, Check, X } from "lucide-react"
import { createBoardSection, deleteBoardSection, updateBoardSectionOrder, renameBoardSection } from "@/actions/board-section"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"

type Section = {
  id: string
  name: string
  order: number
}

export function KanbanSettings({ projectId, initialSections }: { projectId: string; initialSections: Section[] }) {
  const [sections, setSections] = React.useState(initialSections)
  const [newName, setNewName] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  // Update local state when initialSections change (e.g. on router.refresh)
  React.useEffect(() => {
    setSections(initialSections)
  }, [initialSections])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    const res = await createBoardSection(projectId, newName.trim().toUpperCase())
    setLoading(false)
    if (res.success) {
      setNewName("")
      router.refresh()
    } else {
      alert(res.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will NOT delete tasks, but they might disappear from the board if their status doesn't match any section.")) return
    const res = await deleteBoardSection(id, projectId)
    if (res.success) router.refresh()
  }

  const handleRename = async (id: string) => {
    if (!editValue.trim()) return
    const res = await renameBoardSection(id, editValue.trim().toUpperCase(), projectId)
    if (res.success) {
      setEditingId(null)
      router.refresh()
    } else {
      alert(res.error)
    }
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(sections)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSections(items)
    
    const ids = items.map(item => item.id)
    await updateBoardSectionOrder(projectId, ids)
    router.refresh()
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border bg-secondary/20">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Kanban Sections
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add, remove, or drag to reorder columns for your Kanban board.
        </p>
      </div>

      <div className="p-6 space-y-6">
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="NEW STATUS (e.g. TESTING)"
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading || !newName.trim()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            Add Section
          </button>
        </form>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="space-y-2"
              >
                {sections.map((section, index) => (
                  <Draggable key={section.id} draggableId={section.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg border border-border group"
                      >
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {editingId === section.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="flex-1 bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none"
                              />
                              <button onClick={() => handleRename(section.id)} className="text-emerald-500 hover:bg-emerald-500/10 p-1 rounded">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-medium">{section.name}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingId(section.id)
                              setEditValue(section.name)
                            }}
                            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {section.name !== "DONE" && section.name !== "IN_PROGRESS" ? (
                            <button
                              onClick={() => handleDelete(section.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete status"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-1.5 rounded-md text-muted-foreground/30 cursor-not-allowed"
                              title="System statuses cannot be deleted"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  )
}
