import { For, Show, createMemo, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { Button, Card, initialTasks, inputStyle, palette, type Task, type TaskFilter } from "../native"

const filters: TaskFilter[] = ["all", "active", "completed"]

export function TasksRoute(): SolidElement {
  const [tasks, setTasks] = createSignal<Task[]>(initialTasks)
  const [newTaskText, setNewTaskText] = createSignal("")
  const [filter, setFilter] = createSignal<TaskFilter>("all")
  const [editingTaskId, setEditingTaskId] = createSignal<number | null>(null)
  const [editText, setEditText] = createSignal("")
  const [deleteConfirmId, setDeleteConfirmId] = createSignal<number | null>(null)

  const filteredTasks = createMemo(() => {
    if (filter() === "completed") return tasks().filter((task) => task.isCompleted)
    if (filter() === "active") return tasks().filter((task) => !task.isCompleted)
    return tasks()
  })

  const addTask = (): void => {
    const text = newTaskText().trim()
    if (!text) return
    const id = tasks().reduce((max, task) => Math.max(max, task.id), 0) + 1
    setTasks((current) => [...current, { id, text, isCompleted: false }])
    setNewTaskText("")
  }

  const setCompleted = (id: number, isCompleted: boolean): void => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, isCompleted } : task))
  }

  const startEditing = (task: Task): void => {
    setEditingTaskId(task.id)
    setEditText(task.text)
  }

  const saveTaskText = (id: number): void => {
    const text = editText().trim()
    if (!text) return
    setTasks((current) => current.map((task) => task.id === id ? { ...task, text } : task))
    setEditingTaskId(null)
    setEditText("")
  }

  const deleteTask = (id: number): void => {
    setTasks((current) => current.filter((task) => task.id !== id))
    setDeleteConfirmId(null)
  }

  return (
    <div testId="page-tasks" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <text style={{ color: palette.text, fontSize: 24, fontWeight: 600 }}>My Tasks</text>
        <text style={{ color: palette.secondary, fontSize: 12 }}>Create, manage and track your tasks</text>
      </div>

      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <For each={filters}>
          {(value) => (
            <Button testId={`tasks-filter-${value}`} active={filter() === value} onClick={() => setFilter(value)}>
              <text style={{ color: filter() === value ? palette.white : palette.text, fontSize: 12 }}>
                {value === "all" ? "All" : value === "active" ? "Active" : "Completed"}
              </text>
            </Button>
          )}
        </For>
      </div>

      <Card style={{ borderWidth: 0 }}>
        <text style={{ color: palette.text, fontSize: 15, fontWeight: 600 }}>New Task</text>
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <input testId="task-input" value={newTaskText()} placeholder="Add a new task..." onChange={(event: EventPayload) => setNewTaskText(event.value ?? "")} onSubmit={addTask} style={inputStyle({ flexGrow: 1 })} />
          <Button testId="task-add" active={Boolean(newTaskText().trim())} onClick={addTask}>
            <text style={{ color: newTaskText().trim() ? palette.white : palette.text, fontSize: 12 }}>+ Add Task</text>
          </Button>
        </div>
      </Card>

      <Card style={{ borderWidth: 0 }}>
        <For each={filteredTasks()} fallback={<text style={{ color: palette.secondary, fontSize: 12 }}>No tasks found. Add a task to get started.</text>}>
          {(task) => (
            <div testId={`task-item-${task.id}`} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderWidth: 1, borderColor: palette.border, borderRadius: 6 }}>
              <div testId={`task-toggle-${task.id}`} onClick={() => setCompleted(task.id, !task.isCompleted)} style={{ width: 20, height: 20, borderWidth: 1, borderColor: palette.border, borderRadius: 4, alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: task.isCompleted ? palette.primary : palette.background }}>
                <text style={{ color: palette.white, fontSize: 10 }}>{task.isCompleted ? "✓" : ""}</text>
              </div>
              <Show when={editingTaskId() === task.id} fallback={
                <text testId={`task-text-${task.id}`} onClick={() => { if (!task.isCompleted) startEditing(task) }} style={{ flexGrow: 1, color: task.isCompleted ? palette.secondary : palette.text, fontSize: 12 }}>{task.text}</text>
              }>
                <input testId={`task-edit-${task.id}`} value={editText()} onChange={(event: EventPayload) => setEditText(event.value ?? "")} onSubmit={() => saveTaskText(task.id)} style={inputStyle({ flexGrow: 1 })} />
                <Button testId={`task-save-${task.id}`} onClick={() => saveTaskText(task.id)}><text style={{ color: palette.text, fontSize: 11 }}>✓</text></Button>
                <Button onClick={() => setEditingTaskId(null)}><text style={{ color: palette.destructive, fontSize: 11 }}>×</text></Button>
              </Show>
              <Show when={editingTaskId() !== task.id}>
                <Button testId={`task-edit-open-${task.id}`} onClick={() => startEditing(task)}><text style={{ color: palette.secondary, fontSize: 11 }}>Edit</text></Button>
                <Show when={deleteConfirmId() === task.id} fallback={<Button testId={`task-delete-${task.id}`} onClick={() => setDeleteConfirmId(task.id)}><text style={{ color: palette.destructive, fontSize: 11 }}>Delete</text></Button>}>
                  <Button testId={`task-confirm-${task.id}`} onClick={() => deleteTask(task.id)}><text style={{ color: palette.destructive, fontSize: 11 }}>Confirm</text></Button>
                  <Button onClick={() => setDeleteConfirmId(null)}><text style={{ color: palette.secondary, fontSize: 11 }}>Cancel</text></Button>
                </Show>
              </Show>
            </div>
          )}
        </For>
        <text testId="tasks-summary" style={{ color: palette.secondary, fontSize: 11 }}>
          {filteredTasks().length} {filteredTasks().length === 1 ? "task" : "tasks"} ({tasks().filter((task) => task.isCompleted).length} completed)
        </text>
      </Card>
    </div>
  )
}
