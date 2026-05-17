"use client"

import * as React from "react"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { TaskCard } from "./task-card"
import { TaskModal } from "./task-modal"
import { cn } from "@/lib/utils"
import { updateTaskStatus } from "@/actions/task"
import { Search, Filter, X, Calendar } from "lucide-react"
import { format, isPast, isToday, differenceInDays } from "date-fns"
import { useSearchParams } from "next/navigation"

export type Task = {
  id: string
  title: string
  status: string
  points?: number | null
  description?: string | null
  creatorId?: string | null
  dueDate?: string | null
  assignments: Array<{
    userId: string
    role: string
    user: { id: string; name: string | null; email: string | null; image: string | null }
  }>
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
  sprints = [],
}: {
  initialData: ColumnData[]
  projectMembers?: ProjectMember[]
  projectId: string
  boardSections?: Array<{ id: string; name: string }>
  sprints?: Array<{ id: string; name: string; startDate: Date | null; endDate: Date | null }>
}) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const [columns, setColumns] = useState(initialData)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const searchParams = useSearchParams()

  React.useEffect(() => {
    const taskIdParam = searchParams?.get("taskId")
    if (taskIdParam) {
      const task = columns.flatMap(c => c.tasks).find(t => t.id === taskIdParam)
      if (task) {
        setSelectedTask(task)
      }
    }
  }, [searchParams, columns])

  // Filters State
  const [search, setSearch] = useState("")
  const [selectedAssignee, setSelectedAssignee] = useState("all")
  const [selectedComplexity, setSelectedComplexity] = useState("all")
  const [selectedDueDate, setSelectedDueDate] = useState("all")

  // Sync state with props when server data refreshes
  React.useEffect(() => {
    setColumns(initialData)
    
    // Update selectedTask if it's currently open to reflect latest data
    if (selectedTask) {
      const freshTask = initialData.flatMap(c => c.tasks).find(t => t.id === selectedTask.id)
      if (freshTask) setSelectedTask(freshTask)
    }
  }, [initialData])

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

  const resetFilters = () => {
    setSearch("")
    setSelectedAssignee("all")
    setSelectedComplexity("all")
    setSelectedDueDate("all")
  }

  const hasActiveFilters = search !== "" || selectedAssignee !== "all" || selectedComplexity !== "all" || selectedDueDate !== "all"

  const filteredColumns = columns.map(col => ({
    ...col,
    tasks: col.tasks.filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.id.toLowerCase().includes(search.toLowerCase()) ||
        `OPEN-${task.id.slice(0, 6)}`.toLowerCase().includes(search.toLowerCase())
      
      const matchesAssignee = selectedAssignee === "all" || 
        task.assignments.some(a => a.userId === selectedAssignee)
      
      const matchesComplexity = selectedComplexity === "all" || 
        task.points === Number(selectedComplexity)

      const matchesDueDate = (() => {
        if (selectedDueDate === "all") return true
        if (!task.dueDate) return false
        const date = new Date(task.dueDate)
        if (selectedDueDate === "overdue") return isPast(date) && !isToday(date)
        if (selectedDueDate === "today") return isToday(date)
        if (selectedDueDate === "week") return differenceInDays(date, new Date()) <= 7
        return true
      })()

      return matchesSearch && matchesAssignee && matchesComplexity && matchesDueDate
    })
  }))

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Kanban Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border p-3 rounded-xl shadow-sm shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Assignee Filter */}
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer h-9 min-w-[120px]"
          >
            <option value="all">Assignees</option>
            {projectMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name || m.email}</option>
            ))}
          </select>

          {/* Due Date Filter */}
          <select
            value={selectedDueDate}
            onChange={(e) => setSelectedDueDate(e.target.value)}
            className="bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer h-9 min-w-[120px]"
          >
            <option value="all">Due Date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
          </select>

          {/* Complexity Filter */}
          <select
            value={selectedComplexity}
            onChange={(e) => setSelectedComplexity(e.target.value)}
            className="bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer h-9 min-w-[100px]"
          >
            <option value="all">Complexity</option>
            {[1, 2, 3, 4, 5].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <div className="w-10 flex justify-center">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-all animate-in fade-in zoom-in duration-200"
                title="Clear Filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden h-full pb-4 custom-scrollbar">
          {filteredColumns.map(column => (
            <div key={column.id} className="flex flex-col w-80 shrink-0 h-full">
              <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/40" />
                  {column.title} 
                  <span className="text-[10px] ml-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-black">
                    {column.tasks.length}
                  </span>
                </h3>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 overflow-y-auto bg-secondary/20 rounded-2xl p-3 transition-all border border-transparent",
                      snapshot.isDraggingOver ? "bg-secondary/40 border-primary/20 ring-4 ring-primary/5" : ""
                    )}
                  >
                    <div className="flex flex-col gap-3 min-h-[150px]">
                      {column.tasks.map((task, index) => {
                        const isAssigned = task.assignments?.some(a => a.userId === currentUserId)
                        const isReporter = task.creatorId === currentUserId
                        const canDrag = isAssigned || isReporter
                        
                        return (
                          <Draggable 
                             key={task.id} 
                             draggableId={task.id} 
                             index={index}
                             isDragDisabled={!canDrag}
                          >
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
                                  canDrag={canDrag}
                                />
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
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
          sprints={sprints}
        />
      </DragDropContext>
    </div>
  )
}
