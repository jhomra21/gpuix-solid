import { For, Show, createMemo, createSignal } from "solid-js"
import { animate, type EventPayload } from "gpuix-solid"

const C = {
  canvas: "#1A1A1A",
  sidebar: "#181818",
  raised: "#232323",
  overlay: "#E6EAF20D",
  overlayStrong: "#E6EAF217",
  border: "#E6EAF212",
  sidebarBorder: "#292929",
  text: "#E2E2E2",
  secondary: "#A3A3A3",
  tertiary: "#7D7D7D",
  ghost: "#575757",
  accent: "#E2795B",
  onAccent: "#17181C",
}

const FONT = "Helvetica"
const SIDEBAR_WIDTH = 236
const CONTENT_MAX_WIDTH = 640
const TITLEBAR_CLEARANCE = process.platform === "darwin" ? 86 : 20

const ICONS = {
  check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  circleCheck: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
  inbox: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  panelLeft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="3"/><path d="M9 3v18"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><path fill="#000" d="M23.957 41.77a18.02 18.02 0 0 0 10.477-3.376l11.109 11.11a2.66 2.66 0 0 0 1.898.773c1.524 0 2.625-1.172 2.625-2.672c0-.703-.234-1.359-.75-1.874L38.277 34.668c2.32-3.047 3.703-6.82 3.703-10.922c0-9.914-8.109-18.023-18.023-18.023c-9.937 0-18.023 8.109-18.023 18.023S14.02 41.77 23.957 41.77m0-3.891c-7.758 0-14.133-6.398-14.133-14.133S16.2 9.613 23.957 9.613c7.734 0 14.133 6.399 14.133 14.133c0 7.735-6.399 14.133-14.133 14.133"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  sparkle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m4.206 7.5 15.588 9"/><path d="m19.794 7.5-15.588 9"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
} as const

type IconName = keyof typeof ICONS

interface Todo {
  id: string
  title: string
  done: boolean
  starred: boolean
  today: boolean
}

type ViewId = "inbox" | "today" | "starred" | "done"

interface ViewDefinition {
  id: ViewId
  label: string
  icon: IconName
}

const VIEWS = [
  { id: "inbox", label: "Inbox", icon: "inbox" },
  { id: "today", label: "Today", icon: "sun" },
  { id: "starred", label: "Starred", icon: "star" },
  { id: "done", label: "Done", icon: "circleCheck" },
] as const satisfies readonly ViewDefinition[]

const INITIAL: Todo[] = [
  { id: "t1", title: "Read the GPUIX quickstart", done: true, starred: false, today: true },
  { id: "t2", title: "Draw the first window", done: true, starred: false, today: true },
  { id: "t3", title: "Wire a native <input> to React state", done: false, starred: true, today: true },
  { id: "t4", title: "Put a long list behind <virtual-list>", done: false, starred: false, today: true },
  { id: "t5", title: "Animate the sidebar with motion.div", done: false, starred: true, today: false },
  { id: "t6", title: "Tint an icon through style.color", done: false, starred: false, today: false },
  { id: "t7", title: "Compile a standalone binary", done: false, starred: false, today: false },
  { id: "t8", title: "Ship it", done: false, starred: false, today: false },
]

function matches(todo: Todo, view: ViewId): boolean {
  if (view === "done") return todo.done
  if (view === "starred") return todo.starred && !todo.done
  if (view === "today") return todo.today && !todo.done
  return !todo.done
}

function Icon(props: { name: IconName; size?: number; color: string }) {
  return (
    <svg
      source={ICONS[props.name]}
      style={{ width: props.size ?? 15, height: props.size ?? 15, flexShrink: 0, color: props.color }}
    />
  )
}

function IconButton(props: {
  icon: IconName
  onClick?: () => void
  testId: string
  color?: string
}) {
  return (
    <div
      testId={props.testId}
      onClick={() => props.onClick?.()}
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        hover: { backgroundColor: C.overlay },
        active: { backgroundColor: C.overlayStrong },
      }}
    >
      <Icon name={props.icon} color={props.color ?? C.tertiary} />
    </div>
  )
}

function SidebarRow(props: {
  icon: IconName
  label: string
  count?: number
  active?: boolean
  onClick?: () => void
}) {
  return (
    <div
      testId={`view-${props.label.toLowerCase()}`}
      onClick={() => props.onClick?.()}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 32,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 7,
        cursor: "pointer",
        backgroundColor: props.active ? C.overlayStrong : "#00000000",
        hover: { backgroundColor: props.active ? C.overlayStrong : C.overlay },
      }}
    >
      <Icon name={props.icon} size={14} color={props.active ? C.text : C.secondary} />
      <text
        style={{
          flexGrow: 1,
          fontSize: 13,
          fontFamily: FONT,
          color: props.active ? C.text : C.secondary,
        }}
      >
        {props.label}
      </text>
      <Show when={props.count}>
        {(count) => <text style={{ fontSize: 12, fontFamily: FONT, color: C.ghost }}>{String(count())}</text>}
      </Show>
    </div>
  )
}

function Checkbox(props: { done: boolean; onToggle: () => void; testId: string }) {
  return (
    <div
      testId={props.testId}
      onClick={props.onToggle}
      style={{
        width: 19,
        height: 19,
        flexShrink: 0,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: props.done ? C.accent : C.ghost,
        backgroundColor: props.done ? C.accent : "#00000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        hover: { borderColor: props.done ? C.accent : C.secondary },
      }}
    >
      <Show when={props.done}>
        <Icon name="check" size={11} color={C.onAccent} />
      </Show>
    </div>
  )
}

function TodoRow(props: {
  todo: Todo
  onToggle: () => void
  onStar: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = createSignal(false)

  return (
    <div
      testId={`row-${props.todo.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 44,
        maxWidth: CONTENT_MAX_WIDTH,
        paddingLeft: 10,
        paddingRight: 6,
        borderRadius: 9,
        hover: { backgroundColor: C.overlay },
      }}
    >
      <Checkbox done={props.todo.done} onToggle={props.onToggle} testId={`toggle-${props.todo.id}`} />
      <text
        style={{
          flexGrow: 1,
          fontSize: 14,
          fontFamily: FONT,
          lineHeight: 20,
          color: props.todo.done ? C.ghost : C.text,
        }}
      >
        {props.todo.title}
      </text>
      <Show when={props.todo.starred && !hovered()}>
        <Icon name="star" size={13} color={C.accent} />
      </Show>
      <Show when={hovered()}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2 }}>
          <IconButton
            icon="star"
            testId={`star-${props.todo.id}`}
            onClick={props.onStar}
            color={props.todo.starred ? C.accent : C.ghost}
          />
          <IconButton
            icon="trash"
            testId={`delete-${props.todo.id}`}
            onClick={props.onDelete}
            color={C.ghost}
          />
        </div>
      </Show>
    </div>
  )
}

function Composer(props: { onAdd: (title: string) => void }) {
  const [draft, setDraft] = createSignal("")

  const submit = (): void => {
    const title = draft().trim()
    if (!title) return
    props.onAdd(title)
    setDraft("")
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 46,
        paddingLeft: 12,
        paddingRight: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.raised,
      }}
    >
      <Icon name="plus" size={15} color={C.tertiary} />
      <input
        testId="composer"
        value={draft()}
        placeholder="Add a task"
        autoFocus
        onChange={(event: EventPayload) => setDraft(event.value ?? "")}
        onSubmit={submit}
        theme={{ caret: C.accent }}
        style={{ flexGrow: 1, fontSize: 14, fontFamily: FONT, color: C.text }}
      />
      <div
        testId="add"
        onClick={submit}
        style={{
          height: 30,
          paddingLeft: 14,
          paddingRight: 14,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          opacity: draft().trim() ? 1 : 0.35,
          backgroundColor: C.accent,
          cursor: "pointer",
          hover: { backgroundColor: "#EC8767" },
        }}
      >
        <text style={{ fontSize: 13, fontFamily: FONT, color: C.onAccent }}>Add</text>
      </div>
    </div>
  )
}

function EmptyState(props: { view: ViewId }) {
  return (
    <div
      style={{
        flexGrow: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <Icon name="sparkle" size={22} color={C.ghost} />
      <text style={{ fontSize: 14, fontFamily: FONT, color: C.tertiary }}>
        {props.view === "done" ? "Nothing finished yet" : "All clear"}
      </text>
    </div>
  )
}

export function TodoApp() {
  const [todos, setTodos] = createSignal<Todo[]>(INITIAL)
  const [view, setView] = createSignal<ViewId>("today")
  const [collapsed, setCollapsed] = createSignal(false)
  let nextId = INITIAL.length

  const counts = createMemo(() => {
    const current = todos()
    const of = (id: ViewId): number => current.filter((todo) => matches(todo, id)).length
    return { inbox: of("inbox"), today: of("today"), starred: of("starred"), done: of("done") }
  })
  const visible = createMemo(() => todos().filter((todo) => matches(todo, view())))
  const activeView = createMemo(() => VIEWS.find((entry) => entry.id === view()) ?? VIEWS[0])

  const update = (id: string, patch: Partial<Todo>): void => {
    setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, ...patch } : todo))
  }

  const add = (title: string): void => {
    nextId += 1
    const next: Todo = {
      id: `t${nextId}`,
      title,
      done: false,
      starred: false,
      today: view() !== "inbox",
    }
    setTodos((current) => [next, ...current])
  }

  return (
    <div
      testId="todo-shell"
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        backgroundColor: C.canvas,
      }}
    >
      <animate.div
        testId="sidebar-clip"
        initial={false}
        to={{ width: collapsed() ? 0 : SIDEBAR_WIDTH }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{
          display: "flex",
          flexDirection: "row",
          height: "100%",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: SIDEBAR_WIDTH,
            height: "100%",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            paddingTop: TITLEBAR_CLEARANCE,
            paddingLeft: 10,
            paddingRight: 10,
            paddingBottom: 10,
            backgroundColor: C.sidebar,
            borderRightWidth: 1,
            borderColor: C.sidebarBorder,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
              height: 30,
              paddingLeft: 8,
              paddingBottom: 6,
            }}
          >
            <Icon name="sparkle" size={14} color={C.accent} />
            <text style={{ fontSize: 13, fontFamily: FONT, color: C.text }}>Tasks</text>
          </div>
          <For each={VIEWS}>
            {(entry) => (
              <SidebarRow
                icon={entry.icon}
                label={entry.label}
                count={counts()[entry.id]}
                active={entry.id === view()}
                onClick={() => setView(entry.id)}
              />
            )}
          </For>
          <div style={{ flexGrow: 1 }} />
          <SidebarRow icon="settings" label="Settings" />
        </div>
      </animate.div>

      <div
        style={{
          flexGrow: 1,
          minWidth: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            height: 52,
            paddingLeft: collapsed() ? TITLEBAR_CLEARANCE : 14,
            paddingRight: 14,
            flexShrink: 0,
          }}
        >
          <IconButton
            icon="panelLeft"
            testId="sidebar-toggle"
            onClick={() => setCollapsed((current) => !current)}
          />
          <text testId="view-title" style={{ fontSize: 15, fontFamily: FONT, color: C.text }}>
            {activeView().label}
          </text>
          <text testId="view-count" style={{ fontSize: 13, fontFamily: FONT, color: C.ghost }}>
            {String(visible().length)}
          </text>
          <div style={{ flexGrow: 1 }} />
          <IconButton icon="search" testId="search" />
        </div>

        <Show when={visible().length > 0} fallback={<EmptyState view={view()} />}>
          <virtual-list
            estimatedItemHeight={48}
            style={{
              flexGrow: 1,
              minHeight: 0,
              paddingLeft: 14,
              paddingRight: 14,
            }}
          >
            <For each={visible()}>
              {(todo) => (
                <div>
                  <TodoRow
                    todo={todo}
                    onToggle={() => update(todo.id, { done: !todo.done })}
                    onStar={() => update(todo.id, { starred: !todo.starred })}
                    onDelete={() => setTodos((current) => current.filter((entry) => entry.id !== todo.id))}
                  />
                </div>
              )}
            </For>
          </virtual-list>
        </Show>

        <div
          style={{
            flexShrink: 0,
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 8,
            paddingBottom: 14,
            maxWidth: CONTENT_MAX_WIDTH + 28,
          }}
        >
          <Composer onAdd={add} />
        </div>
      </div>
    </div>
  )
}
