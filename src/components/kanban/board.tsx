"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { TaskCard } from "./task-card"
import { TaskModal } from "./task-modal"
import { cn } from "@/lib/utils"
import { updateTaskStatus } from "@/actions/task"

export type Task = {
  id: string
  title: string
  status: string
  points?: number | null
  description?: string | null
  assigneeId?: string | null
  assignee?: { name: string } | null
}

export type ColumnData = {
  id: string
  title: string
  tasks: Task[]
}

type ProjectMember = { id: string; name: string | null; email: string | null }

export function KanbanBoard({
  initialData,
  projectMembers = [],
  projectId,
  boardSections = [],
}: {
  initialData: ColumnData[]
  projectMembers?: ProjectMember[]
  projectId: string
  boardSections?: Array<{ id: string; name: string }>
}) {
  const [columns, setColumns] = useState(initialData)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const startCol = columns.find(c => c.id === source.droppableId)
    const finishCol = columns.find(c => c.id === destination.droppableId)

    if (!startCol || !finishCol) return

    if (startCol === finishCol) {
      const newTasks = Array.from(startCol.tasks)
      const [movedTask] = newTasks.splice(source.index, 1)
      newTasks.splice(destination.index, 0, movedTask)

      const newCol = { ...startCol, tasks: newTasks }
      setColumns(columns.map(c => c.id === newCol.id ? newCol : c))
      return
    }

    // Moving from one list to another
    const startTasks = Array.from(startCol.tasks)
    const [movedTask] = startTasks.splice(source.index, 1)
    
    // Update task status local state
    const updatedTask = { ...movedTask, status: finishCol.id }

    const finishTasks = Array.from(finishCol.tasks)
    finishTasks.splice(destination.index, 0, updatedTask)

    setColumns(columns.map(c => {
      if (c.id === startCol.id) return { ...c, tasks: startTasks }
      if (c.id === finishCol.id) return { ...c, tasks: finishTasks }
      return c
    }))

    // Call server action to update task status in DB
    await updateTaskStatus(draggableId, finishCol.id, projectId)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden h-full pb-4">
        {columns.map(column => (
          <div key={column.id} className="flex flex-col w-80 shrink-0 h-full">
            <div className="flex items-center justify-between mb-4 px-1 shrink-0">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                {column.title} <span className="text-xs ml-2 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{column.tasks.length}</span>
              </h3>
            </div>
            
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex-1 overflow-y-auto bg-secondary/30 rounded-xl p-3 transition-colors",
                    snapshot.isDraggingOver ? "bg-secondary/50" : ""
                  )}
                >
                  <div className="flex flex-col gap-3 min-h-[150px]">
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <TaskCard 
                              task={task} 
                              isDragging={snapshot.isDragging} 
                              onClick={() => setSelectedTask(task)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
      <TaskModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        projectMembers={projectMembers}
        boardSections={boardSections}
      />
    </DragDropContext>
  )
}
