/**
 * A todo app rendered directly on the GPU by GPUIX.
 *
 * Desktop:  bun run dev
 * Browser:  bun run web:build && bun run web:dev
 * Binary:   bun run build && ./dist/todo
 *
 * The whole app is this one file. Read it top to bottom: tokens, icons,
 * data, small components, then the screen.
 */

import { useMemo, useRef, useState } from 'react'
import { motion, render } from '@gpuix/react'

import iconCheck from './assets/icons/check.svg' with { type: 'text' }
import iconCircleCheck from './assets/icons/circle-check.svg' with { type: 'text' }
import iconInbox from './assets/icons/inbox.svg' with { type: 'text' }
import iconPanelLeft from './assets/icons/panel-left.svg' with { type: 'text' }
import iconPlus from './assets/icons/plus.svg' with { type: 'text' }
import iconSearch from './assets/icons/search.svg' with { type: 'text' }
import iconSettings from './assets/icons/settings.svg' with { type: 'text' }
import iconSparkle from './assets/icons/sparkle.svg' with { type: 'text' }
import iconStar from './assets/icons/star.svg' with { type: 'text' }
import iconSun from './assets/icons/sun.svg' with { type: 'text' }
import iconTrash from './assets/icons/trash.svg' with { type: 'text' }

// ── Design tokens ──────────────────────────────────────────────────────────
// GPUI does not inherit `color`, so every <text> sets one. These names keep
// that honest.

const C = {
  canvas: '#1A1A1A',
  sidebar: '#181818',
  raised: '#232323',
  overlay: '#E6EAF20D',
  overlayStrong: '#E6EAF217',
  border: '#E6EAF212',
  sidebarBorder: '#292929',
  text: '#E2E2E2',
  secondary: '#A3A3A3',
  tertiary: '#7D7D7D',
  ghost: '#575757',
  accent: '#E2795B',
  onAccent: '#17181C',
}

// The browser build ships only IBM Plex Sans and Lilex. Any other family falls
// back to Lilex, which is a monospace, so the web name must differ.
const FONT = typeof window === 'undefined' ? 'Helvetica' : 'IBM Plex Sans'
const SIDEBAR_WIDTH = 236
const CONTENT_MAX_WIDTH = 640
// macOS draws the traffic lights over the app, so the sidebar starts below them.
const TITLEBAR_CLEARANCE =
  typeof process !== 'undefined' && process.platform === 'darwin' ? 86 : 20

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

function Icon({ name, size = 15, color }: { name: IconName; size?: number; color: string }) {
  return (
    <svg source={ICONS[name]} style={{ width: size, height: size, flexShrink: 0, color }} />
  )
}

// ── Data ───────────────────────────────────────────────────────────────────

type Todo = {
  id: string
  title: string
  done: boolean
  starred: boolean
  today: boolean
}

type ViewId = 'inbox' | 'today' | 'starred' | 'done'

const VIEWS: { id: ViewId; label: string; icon: IconName }[] = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox' },
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'starred', label: 'Starred', icon: 'star' },
  { id: 'done', label: 'Done', icon: 'circleCheck' },
]

const INITIAL: Todo[] = [
  { id: 't1', title: 'Read the GPUIX quickstart', done: true, starred: false, today: true },
  { id: 't2', title: 'Draw the first window', done: true, starred: false, today: true },
  { id: 't3', title: 'Wire a native <input> to React state', done: false, starred: true, today: true },
  { id: 't4', title: 'Put a long list behind <virtual-list>', done: false, starred: false, today: true },
  { id: 't5', title: 'Animate the sidebar with motion.div', done: false, starred: true, today: false },
  { id: 't6', title: 'Tint an icon through style.color', done: false, starred: false, today: false },
  { id: 't7', title: 'Compile a standalone binary', done: false, starred: false, today: false },
  { id: 't8', title: 'Ship it', done: false, starred: false, today: false },
]

function matches(todo: Todo, view: ViewId): boolean {
  if (view === 'done') return todo.done
  if (view === 'starred') return todo.starred && !todo.done
  if (view === 'today') return todo.today && !todo.done
  return !todo.done
}

// ── Pieces ─────────────────────────────────────────────────────────────────

function IconButton({
  icon,
  onClick,
  testId,
  color = C.tertiary,
}: {
  icon: IconName
  onClick?: () => void
  testId?: string
  color?: string
}) {
  return (
    <div
      testId={testId}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: 7,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        hover: { backgroundColor: C.overlay },
        active: { backgroundColor: C.overlayStrong },
      }}
    >
      <Icon name={icon} color={color} />
    </div>
  )
}

function SidebarRow({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: IconName
  label: string
  count?: number
  active?: boolean
  onClick?: () => void
}) {
  return (
    <div
      testId={`view-${label.toLowerCase()}`}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 32,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 7,
        cursor: 'pointer',
        backgroundColor: active ? C.overlayStrong : undefined,
        hover: active ? undefined : { backgroundColor: C.overlay },
      }}
    >
      <Icon name={icon} size={14} color={active ? C.text : C.secondary} />
      <text style={{ flexGrow: 1, fontSize: 13, fontFamily: FONT, color: active ? C.text : C.secondary }}>
        {label}
      </text>
      {count ? (
        <text style={{ fontSize: 12, fontFamily: FONT, color: C.ghost }}>{String(count)}</text>
      ) : null}
    </div>
  )
}

function Checkbox({
  done,
  onToggle,
  testId,
}: {
  done: boolean
  onToggle: () => void
  testId?: string
}) {
  return (
    <div
      testId={testId}
      onClick={onToggle}
      style={{
        width: 19,
        height: 19,
        flexShrink: 0,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: done ? C.accent : C.ghost,
        backgroundColor: done ? C.accent : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        hover: { borderColor: done ? C.accent : C.secondary },
      }}
    >
      {done ? <Icon name="check" size={11} color={C.onAccent} /> : null}
    </div>
  )
}

function TodoRow({
  todo,
  onToggle,
  onStar,
  onDelete,
}: {
  todo: Todo
  onToggle: () => void
  onStar: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      testId={`row-${todo.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 44,
        // A `<virtual-list>` row is laid out at the list width, so the column
        // is capped here, one level in, and not on the row wrapper.
        maxWidth: CONTENT_MAX_WIDTH,
        paddingLeft: 10,
        paddingRight: 6,
        borderRadius: 9,
        hover: { backgroundColor: C.overlay },
      }}
    >
      <Checkbox done={todo.done} onToggle={onToggle} testId={`toggle-${todo.id}`} />
      <text
        style={{
          flexGrow: 1,
          fontSize: 14,
          fontFamily: FONT,
          lineHeight: 20,
          color: todo.done ? C.ghost : C.text,
        }}
      >
        {todo.title}
      </text>
      {/* The hover strip already carries a star, so the static marker steps
          aside instead of drawing the same icon twice. */}
      {todo.starred && !hovered ? <Icon name="star" size={13} color={C.accent} /> : null}
      {hovered ? (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <IconButton
            icon="star"
            testId={`star-${todo.id}`}
            onClick={onStar}
            color={todo.starred ? C.accent : C.ghost}
          />
          <IconButton icon="trash" testId={`delete-${todo.id}`} onClick={onDelete} color={C.ghost} />
        </div>
      ) : null}
    </div>
  )
}

function Composer({ onAdd }: { onAdd: (title: string) => void }) {
  const [draft, setDraft] = useState('')

  const submit = () => {
    const title = draft.trim()
    if (!title) return
    onAdd(title)
    setDraft('')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
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
        value={draft}
        placeholder="Add a task"
        autoFocus
        onChange={(event) => setDraft(event.value ?? '')}
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
          display: 'flex',
          alignItems: 'center',
          opacity: draft.trim() ? 1 : 0.35,
          backgroundColor: C.accent,
          cursor: 'pointer',
          hover: { backgroundColor: '#EC8767' },
        }}
      >
        <text style={{ fontSize: 13, fontFamily: FONT, color: C.onAccent }}>Add</text>
      </div>
    </div>
  )
}

// Rendered in place of the list, not inside it: a `<virtual-list>` row is
// sized to its content, so it can never centre on the vertical axis.
function EmptyState({ view }: { view: ViewId }) {
  return (
    <div
      style={{
        flexGrow: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Icon name="sparkle" size={22} color={C.ghost} />
      <text style={{ fontSize: 14, fontFamily: FONT, color: C.tertiary }}>
        {view === 'done' ? 'Nothing finished yet' : 'All clear'}
      </text>
    </div>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────

export function TodoApp() {
  const [todos, setTodos] = useState(INITIAL)
  const [view, setView] = useState<ViewId>('today')
  const [collapsed, setCollapsed] = useState(false)
  const nextId = useRef(INITIAL.length)

  const counts = useMemo(() => {
    const of = (id: ViewId) => todos.filter((todo) => matches(todo, id)).length
    return { inbox: of('inbox'), today: of('today'), starred: of('starred'), done: of('done') }
  }, [todos])

  const visible = useMemo(() => todos.filter((todo) => matches(todo, view)), [todos, view])
  const activeView = VIEWS.find((entry) => entry.id === view)!

  const update = (id: string, patch: Partial<Todo>) =>
    setTodos((current) =>
      current.map((todo) => (todo.id === id ? { ...todo, ...patch } : todo)),
    )

  const add = (title: string) => {
    nextId.current += 1
    setTodos((current) => [
      { id: `t${nextId.current}`, title, done: false, starred: false, today: view !== 'inbox' },
      ...current,
    ])
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        backgroundColor: C.canvas,
      }}
    >
      {/* Animate an outer clipping box, not the sidebar itself, so its text
          never reflows during the transition. */}
      <motion.div
        initial={false}
        animate={{ width: collapsed ? 0 : SIDEBAR_WIDTH }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: SIDEBAR_WIDTH,
            height: '100%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
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
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              height: 30,
              paddingLeft: 8,
              paddingBottom: 6,
            }}
          >
            <Icon name="sparkle" size={14} color={C.accent} />
            <text style={{ fontSize: 13, fontFamily: FONT, color: C.text }}>Tasks</text>
          </div>
          {VIEWS.map((entry) => (
            <SidebarRow
              key={entry.id}
              icon={entry.icon}
              label={entry.label}
              count={counts[entry.id]}
              active={entry.id === view}
              onClick={() => setView(entry.id)}
            />
          ))}
          <div style={{ flexGrow: 1 }} />
          <SidebarRow icon="settings" label="Settings" />
        </div>
      </motion.div>

      <div
        style={{
          flexGrow: 1,
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            height: 52,
            paddingLeft: collapsed ? TITLEBAR_CLEARANCE : 14,
            paddingRight: 14,
            flexShrink: 0,
          }}
        >
          <IconButton
            icon="panelLeft"
            testId="sidebar-toggle"
            onClick={() => setCollapsed((open) => !open)}
          />
          <text style={{ fontSize: 15, fontFamily: FONT, color: C.text }}>{activeView.label}</text>
          <text style={{ fontSize: 13, fontFamily: FONT, color: C.ghost }}>
            {String(visible.length)}
          </text>
          <div style={{ flexGrow: 1 }} />
          <IconButton icon="search" />
        </div>

        {/* The only scroller on this screen. Nested scrolling is not supported,
            so nothing inside a row may scroll. GPUI builds only the visible
            rows plus overdraw; React still mounts every child, which is fine
            at this size. A list of thousands wants `itemCount` and
            `windowStart` so React mounts a window too. */}
        {visible.length === 0 ? (
          <EmptyState view={view} />
        ) : (
          <virtual-list
            estimatedItemHeight={48}
            style={{
              flexGrow: 1,
              minHeight: 0,
              paddingLeft: 14,
              paddingRight: 14,
            }}
          >
            {visible.map((todo) => (
              <div key={todo.id}>
                <TodoRow
                  todo={todo}
                  onToggle={() => update(todo.id, { done: !todo.done })}
                  onStar={() => update(todo.id, { starred: !todo.starred })}
                  onDelete={() =>
                    setTodos((current) => current.filter((entry) => entry.id !== todo.id))
                  }
                />
              </div>
            ))}
          </virtual-list>
        )}

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

// Only open a window when this file is the program. A test imports `TodoApp`.
const isEntryPoint =
  typeof Bun !== 'undefined'
    ? Bun.isStandaloneExecutable || Bun.main === import.meta.path
    : typeof window !== 'undefined'

if (isEntryPoint) {
  render(<TodoApp />, {
    title: 'Todo',
    width: 940,
    height: 660,
    titlebarTransparent: true,
    windowBackground: 'blurred',
    trafficLightX: 16,
    trafficLightY: 17,
    // Agent checks need real GPU paint, not control of the user's keyboard.
    focus: typeof process === 'undefined' || process.env.GPUIX_BACKGROUND !== '1',
  })
}
