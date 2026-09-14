import { For, Show, createMemo, createSignal } from "solid-js"
import { animate, type EventPayload } from "gpuix-solid"
import iconCheck from "../../upstream/gpuix/example-app/assets/icons/check.svg?raw"
import iconCircleCheck from "../../upstream/gpuix/example-app/assets/icons/circle-check.svg?raw"
import iconInbox from "../../upstream/gpuix/example-app/assets/icons/inbox.svg?raw"
import iconPanelLeft from "../../upstream/gpuix/example-app/assets/icons/panel-left.svg?raw"
import iconPlus from "../../upstream/gpuix/example-app/assets/icons/plus.svg?raw"
import iconSearch from "../../upstream/gpuix/example-app/assets/icons/search.svg?raw"
import iconSettings from "../../upstream/gpuix/example-app/assets/icons/settings.svg?raw"
import iconSparkle from "../../upstream/gpuix/example-app/assets/icons/sparkle.svg?raw"
import iconStar from "../../upstream/gpuix/example-app/assets/icons/star.svg?raw"
import iconSun from "../../upstream/gpuix/example-app/assets/icons/sun.svg?raw"
import iconTrash from "../../upstream/gpuix/example-app/assets/icons/trash.svg?raw"

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

const FONT = typeof window === "undefined" ? "Helvetica" : "IBM Plex Sans"
const SIDEBAR_WIDTH = 236
const CONTENT_MAX_WIDTH = 640
const TITLEBAR_CLEARANCE =
  typeof process !== "undefined" && process.platform === "darwin" ? 86 : 20

const ICONS = {
  check: iconCheck,
  circleCheck: iconCircleCheck,
  inbox: iconInbox,
  panelLeft: iconPanelLeft,
  plus: iconPlus,
  search: iconSearch,
  settings: iconSettings,
  sparkle: iconSparkle,
  star: iconStar,
  sun: iconSun,
  trash: iconTrash,
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
