import { For, Show, createMemo, createSignal, type Element as SolidElement } from "solid-js"
import {
  type EventPayload,
  type PublicInstance,
  useGpuix,
} from "gpuix-solid"
import { SafeMdxContent } from "../chat/mdx"

const C = {
  canvas: "#1A1A1A",
  raised: "#232323",
  border: "#E6EAF212",
  text: "#E2E2E2",
  secondary: "#A3A3A3",
  tertiary: "#7D7D7D",
  accent: "#E2795B",
  avatar: "#343434",
} as const

const FONT_SANS = process.platform === "darwin" ? "Helvetica" : "sans-serif"
const PAGE_CACHE_SIZE = 5
const EDGE_HEIGHT = 160

export interface Message {
  id: string
  index: number
  author: string
  time: string
  source: string
}

export interface MessagePage {
  items: Message[]
  before: string | null
  after: string | null
}

export interface MessagePageRequest {
  direction: "previous" | "next" | "around"
  cursor: string
}

export interface MessageApi {
  requests: MessagePageRequest[]
  initialPage(messageId?: string): MessagePage
  fetchPage(request: MessagePageRequest): Promise<MessagePage>
}

function messageId(index: number): string {
  return `message-${String(index).padStart(3, "0")}`
}

function seededRandom(seed: number): () => number {
  let state = (seed * 2_654_435_761) >>> 0
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}

const SUBJECTS = [
  "the scroll anchor",
  "the retained window",
  "this cursor",
  "the page cache",
  "the wheel handler",
  "the paint pass",
  "the layout budget",
  "that migration",
  "the row estimate",
  "the request guard",
  "the diff",
  "the frame loop",
] as const

const VERBS = [
  "drifts whenever",
  "holds as long as",
  "breaks once",
  "settles after",
  "only matters while",
  "gets rebuilt when",
  "stays cheap until",
  "falls apart if",
] as const

const OBJECTS = [
  "a page lands mid gesture",
  "the viewport overflows",
  "two commits collapse into one",
  "the cache evicts from the far end",
  "a row is measured for the first time",
  "the user scrolls faster than the network",
  "heights are still estimates",
  "the anchor names a different message",
  "nothing is mounted above",
] as const

const TAILS = [
  "so keep the two apart.",
  "which is the whole reason for the guard.",
  "and that is fine.",
  "though it rarely shows on a fast machine.",
  "and the test asserts exactly that.",
  "so measure before changing it.",
  "",
  "",
  "which nobody notices until production.",
] as const

const TITLE_TAILS = [
  "in practice",
  "after a splice",
  "under load",
  "on a slow network",
  "revisited",
  "and the anchor",
  "explained",
  "one more time",
] as const

function pick<T>(random: () => number, list: readonly T[]): T {
  const value = list[Math.floor(random() * list.length)]
  if (value === undefined) throw new Error("Expected a seeded chat fixture value")
  return value
}

function sentence(random: () => number): string {
  const tail = pick(random, TAILS)
  return `${pick(random, SUBJECTS)} ${pick(random, VERBS)} ${pick(random, OBJECTS)}${tail ? `, ${tail}` : "."}`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function heading(random: () => number): string {
  return capitalize(`${pick(random, SUBJECTS)} ${pick(random, TITLE_TAILS)}`)
}

function paragraph(random: () => number): string {
  const count = 1 + Math.floor(random() * 4)
  return capitalize(Array.from({ length: count }, () => sentence(random)).join(" "))
}

function messageSource(index: number, count: number): string {
  const random = seededRandom(index + 1)
  const target = (index * 7 + 13) % count
  const link = `[Open message ${String(target).padStart(3, "0")}](/messages/${messageId(target)})`
  const kind = Math.floor(random() * 6)

  if (kind === 0) {
    const rows = Array.from({ length: 2 + Math.floor(random() * 4) }, () =>
      `| ${capitalize(pick(random, SUBJECTS))} | ${Math.floor(random() * 900)} | ${random() > 0.5 ? "bounded" : "viewport"} |`,
    ).join("\n")
    return `### ${heading(random)}\n\n| Concern | Rows | Cost |\n|:--------|-----:|:-----|\n${rows}\n\n${link}`
  }

  if (kind === 1) {
    const lines = Array.from({ length: 1 + Math.floor(random() * 4) }, (_, line) =>
      `const page${line} = await fetchMessages({ ${random() > 0.5 ? "before" : "after"}: '${messageId(Math.floor(random() * count))}' })`,
    ).join("\n")
    return `${paragraph(random)}\n\n\`\`\`ts\n${lines}\n\`\`\`\n\n${link}`
  }

  if (kind === 2) {
    const bullets = Array.from({ length: 2 + Math.floor(random() * 5) }, () =>
      `- ${capitalize(sentence(random))}`,
    ).join("\n")
    return `> ${paragraph(random)}\n\n${bullets}\n\n${link}`
  }

  if (kind === 3) return `${capitalize(sentence(random))} ${link}`

  if (kind === 4) {
    const blocks = Array.from({ length: 1 + Math.floor(random() * 3) }, () => paragraph(random))
    return `## ${heading(random)}\n\n${blocks.join("\n\n")}\n\n${link}`
  }

  return `${paragraph(random)}\n\n${paragraph(random)}\n\n${link}`
}

export interface FakeMessageApiOptions {
  messageCount?: number | undefined
  pageSize?: number | undefined
  delayMs?: number | undefined
}

export function createFakeMessageApi(options: FakeMessageApiOptions = {}): MessageApi {
  const messageCount = options.messageCount ?? 400
  const pageSize = options.pageSize ?? 12
  const delayMs = options.delayMs ?? 1_600
  const messages = Array.from({ length: messageCount }, (_, index): Message => ({
    id: messageId(index),
    index,
    author: index % 4 === 0 ? "Tommy" : "GPUIX",
    time: `${9 + Math.floor(index / 12)}:${String((index * 7) % 60).padStart(2, "0")}`,
    source: messageSource(index, messageCount),
  }))

  const indexOf = (id: string): number => messages.findIndex((message) => message.id === id)
  const page = (start: number, end: number): MessagePage => {
    const items = messages.slice(Math.max(0, start), Math.min(messageCount, end))
    const first = items[0]
    const last = items[items.length - 1]
    return {
      items,
      before: !first || first.index === 0 ? null : first.id,
      after: !last || last.index === messageCount - 1 ? null : last.id,
    }
  }
  const around = (id?: string): MessagePage => {
    if (!id) return page(messageCount - pageSize, messageCount)
    const index = indexOf(id)
    const start = Math.max(0, Math.min(index - Math.floor(pageSize / 2), messageCount - pageSize))
    return page(start, start + pageSize)
  }

  const requests: MessagePageRequest[] = []
  return {
    requests,
    initialPage: around,
    async fetchPage(request) {
      requests.push(request)
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
      if (request.direction === "around") return around(request.cursor)
      if (request.direction === "previous") {
        const end = indexOf(request.cursor)
        return page(end - pageSize, end)
      }
      const start = indexOf(request.cursor) + 1
      return page(start, start + pageSize)
    },
  }
}

function MessageRow(props: { message: Message; onNavigate(href: string): void }): SolidElement {
  return (
    <div
      testId={`message-${props.message.id}`}
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", gap: 12, width: 760, maxWidth: "100%" }}>
        <div
          style={{
            display: "flex",
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: props.message.author === "Tommy" ? C.accent : C.avatar,
          }}
        >
          <text style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>
            {props.message.author === "Tommy" ? "T" : "G"}
          </text>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, gap: 7 }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
            <text style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{props.message.author}</text>
            <text style={{ color: C.tertiary, fontSize: 12 }}>{props.message.time}</text>
            <text style={{ color: C.tertiary, fontSize: 11 }}>{props.message.id}</text>
          </div>
          <SafeMdxContent source={props.message.source} onLinkClick={props.onNavigate} />
        </div>
      </div>
    </div>
  )
}

function EdgeRow(props: { side: "previous" | "next"; loading: boolean }): SolidElement {
  return (
    <div
      testId={`edge-${props.side}`}
      style={{
        display: "flex",
        height: EDGE_HEIGHT,
        width: "100%",
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <text style={{ color: props.loading ? C.tertiary : "#3A3A3A", fontSize: 12 }}>
        {props.loading ? "Loading older messages…" : "·"}
      </text>
    </div>
  )
}

interface EdgeToken {
  side: "previous" | "next"
}

type TranscriptItem = Message | EdgeToken
const PREVIOUS_EDGE: EdgeToken = { side: "previous" }
const NEXT_EDGE: EdgeToken = { side: "next" }

function isEdge(item: TranscriptItem): item is EdgeToken {
  return "side" in item
}

interface TranscriptProps {
  messages: Message[]
  hasPrevious: boolean
  hasNext: boolean
  loading: "previous" | "next" | "route" | null
  setListRef(instance: PublicInstance): void
  onNavigate(href: string): void
  onVisibleRange(event: EventPayload): void
}

function Transcript(props: TranscriptProps): SolidElement {
  const rows = createMemo<TranscriptItem[]>(() => {
    const result: TranscriptItem[] = []
    if (props.hasPrevious) result.push(PREVIOUS_EDGE)
    result.push(...props.messages)
    if (props.hasNext) result.push(NEXT_EDGE)
    return result
  })

  return (
    <virtual-list
      ref={props.setListRef}
      alignment="bottom"
      estimatedItemHeight={150}
      overdraw={0}
      onVisibleRange={props.onVisibleRange}
      style={{ width: "100%", height: "100%" }}
    >
      <For each={rows()}>
        {(item) => isEdge(item)
          ? <EdgeRow side={item.side} loading={props.loading === item.side} />
          : <MessageRow message={item} onNavigate={props.onNavigate} />}
      </For>
    </virtual-list>
  )
}

function withPage(options: {
  current: MessagePage[]
  incoming: MessagePage
  direction: "previous" | "next"
}): MessagePage[] {
  const known = new Set(options.current.flatMap((page) => page.items.map((message) => message.id)))
  const items = options.incoming.items.filter((message) => !known.has(message.id))
  if (items.length === 0) return options.current
  const nextPage = { ...options.incoming, items }
  return options.direction === "previous"
    ? [nextPage, ...options.current]
    : [...options.current, nextPage]
}

function evictFarPage(options: {
  current: MessagePage[]
  direction: "previous" | "next"
}): MessagePage[] {
  if (options.current.length <= PAGE_CACHE_SIZE) return options.current
  return options.direction === "previous"
    ? options.current.slice(0, PAGE_CACHE_SIZE)
    : options.current.slice(-PAGE_CACHE_SIZE)
}

export interface InfiniteChatAppProps {
  api?: MessageApi | undefined
  initialMessageId?: string | undefined
}

export function InfiniteChatApp(props: InfiniteChatAppProps = {}): SolidElement {
  const api = props.api ?? createFakeMessageApi()
  const [pages, setPages] = createSignal<MessagePage[]>([api.initialPage(props.initialMessageId)])
  const [route, setRoute] = createSignal(
    props.initialMessageId ? `/messages/${props.initialMessageId}` : "/messages/latest",
  )
  const [loading, setLoading] = createSignal<"previous" | "next" | "route" | null>(null)
  const context = useGpuix()
  if (!context) throw new Error("InfiniteChatApp must run inside a GPUix Solid root")
  const { renderer, flushSync } = context
  let pending = false
  let listRef: PublicInstance | undefined

  const messages = createMemo(() => pages().flatMap((page) => page.items))
  const before = createMemo(() => pages()[0]?.before ?? null)
  const after = createMemo(() => pages()[pages().length - 1]?.after ?? null)

  const loadPage = async (direction: "previous" | "next"): Promise<void> => {
    const cursor = direction === "previous" ? before() : after()
    if (!cursor || pending) return
    pending = true
    setLoading(direction)
    const currentPages = pages()
    const currentMessages = messages()
    const currentBefore = before()
    const anchorId = currentMessages[0]?.id
    const edgeNextRow = (currentBefore ? 1 : 0) + currentMessages.length
    const page = await api.fetchPage({ direction, cursor })
    const inserted = withPage({ current: currentPages, incoming: page, direction })
    const listId = listRef?.id
    const top = listId !== undefined ? renderer.getListScrollTop?.(listId) : null

    flushSync(() => {
      setPages(inserted)
      setLoading(null)
    })
    const settled = evictFarPage({ current: inserted, direction })
    flushSync(() => setPages(settled))
    pending = false

    if (inserted === currentPages || listId === undefined || !top) return
    const anchorIndex = top[0] ?? 0
    const offsetInItem = top[1] ?? 0
    const viewportHeight = top[2] ?? 0
    const settledMessages = settled.flatMap((entry) => entry.items)
    const leadingEdge = settled[0]?.before ? 1 : 0

    if (direction === "previous" && anchorIndex === 0 && anchorId) {
      const index = settledMessages.findIndex((message) => message.id === anchorId)
      if (index >= 0) {
        renderer.scrollToItem?.(listId, index + leadingEdge, offsetInItem - EDGE_HEIGHT)
      }
      return
    }

    if (direction === "next" && anchorIndex >= edgeNextRow) {
      const offset = anchorIndex > edgeNextRow ? EDGE_HEIGHT - viewportHeight : offsetInItem
      const appended = inserted[inserted.length - 1]
      const firstAppendedId = appended?.items[0]?.id
      const index = settledMessages.findIndex((message) => message.id === firstAppendedId)
      if (index >= 0) renderer.scrollToItem?.(listId, index + leadingEdge, offset)
    }
  }

  const navigate = async (href: string): Promise<void> => {
    const target = href.match(/^\/messages\/(message-\d+)$/)?.[1]
    if (!target || pending) return
    pending = true
    setLoading("route")
    const page = await api.fetchPage({ direction: "around", cursor: target })
    flushSync(() => {
      setPages([page])
      setRoute(href)
      setLoading(null)
    })
    pending = false
    const index = page.items.findIndex((message) => message.id === target)
    const id = listRef?.id
    if (id !== undefined && index >= 0) {
      renderer.scrollToItem?.(id, index + (page.before ? 1 : 0))
    }
  }

  const handleVisibleRange = (event: EventPayload): void => {
    const start = Math.floor(event.startIndex ?? 0)
    const end = Math.ceil(event.endIndex ?? start + 1)
    const rowCount = messages().length + (before() ? 1 : 0) + (after() ? 1 : 0)
    if (before() && start === 0) {
      void loadPage("previous")
    } else if (after() && end >= rowCount) {
      void loadPage("next")
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: C.canvas,
        color: C.text,
        fontFamily: FONT_SANS,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: 50,
          flexShrink: 0,
          paddingLeft: 24,
          paddingRight: 24,
          borderBottomWidth: 1,
          borderColor: C.border,
        }}
      >
        <text style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Infinite history</text>
        <text testId="infinite-route" style={{ color: C.secondary, fontSize: 12 }}>{route()}</text>
      </div>

      <div style={{ display: "flex", flexGrow: 1, minHeight: 0, position: "relative" }}>
        <Transcript
          messages={messages()}
          hasPrevious={before() !== null}
          hasNext={after() !== null}
          loading={loading()}
          setListRef={(instance) => { listRef = instance }}
          onNavigate={(href) => { void navigate(href) }}
          onVisibleRange={handleVisibleRange}
        />

        <Show when={loading() === "route"}>
          <div
            testId="loading-route"
            style={{
              position: "absolute",
              top: 12,
              left: 0,
              right: 0,
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 14,
                backgroundColor: C.raised,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <text style={{ color: C.secondary, fontSize: 12 }}>● Jumping to message…</text>
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}
