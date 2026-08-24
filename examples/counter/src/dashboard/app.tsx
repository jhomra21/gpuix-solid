import {
  For,
  Match,
  Show,
  Switch,
  createMemo,
  createSignal,
} from "solid-js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  animate,
  type EventPayload,
  type StyleDesc,
} from "@jhomra21/gpuix-solid"

type Page = "overview" | "tasks" | "notes" | "weather" | "account"
type TaskFilter = "all" | "active" | "completed"
type NoteFilter = "all" | "active" | "archived"

interface Task {
  id: number
  text: string
  completed: boolean
  tag: string
}

interface Note {
  id: number
  title: string
  body: string
  archived: boolean
}

interface WeatherLocation {
  id: number
  city: string
  condition: string
  temperature: number
  high: number
  low: number
  humidity: number
  wind: number
  accent: string
}

const color = {
  app: "#0f1117",
  sidebar: "#151821",
  panel: "#1b1f2a",
  panelRaised: "#222735",
  panelSoft: "#262c3b",
  border: "#343b4d",
  text: "#eef1f8",
  muted: "#9da7bd",
  faint: "#6d768b",
  blue: "#7aa2f7",
  green: "#9ece6a",
  yellow: "#e0af68",
  rose: "#f7768e",
  mauve: "#bb9af7",
  cyan: "#7dcfff",
}

const initialTasks: Task[] = [
  { id: 1, text: "Review dashboard animation endpoints", completed: false, tag: "UI" },
  { id: 2, text: "Verify exact-tarball consumer build", completed: true, tag: "Release" },
  { id: 3, text: "Exercise native input and selection", completed: false, tag: "Testing" },
  { id: 4, text: "Capture final GPUI dashboard screenshot", completed: false, tag: "Visual" },
]

const initialNotes: Note[] = [
  {
    id: 1,
    title: "M7 stabilization",
    body: "Use real application-shaped fixtures to find API friction before stable release.",
    archived: false,
  },
  {
    id: 2,
    title: "Release invariant",
    body: "One exact tarball is packed, smoke-tested, published, verified, tagged, and released.",
    archived: false,
  },
  {
    id: 3,
    title: "Native automation",
    body: "TestRenderer supports fill and press; live keystrokes remain blocked by upstream GPUIX.",
    archived: true,
  },
]

const austin: WeatherLocation = {
  id: 1,
  city: "Austin",
  condition: "Clear",
  temperature: 91,
  high: 96,
  low: 74,
  humidity: 43,
  wind: 9,
  accent: color.yellow,
}

const weather: WeatherLocation[] = [
  austin,
  {
    id: 2,
    city: "Seattle",
    condition: "Light rain",
    temperature: 64,
    high: 68,
    low: 56,
    humidity: 77,
    wind: 6,
    accent: color.cyan,
  },
  {
    id: 3,
    city: "Chicago",
    condition: "Partly cloudy",
    temperature: 78,
    high: 82,
    low: 65,
    humidity: 58,
    wind: 12,
    accent: color.blue,
  },
]

const pageMeta = {
  overview: {
    title: "Overview",
    description: "A native GPUI dashboard powered by Solid 2 signals.",
    short: "OV",
  },
  tasks: {
    title: "Tasks",
    description: "Controlled inputs, filters, list mutations, and event handling.",
    short: "TK",
  },
  notes: {
    title: "Notes",
    description: "Reactive cards, editor state, archive filters, and textarea input.",
    short: "NT",
  },
  weather: {
    title: "Weather",
    description: "Deterministic demo data rendered as animated native cards.",
    short: "WX",
  },
  account: {
    title: "Account",
    description: "Preferences, native Select, and component composition.",
    short: "AC",
  },
} satisfies Record<Page, { title: string; description: string; short: string }>

const navItems: Page[] = ["overview", "tasks", "notes", "weather", "account"]
const overviewLinks: Page[] = ["tasks", "notes", "weather", "account"]
const taskFilters: TaskFilter[] = ["all", "active", "completed"]
const noteFilters: NoteFilter[] = ["all", "active", "archived"]

function panelStyle(extra: StyleDesc = {}): StyleDesc {
  return {
    backgroundColor: color.panel,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 12,
    ...extra,
  }
}

function actionStyle(active = false): StyleDesc {
  return {
    minHeight: 34,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 8,
    backgroundColor: active ? color.blue : color.panelSoft,
    color: active ? color.app : color.text,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    hover: {
      backgroundColor: active ? "#8eb1ff" : "#30384a",
    },
    active: { opacity: 0.82 },
  }
}

function SectionTitle(props: { title: string; detail?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <text style={{ color: color.text, fontSize: 16, fontWeight: 700 }}>{props.title}</text>
      <Show when={props.detail}>
        <text style={{ color: color.muted, fontSize: 12 }}>{props.detail}</text>
      </Show>
    </div>
  )
}

function Pill(props: { text: string; accent?: string }) {
  return (
    <div
      style={{
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 9,
        paddingRight: 9,
        borderRadius: 999,
        backgroundColor: props.accent ?? color.panelSoft,
      }}
    >
      <text style={{ color: color.text, fontSize: 11, fontWeight: 600 }}>{props.text}</text>
    </div>
  )
}

function MetricCard(props: {
  label: string
  value: string
  detail: string
  accent: string
  progress: number
  testId: string
}) {
  return (
    <div style={panelStyle({ flexGrow: 1, minWidth: 150, padding: 14, gap: 10 })}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <text style={{ color: color.muted, fontSize: 12 }}>{props.label}</text>
        <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: props.accent }} />
      </div>
      <text style={{ color: color.text, fontSize: 24, fontWeight: 700 }}>{props.value}</text>
      <text style={{ color: color.muted, fontSize: 11 }}>{props.detail}</text>
      <div style={{ height: 5, borderRadius: 999, backgroundColor: color.panelSoft, overflow: "hidden" }}>
        <animate.div
          testId={props.testId}
          initial={{ width: 10, opacity: 0.55 }}
          to={{ width: props.progress, opacity: 1 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          style={{ height: 5, borderRadius: 999, backgroundColor: props.accent }}
        />
      </div>
    </div>
  )
}

function OverviewPage(props: { onNavigate: (page: Page) => void }) {
  const activity: Array<readonly [string, string, string]> = [
    ["Release", "beta.2 published with SLSA provenance", color.green],
    ["Testing", "Clean Solid TSX/Vite consumer smoke passed", color.blue],
    ["Automation", "Live keystroke blocker isolated upstream", color.mauve],
    ["UI", "Complex dashboard dogfood fixture started", color.yellow],
  ]

  return (
    <div testId="page-overview" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MetricCard label="Native tests" value="74" detail="575 assertions" accent={color.green} progress={178} testId="tests-progress" />
        <MetricCard label="Package" value="beta.2" detail="OIDC + provenance" accent={color.blue} progress={158} testId="release-progress" />
        <MetricCard label="Platforms" value="3/3" detail="Linux, macOS, Windows" accent={color.mauve} progress={190} testId="platform-progress" />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={panelStyle({ flexGrow: 2, minWidth: 320, padding: 16, gap: 14 })}>
          <SectionTitle title="Recent activity" detail="Deterministic data keeps screenshots and automation stable." />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <For each={activity}>
              {(item) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 7, paddingBottom: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: item[2] }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1 }}>
                    <text style={{ color: color.text, fontSize: 12, fontWeight: 600 }}>{item[0]}</text>
                    <text style={{ color: color.muted, fontSize: 11 }}>{item[1]}</text>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <div style={panelStyle({ flexGrow: 1, minWidth: 230, padding: 16, gap: 12 })}>
          <SectionTitle title="Explore the fixture" detail="Each page stresses a different renderer surface." />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <For each={overviewLinks}>
              {(page) => (
                <div
                  testId={`overview-open-${page}`}
                  style={{ ...actionStyle(false), display: "flex", justifyContent: "space-between" }}
                  onClick={() => props.onNavigate(page)}
                >
                  <text style={{ color: color.text, fontSize: 12 }}>{pageMeta[page].title}</text>
                  <text style={{ color: color.faint, fontSize: 11 }}>{pageMeta[page].short}</text>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  )
}

function TasksPage() {
  const [tasks, setTasks] = createSignal<Task[]>(initialTasks)
  const [draft, setDraft] = createSignal("")
  const [filter, setFilter] = createSignal<TaskFilter>("all")
  const [deleteId, setDeleteId] = createSignal<number | null>(null)

  const filtered = createMemo(() => {
    if (filter() === "active") return tasks().filter((task) => !task.completed)
    if (filter() === "completed") return tasks().filter((task) => task.completed)
    return tasks()
  })
  const completedCount = createMemo(() => tasks().filter((task) => task.completed).length)

  const addTask = () => {
    const text = draft().trim()
    if (!text) return
    const nextId = tasks().reduce((max, task) => Math.max(max, task.id), 0) + 1
    setTasks((current) => [...current, { id: nextId, text, completed: false, tag: "Demo" }])
    setDraft("")
  }

  const toggleTask = (id: number) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task))
  }

  const removeTask = (id: number) => {
    setTasks((current) => current.filter((task) => task.id !== id))
    setDeleteId(null)
  }

  return (
    <div testId="page-tasks" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={panelStyle({ padding: 14, gap: 12 })}>
        <SectionTitle title="Create a task" detail="The input is controlled through native GPUI change events." />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            testId="task-input"
            value={draft()}
            placeholder="Add a dashboard test task..."
            onChange={(event: EventPayload) => setDraft(event.value ?? "")}
            onSubmit={addTask}
            style={{
              flexGrow: 1,
              minHeight: 36,
              paddingLeft: 12,
              paddingRight: 12,
              backgroundColor: color.app,
              color: color.text,
              borderWidth: 1,
              borderColor: color.border,
              borderRadius: 8,
            }}
          />
          <div testId="task-add" style={actionStyle(Boolean(draft().trim()))} onClick={addTask}>
            <text style={{ color: draft().trim() ? color.app : color.text, fontSize: 12, fontWeight: 700 }}>Add task</text>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <For each={taskFilters}>
          {(value) => (
            <div testId={`filter-${value}`} style={actionStyle(filter() === value)} onClick={() => setFilter(value)}>
              <text style={{ color: filter() === value ? color.app : color.text, fontSize: 12, fontWeight: 600 }}>
                {value === "all" ? "All" : value === "active" ? "Active" : "Completed"}
              </text>
            </div>
          )}
        </For>
      </div>

      <div style={panelStyle({ padding: 10, gap: 6 })}>
        <For
          each={filtered()}
          fallback={
            <div style={{ padding: 24, alignItems: "center" }}>
              <text style={{ color: color.muted, fontSize: 12 }}>No tasks match this filter.</text>
            </div>
          }
        >
          {(task) => (
            <animate.div
              testId={`task-item-${task.id}`}
              initial={{ opacity: 0, left: 10 }}
              to={{ opacity: 1, left: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 44,
                padding: 8,
                borderRadius: 8,
                backgroundColor: deleteId() === task.id ? "#30232c" : color.panel,
                hover: { backgroundColor: color.panelRaised },
              }}
            >
              <div
                testId={`task-toggle-${task.id}`}
                style={{
                  width: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: task.completed ? color.green : color.border,
                  backgroundColor: task.completed ? color.green : color.app,
                  cursor: "pointer",
                }}
                onClick={() => toggleTask(task.id)}
              >
                <text style={{ color: color.app, fontSize: 11, fontWeight: 800 }}>{task.completed ? "OK" : ""}</text>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, flexGrow: 1 }}>
                <text style={{ color: task.completed ? color.faint : color.text, fontSize: 12 }}>{task.text}</text>
                <text style={{ color: color.faint, fontSize: 10 }}>{task.tag}</text>
              </div>
              <Show
                when={deleteId() === task.id}
                fallback={
                  <div testId={`task-delete-${task.id}`} style={actionStyle(false)} onClick={() => setDeleteId(task.id)}>
                    <text style={{ color: color.rose, fontSize: 11 }}>Delete</text>
                  </div>
                }
              >
                <div style={{ display: "flex", gap: 6 }}>
                  <div testId={`task-confirm-${task.id}`} style={actionStyle(false)} onClick={() => removeTask(task.id)}>
                    <text style={{ color: color.rose, fontSize: 11 }}>Confirm</text>
                  </div>
                  <div style={actionStyle(false)} onClick={() => setDeleteId(null)}>
                    <text style={{ color: color.muted, fontSize: 11 }}>Cancel</text>
                  </div>
                </div>
              </Show>
            </animate.div>
          )}
        </For>
      </div>

      <text testId="tasks-summary" style={{ color: color.muted, fontSize: 11 }}>
        {filtered().length} shown · {tasks().length} total · {completedCount()} completed
      </text>
    </div>
  )
}

function NotesPage() {
  const [notes, setNotes] = createSignal<Note[]>(initialNotes)
  const [filter, setFilter] = createSignal<NoteFilter>("all")
  const [editorOpen, setEditorOpen] = createSignal(false)
  const [title, setTitle] = createSignal("")
  const [body, setBody] = createSignal("")

  const filtered = createMemo(() => {
    if (filter() === "active") return notes().filter((note) => !note.archived)
    if (filter() === "archived") return notes().filter((note) => note.archived)
    return notes()
  })

  const saveNote = () => {
    if (!title().trim()) return
    const nextId = notes().reduce((max, note) => Math.max(max, note.id), 0) + 1
    setNotes((current) => [...current, { id: nextId, title: title().trim(), body: body().trim(), archived: false }])
    setTitle("")
    setBody("")
    setEditorOpen(false)
  }

  const toggleArchive = (id: number) => {
    setNotes((current) => current.map((note) => note.id === id ? { ...note, archived: !note.archived } : note))
  }

  return (
    <div testId="page-notes" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <For each={noteFilters}>
            {(value) => (
              <div testId={`notes-filter-${value}`} style={actionStyle(filter() === value)} onClick={() => setFilter(value)}>
                <text style={{ color: filter() === value ? color.app : color.text, fontSize: 12 }}>
                  {value === "all" ? "All" : value === "active" ? "Active" : "Archived"}
                </text>
              </div>
            )}
          </For>
        </div>
        <div testId="note-new" style={actionStyle(true)} onClick={() => setEditorOpen((open) => !open)}>
          <text style={{ color: color.app, fontSize: 12, fontWeight: 700 }}>{editorOpen() ? "Close editor" : "New note"}</text>
        </div>
      </div>

      <Show when={editorOpen()}>
        <animate.div
          testId="note-editor"
          initial={{ height: 40, opacity: 0 }}
          to={{ height: 176, opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={panelStyle({ overflow: "hidden", padding: 14, gap: 10 })}
        >
          <input
            testId="note-title"
            value={title()}
            placeholder="Note title"
            onChange={(event: EventPayload) => setTitle(event.value ?? "")}
            style={{
              minHeight: 34,
              paddingLeft: 10,
              paddingRight: 10,
              backgroundColor: color.app,
              color: color.text,
              borderWidth: 1,
              borderColor: color.border,
              borderRadius: 8,
            }}
          />
          <textarea
            testId="note-body"
            value={body()}
            placeholder="Write a short note..."
            minRows={2}
            maxRows={4}
            onChange={(event: EventPayload) => setBody(event.value ?? "")}
            style={{
              minHeight: 62,
              padding: 10,
              backgroundColor: color.app,
              color: color.text,
              borderWidth: 1,
              borderColor: color.border,
              borderRadius: 8,
            }}
          />
          <div testId="note-save" style={actionStyle(Boolean(title().trim()))} onClick={saveNote}>
            <text style={{ color: title().trim() ? color.app : color.text, fontSize: 12, fontWeight: 700 }}>Save note</text>
          </div>
        </animate.div>
      </Show>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <For each={filtered()}>
          {(note) => (
            <animate.div
              testId={`note-card-${note.id}`}
              initial={{ opacity: 0, top: 8 }}
              to={{ opacity: 1, top: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={panelStyle({ position: "relative", width: 220, minHeight: 132, padding: 14, gap: 8 })}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <text style={{ color: color.text, fontSize: 13, fontWeight: 700 }}>{note.title}</text>
                <Pill text={note.archived ? "Archived" : "Active"} accent={note.archived ? "#312a42" : "#22362d"} />
              </div>
              <text style={{ color: color.muted, fontSize: 11, lineHeight: 16, lineClamp: 3 }}>{note.body}</text>
              <div testId={`note-archive-${note.id}`} style={{ ...actionStyle(false), marginTop: 4 }} onClick={() => toggleArchive(note.id)}>
                <text style={{ color: color.text, fontSize: 11 }}>{note.archived ? "Restore" : "Archive"}</text>
              </div>
            </animate.div>
          )}
        </For>
      </div>
      <text testId="notes-summary" style={{ color: color.muted, fontSize: 11 }}>{filtered().length} notes shown</text>
    </div>
  )
}

function WeatherPage() {
  const [selected, setSelected] = createSignal(1)
  const [refreshes, setRefreshes] = createSignal(0)
  const current = createMemo(() => weather.find((item) => item.id === selected()) ?? austin)

  return (
    <div testId="page-weather" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <For each={weather}>
          {(item, index) => (
            <animate.div
              testId={`weather-${item.id}`}
              initial={{ opacity: 0, top: 12 }}
              to={{ opacity: 1, top: 0 }}
              transition={{ duration: 0.3, delay: index() * 0.08, ease: "easeOut" }}
              style={panelStyle({
                position: "relative",
                width: 210,
                minHeight: 156,
                padding: 14,
                gap: 10,
                borderColor: selected() === item.id ? item.accent : color.border,
                cursor: "pointer",
                hover: { backgroundColor: color.panelRaised },
              })}
              onClick={() => setSelected(item.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <text style={{ color: color.text, fontSize: 14, fontWeight: 700 }}>{item.city}</text>
                  <text style={{ color: color.muted, fontSize: 11 }}>{item.condition}</text>
                </div>
                <text style={{ color: item.accent, fontSize: 26, fontWeight: 700 }}>{item.temperature}°</text>
              </div>
              <text style={{ color: color.muted, fontSize: 11 }}>High {item.high}° · Low {item.low}°</text>
              <div style={{ display: "flex", gap: 8 }}>
                <Pill text={`Humidity ${item.humidity}%`} />
                <Pill text={`Wind ${item.wind} mph`} />
              </div>
            </animate.div>
          )}
        </For>
      </div>

      <div style={panelStyle({ padding: 16, gap: 12 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle title={`${current().city} detail`} detail="Selecting a card reactively updates this panel." />
          <div testId="weather-refresh" style={actionStyle(false)} onClick={() => setRefreshes((count) => count + 1)}>
            <text style={{ color: color.text, fontSize: 11 }}>Refresh</text>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <text style={{ color: color.muted, fontSize: 11 }}>Feels representative</text>
            <text style={{ color: color.text, fontSize: 20, fontWeight: 700 }}>{current().temperature - 1}°F</text>
          </div>
          <div style={{ flexGrow: 1, height: 7, backgroundColor: color.panelSoft, borderRadius: 999, overflow: "hidden" }}>
            <animate.div
              testId="weather-detail-progress"
              initial={{ width: 12 }}
              to={{ width: Math.max(80, current().humidity * 3) }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{ height: 7, borderRadius: 999, backgroundColor: current().accent }}
            />
          </div>
        </div>
        <text testId="weather-refresh-count" style={{ color: color.faint, fontSize: 10 }}>Demo refreshes: {refreshes()}</text>
      </div>
    </div>
  )
}

function AccountPage() {
  const [density, setDensity] = createSignal("balanced")
  const [notifications, setNotifications] = createSignal(true)
  const [compactSidebar, setCompactSidebar] = createSignal(false)

  const triggerStyle: StyleDesc = {
    minHeight: 38,
    paddingLeft: 12,
    paddingRight: 12,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: color.app,
    color: color.text,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 8,
    cursor: "pointer",
  }

  return (
    <div testId="page-account" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <div style={panelStyle({ flexGrow: 1, minWidth: 280, padding: 16, gap: 14 })}>
        <SectionTitle title="Profile" detail="Static demo identity; no authentication dependency." />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: color.blue, alignItems: "center", justifyContent: "center" }}>
            <text style={{ color: color.app, fontSize: 16, fontWeight: 800 }}>JM</text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <text style={{ color: color.text, fontSize: 14, fontWeight: 700 }}>Juan Martinez</text>
            <text style={{ color: color.muted, fontSize: 11 }}>GPUix Solid demo workspace</text>
          </div>
        </div>

        <SectionTitle title="Content density" detail="This uses GPUix Solid's native Select primitives." />
        <Select defaultValue="balanced" onValueChange={setDensity}>
          <SelectTrigger testId="density-select" style={triggerStyle}>
            <SelectValue placeholder="Choose density" />
            <text style={{ color: color.faint, fontSize: 11 }}>▼</text>
          </SelectTrigger>
          <SelectContent
            testId="density-content"
            side="bottom"
            sideOffset={6}
            style={{
              width: 220,
              padding: 6,
              backgroundColor: color.panelRaised,
              borderWidth: 1,
              borderColor: color.border,
              borderRadius: 10,
            }}
          >
            <SelectItem value="comfortable" style={{ padding: 9, borderRadius: 7, color: color.text, hover: { backgroundColor: color.panelSoft } }}>Comfortable</SelectItem>
            <SelectItem value="balanced" style={{ padding: 9, borderRadius: 7, color: color.text, hover: { backgroundColor: color.panelSoft } }}>Balanced</SelectItem>
            <SelectItem value="compact" style={{ padding: 9, borderRadius: 7, color: color.text, hover: { backgroundColor: color.panelSoft } }}>Compact</SelectItem>
          </SelectContent>
        </Select>
        <text testId="density-value" style={{ color: color.muted, fontSize: 11 }}>Selected: {density()}</text>
      </div>

      <div style={panelStyle({ flexGrow: 1, minWidth: 280, padding: 16, gap: 12 })}>
        <SectionTitle title="Preferences" detail="Reactive toggles exercise click state and conditional styling." />
        <div
          testId="toggle-notifications"
          style={{ ...actionStyle(notifications()), display: "flex", justifyContent: "space-between" }}
          onClick={() => setNotifications((value) => !value)}
        >
          <text style={{ color: notifications() ? color.app : color.text, fontSize: 12 }}>Release notifications</text>
          <text style={{ color: notifications() ? color.app : color.muted, fontSize: 11 }}>{notifications() ? "On" : "Off"}</text>
        </div>
        <div
          testId="toggle-compact-sidebar"
          style={{ ...actionStyle(compactSidebar()), display: "flex", justifyContent: "space-between" }}
          onClick={() => setCompactSidebar((value) => !value)}
        >
          <text style={{ color: compactSidebar() ? color.app : color.text, fontSize: 12 }}>Compact sidebar preference</text>
          <text style={{ color: compactSidebar() ? color.app : color.muted, fontSize: 11 }}>{compactSidebar() ? "On" : "Off"}</text>
        </div>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger testId="account-tooltip" style={{ ...actionStyle(false), display: "flex", justifyContent: "space-between" }}>
              <text style={{ color: color.text, fontSize: 12 }}>Automation status</text>
              <text style={{ color: color.green, fontSize: 11 }}>Ready</text>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              style={{ padding: 10, backgroundColor: color.panelRaised, borderWidth: 1, borderColor: color.border, borderRadius: 8 }}
            >
              <text style={{ color: color.text, fontSize: 11 }}>Native TestRenderer locators can click, fill, press, screenshot, and control time.</text>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

export function DashboardDemo() {
  const [page, setPage] = createSignal<Page>("overview")

  return (
    <div
      testId="dashboard-shell"
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: color.app,
        color: color.text,
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          width: 184,
          flexShrink: 0,
          padding: 12,
          backgroundColor: color.sidebar,
          borderWidth: 1,
          borderColor: color.border,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 6 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: color.blue, alignItems: "center", justifyContent: "center" }}>
            <text style={{ color: color.app, fontSize: 12, fontWeight: 900 }}>GS</text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <text style={{ color: color.text, fontSize: 13, fontWeight: 800 }}>GPUix Solid</text>
            <text style={{ color: color.faint, fontSize: 9 }}>native dashboard</text>
          </div>
        </div>

        <text style={{ color: color.faint, fontSize: 9, fontWeight: 700, marginLeft: 6 }}>NAVIGATION</text>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <For each={navItems}>
            {(item) => (
              <div
                testId={`nav-${item}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  minHeight: 38,
                  paddingLeft: 8,
                  paddingRight: 8,
                  borderRadius: 9,
                  backgroundColor: page() === item ? "#26344f" : color.sidebar,
                  cursor: "pointer",
                  hover: { backgroundColor: page() === item ? "#2d4064" : color.panel },
                }}
                onClick={() => setPage(item)}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: page() === item ? color.blue : color.panelSoft,
                  }}
                >
                  <text style={{ color: page() === item ? color.app : color.muted, fontSize: 9, fontWeight: 800 }}>{pageMeta[item].short}</text>
                </div>
                <text style={{ color: page() === item ? color.text : color.muted, fontSize: 12, fontWeight: page() === item ? 700 : 500 }}>
                  {pageMeta[item].title}
                </text>
              </div>
            )}
          </For>
        </div>

        <div style={{ flexGrow: 1 }} />
        <div style={panelStyle({ padding: 10, gap: 6 })}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color.green }} />
            <text style={{ color: color.text, fontSize: 11, fontWeight: 650 }}>beta.2 verified</text>
          </div>
          <text style={{ color: color.faint, fontSize: 9 }}>Solid 2 · GPUI · OIDC</text>
        </div>
      </div>

      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            minHeight: 66,
            paddingLeft: 18,
            paddingRight: 18,
            borderWidth: 1,
            borderColor: color.border,
            backgroundColor: color.sidebar,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <text testId="page-title" style={{ color: color.text, fontSize: 17, fontWeight: 750 }}>{pageMeta[page()].title}</text>
            <text style={{ color: color.muted, fontSize: 10 }}>{pageMeta[page()].description}</text>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Pill text="Solid 2" accent="#22362d" />
            <Pill text="Native GPUI" accent="#24324d" />
          </div>
        </div>

        <div style={{ flexGrow: 1, minHeight: 0, padding: 16, overflowY: "scroll" }}>
          <Switch>
            <Match when={page() === "overview"}>
              <animate.div initial={{ opacity: 0, left: 12 }} to={{ opacity: 1, left: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ position: "relative" }}>
                <OverviewPage onNavigate={(next) => setPage(next)} />
              </animate.div>
            </Match>
            <Match when={page() === "tasks"}>
              <animate.div initial={{ opacity: 0, left: 12 }} to={{ opacity: 1, left: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ position: "relative" }}>
                <TasksPage />
              </animate.div>
            </Match>
            <Match when={page() === "notes"}>
              <animate.div initial={{ opacity: 0, left: 12 }} to={{ opacity: 1, left: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ position: "relative" }}>
                <NotesPage />
              </animate.div>
            </Match>
            <Match when={page() === "weather"}>
              <animate.div initial={{ opacity: 0, left: 12 }} to={{ opacity: 1, left: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ position: "relative" }}>
                <WeatherPage />
              </animate.div>
            </Match>
            <Match when={page() === "account"}>
              <animate.div initial={{ opacity: 0, left: 12 }} to={{ opacity: 1, left: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ position: "relative" }}>
                <AccountPage />
              </animate.div>
            </Match>
          </Switch>
        </div>
      </div>
    </div>
  )
}
