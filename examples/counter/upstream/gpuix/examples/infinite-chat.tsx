/**
 * A bounded, bidirectional message history built directly on `<virtual-list>`.
 *
 * It behaves like a production chat: the API is slow, the edges of the loaded
 * range are real empty space you can scroll into, and a page only starts
 * loading once you actually reach that space.
 *
 * Run on desktop: cd examples && bun run infinite-chat
 * Run in a browser: bun run web, then open /infinite
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
import {
  applyMacCpuThrottleFromEnv,
  flushSync,
  render,
  useGpuix,
  type EventPayload,
  type PublicInstance,
} from '@gpuix/react'
import dedent from 'string-dedent'
import { SafeMdxContent } from './chat'

const C = {
  canvas: '#1A1A1A',
  raised: '#232323',
  border: '#E6EAF212',
  text: '#E2E2E2',
  secondary: '#A3A3A3',
  tertiary: '#7D7D7D',
  accent: '#E2795B',
  avatar: '#343434',
}

const FONT_SANS = typeof window === 'undefined' ? 'Helvetica' : 'IBM Plex Sans'

/** How many pages stay mounted. The rest are re-fetched from their cursor. */
const PAGE_CACHE_SIZE = 5

/**
 * The empty run above the oldest and below the newest loaded message. It is a
 * real row, so you can scroll into it and watch nothing happen while the
 * request is in flight, exactly like a production client under a slow network.
 */
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

/**
 * `previous` and `next` cursors are EXCLUSIVE: the returned page never repeats
 * the message named by `cursor`. `around` centres a page on it instead, which
 * is what a permalink needs.
 */
export interface MessagePageRequest {
  direction: 'previous' | 'next' | 'around'
  cursor: string
}

export interface MessageApi {
  requests: MessagePageRequest[]
  initialPage(messageId?: string): MessagePage
  fetchPage(request: MessagePageRequest): Promise<MessagePage>
}

function messageId(index: number) {
  return `message-${String(index).padStart(3, '0')}`
}

/**
 * Seeded so a message reads the same on every run and in every test, and so a
 * page fetched twice is byte-identical. `Math.random` would make both false.
 */
function seededRandom(seed: number) {
  let state = (seed * 2654435761) >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

const SUBJECTS = [
  'the scroll anchor', 'the retained window', 'this cursor', 'the page cache',
  'the wheel handler', 'the paint pass', 'the layout budget', 'that migration',
  'the row estimate', 'the request guard', 'the diff', 'the frame loop',
]
const VERBS = [
  'drifts whenever', 'holds as long as', 'breaks once', 'settles after',
  'only matters while', 'gets rebuilt when', 'stays cheap until', 'falls apart if',
]
const OBJECTS = [
  'a page lands mid gesture', 'the viewport overflows', 'two commits collapse into one',
  'the cache evicts from the far end', 'a row is measured for the first time',
  'the user scrolls faster than the network', 'heights are still estimates',
  'the anchor names a different message', 'nothing is mounted above',
]
const TAILS = [
  'so keep the two apart.', 'which is the whole reason for the guard.',
  'and that is fine.', 'though it rarely shows on a fast machine.',
  'and the test asserts exactly that.', 'so measure before changing it.',
  '', '', 'which nobody notices until production.',
]

function sentence(random: () => number) {
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)]!
  const tail = pick(TAILS)
  return `${pick(SUBJECTS)} ${pick(VERBS)} ${pick(OBJECTS)}${tail ? `, ${tail}` : '.'}`
}

const TITLE_TAILS = [
  'in practice', 'after a splice', 'under load', 'on a slow network',
  'revisited', 'and the anchor', 'explained', 'one more time',
]

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Built from whole words. Slicing a sentence to N chars cuts mid-word. */
function heading(random: () => number) {
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)]!
  return capitalize(`${pick(SUBJECTS)} ${pick(TITLE_TAILS)}`)
}

function paragraph(random: () => number) {
  const count = 1 + Math.floor(random() * 4)
  return capitalize(
    Array.from({ length: count }, () => sentence(random)).join(' ')
  )
}

/**
 * Heights must vary a lot. A list of near-identical rows hides both the
 * estimate-then-measure path and the anchor bug this example exists to show.
 */
function messageSource(index: number, count: number) {
  const random = seededRandom(index + 1)
  const target = (index * 7 + 13) % count
  const link = `[Open message ${String(target).padStart(3, '0')}](/messages/${messageId(target)})`
  const kind = Math.floor(random() * 6)

  if (kind === 0) {
    const rows = 2 + Math.floor(random() * 4)
    const body = Array.from(
      { length: rows },
      () => `| ${capitalize(SUBJECTS[Math.floor(random() * SUBJECTS.length)]!)} | ${Math.floor(random() * 900)} | ${random() > 0.5 ? 'bounded' : 'viewport'} |`
    ).join('\n')
    return dedent`
      ### ${heading(random)}

      | Concern | Rows | Cost |
      |:--------|-----:|:-----|
      ${body}

      ${link}
    `
  }

  if (kind === 1) {
    const lines = Array.from(
      { length: 1 + Math.floor(random() * 4) },
      (_, line) => `const page${line} = await fetchMessages({ ${random() > 0.5 ? 'before' : 'after'}: '${messageId(Math.floor(random() * count))}' })`
    ).join('\n')
    return dedent`
      ${paragraph(random)}

      \`\`\`ts
      ${lines}
      \`\`\`

      ${link}
    `
  }

  if (kind === 2) {
    const bullets = Array.from(
      { length: 2 + Math.floor(random() * 5) },
      () => `- ${capitalize(sentence(random))}`
    ).join('\n')
    return dedent`
      > ${paragraph(random)}

      ${bullets}

      ${link}
    `
  }

  if (kind === 3) {
    return `${capitalize(sentence(random))} ${link}`
  }

  if (kind === 4) {
    const blocks = Array.from({ length: 1 + Math.floor(random() * 3) }, () => paragraph(random))
    return dedent`
      ## ${heading(random)}

      ${blocks.join('\n\n')}

      ${link}
    `
  }

  return dedent`
    ${paragraph(random)}

    ${paragraph(random)}

    ${link}
  `
}

export function createFakeMessageApi({
  messageCount = 400,
  pageSize = 12,
  // Slow on purpose. A fast stub hides every ordering bug this example is for.
  delayMs = 1600,
}: {
  messageCount?: number
  pageSize?: number
  delayMs?: number
} = {}): MessageApi {
  const messages = Array.from({ length: messageCount }, (_, index): Message => ({
    id: messageId(index),
    index,
    author: index % 4 === 0 ? 'Tommy' : 'GPUIX',
    time: `${9 + Math.floor(index / 12)}:${String((index * 7) % 60).padStart(2, '0')}`,
    source: messageSource(index, messageCount),
  }))

  const indexOf = (id: string) => messages.findIndex((message) => message.id === id)
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
  const around = (id?: string) => {
    if (!id) return page(messageCount - pageSize, messageCount)
    const index = indexOf(id)
    const start = Math.max(0, Math.min(index - Math.floor(pageSize / 2), messageCount - pageSize))
    return page(start, start + pageSize)
  }

  const requests: MessagePageRequest[] = []
  return {
    requests,
    initialPage: around,
    async fetchPage({ direction, cursor }) {
      requests.push({ direction, cursor })
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      if (direction === 'around') return around(cursor)
      if (direction === 'previous') {
        const end = indexOf(cursor)
        return page(end - pageSize, end)
      }
      const start = indexOf(cursor) + 1
      return page(start, start + pageSize)
    },
  }
}

const MessageRow = memo(function MessageRow({
  message,
  onNavigate,
}: {
  message: Message
  onNavigate: (href: string) => void
}) {
  return (
    <div
      testId={`message-${message.id}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, width: 760, maxWidth: '100%' }}>
        <div
          style={{
            display: 'flex',
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: message.author === 'Tommy' ? C.accent : C.avatar,
          }}
        >
          <text style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>
            {message.author === 'Tommy' ? 'T' : 'G'}
          </text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, gap: 7 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <text style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{message.author}</text>
            <text style={{ color: C.tertiary, fontSize: 12 }}>{message.time}</text>
            <text style={{ color: C.tertiary, fontSize: 11 }}>{message.id}</text>
          </div>
          <SafeMdxContent source={message.source} onLinkClick={onNavigate} />
        </div>
      </div>
    </div>
  )
})

/**
 * The empty edge. It is a normal virtual row, so scrolling into it is a normal
 * scroll and the reader sees the void while the request runs. It stays mounted
 * for as long as the cursor exists, and disappears only at the true end of the
 * history, which is how the reader learns there is nothing more.
 */
const EdgeRow = memo(function EdgeRow({
  side,
  loading,
}: {
  side: 'previous' | 'next'
  loading: boolean
}) {
  return (
    <div
      testId={`edge-${side}`}
      style={{
        display: 'flex',
        height: EDGE_HEIGHT,
        width: '100%',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <text style={{ color: loading ? C.tertiary : '#3A3A3A', fontSize: 12 }}>
        {loading ? 'Loading older messages…' : '·'}
      </text>
    </div>
  )
})

/**
 * The list lives behind `memo` so chrome state never remaps every retained row.
 */
const Transcript = memo(function Transcript({
  messages,
  hasPrevious,
  hasNext,
  loading,
  listRef,
  onNavigate,
  onVisibleRange,
}: {
  messages: Message[]
  hasPrevious: boolean
  hasNext: boolean
  loading: 'previous' | 'next' | 'route' | null
  listRef: React.Ref<PublicInstance>
  onNavigate: (href: string) => void
  onVisibleRange: (event: EventPayload) => void
}) {
  return (
    <virtual-list
      ref={listRef}
      alignment="bottom"
      estimatedItemHeight={150}
      // Small on purpose. A large overdraw builds the edge row long before it
      // is on screen, so the request would start while the reader still has
      // content in front of them.
      overdraw={0}
      onVisibleRange={onVisibleRange}
      style={{ width: '100%', height: '100%' }}
    >
      {hasPrevious && (
        <EdgeRow key="edge-previous" side="previous" loading={loading === 'previous'} />
      )}
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} onNavigate={onNavigate} />
      ))}
      {hasNext && <EdgeRow key="edge-next" side="next" loading={loading === 'next'} />}
    </virtual-list>
  )
})

function withPage({
  current,
  incoming,
  direction,
}: {
  current: MessagePage[]
  incoming: MessagePage
  direction: 'previous' | 'next'
}) {
  const known = new Set(current.flatMap((page) => page.items.map((message) => message.id)))
  const items = incoming.items.filter((message) => !known.has(message.id))
  if (items.length === 0) return current
  const nextPage = { ...incoming, items }
  return direction === 'previous' ? [nextPage, ...current] : [...current, nextPage]
}

function evictFarPage({
  current,
  direction,
}: {
  current: MessagePage[]
  direction: 'previous' | 'next'
}) {
  if (current.length <= PAGE_CACHE_SIZE) return current
  return direction === 'previous'
    ? current.slice(0, PAGE_CACHE_SIZE)
    : current.slice(-PAGE_CACHE_SIZE)
}

export function InfiniteChatApp({
  api = createFakeMessageApi(),
  initialMessageId,
}: {
  api?: MessageApi
  initialMessageId?: string
} = {}) {
  const [pages, setPages] = useState(() => [api.initialPage(initialMessageId)])
  const [route, setRoute] = useState(
    initialMessageId ? `/messages/${initialMessageId}` : '/messages/latest'
  )
  const [loading, setLoading] = useState<'previous' | 'next' | 'route' | null>(null)
  const pending = useRef(false)
  const listRef = useRef<PublicInstance | null>(null)
  const { renderer } = useGpuix()
  // A new array on every chrome render would defeat `memo(Transcript)`.
  const messages = useMemo(() => pages.flatMap((page) => page.items), [pages])
  const before = pages[0]?.before ?? null
  const after = pages[pages.length - 1]?.after ?? null

  const loadPage = useCallback(
    async (direction: 'previous' | 'next') => {
      const cursor = direction === 'previous' ? before : after
      if (!cursor || pending.current) return
      pending.current = true
      setLoading(direction)
      // For `previous`, the message just under the void: the one the reader
      // keeps seeing while they wait there.
      const anchorId = messages[0]?.id
      // Row index of the bottom void, in the pre-fetch child list.
      const edgeNextRow = (before ? 1 : 0) + messages.length
      const page = await api.fetchPage({ direction, cursor })
      const inserted = withPage({ current: pages, incoming: page, direction })

      // Where is the reader NOW? They kept scrolling while the request ran.
      // gpui anchors a list on the item at the viewport top, and while the
      // reader waits in the void that item IS the void: the splice would keep
      // the void pixel-fixed and replace the screen around it. Only the app
      // knows the void stands for the content that just arrived, so it reads
      // the anchor here and re-anchors after the commit.
      const listId = listRef.current?.id
      const top = listId != null ? renderer?.getListScrollTop?.(listId) : null

      // TWO commits, never one. `VirtualListEntry::sync` turns the child ids
      // into a single contiguous splice, so an insert at one end and an evict
      // at the other end share no prefix and no suffix: the list is respliced
      // whole, every measured height is discarded, and the anchor index ends
      // up naming a different message. Splitting them keeps each commit a pure
      // insert or a pure remove.
      flushSync(() => {
        setPages(inserted)
        setLoading(null)
      })
      const settled = evictFarPage({ current: inserted, direction })
      flushSync(() => setPages(settled))
      pending.current = false

      // When the anchor is a message row, gpui's splice already shifts its
      // index and the reader does not move a pixel. Nothing to do.
      if (inserted === pages || listId == null || !top) return
      const [anchorIndex = 0, offsetInItem = 0, viewportHeight = 0] = top
      const settledMessages = settled.flatMap((entry) => entry.items)
      const leadingEdge = settled[0]?.before ? 1 : 0

      if (direction === 'previous' && anchorIndex === 0 && anchorId) {
        // The reader waits in the top void. Keep the message that was under it
        // at the same pixel: it sat EDGE_HEIGHT - offsetInItem below the
        // viewport top, so anchor on it with that as a negative offset. gpui
        // resolves the offset by measuring the freshly inserted rows above it,
        // which is what makes the restore exact rather than estimate-based.
        const index = settledMessages.findIndex((message) => message.id === anchorId)
        if (index >= 0) {
          renderer?.scrollToItem?.(listId, index + leadingEdge, offsetInItem - EDGE_HEIGHT)
        }
      } else if (direction === 'next' && anchorIndex >= edgeNextRow) {
        // The reader waits at or inside the bottom void. The new page takes
        // the void's place, so pin the void's OLD top edge: anchor the first
        // new message where the void began. Without this the messages above
        // are pushed up (or, resting at gpui's at-end sentinel, the view snaps
        // to the bottom of the new void) and the screen jumps.
        //
        // `anchorIndex > edgeNextRow` is the at-end sentinel: the viewport
        // BOTTOM sits on the void's bottom, so the void's top is
        // viewport - EDGE_HEIGHT below the viewport top. A negative offset
        // lets gpui measure the rows above to resolve that exactly. Inside
        // the void (window shorter than the void), the viewport top is
        // offsetInItem past the void's top instead.
        const offset =
          anchorIndex > edgeNextRow ? EDGE_HEIGHT - viewportHeight : offsetInItem
        const appended = inserted[inserted.length - 1]
        const index = settledMessages.findIndex(
          (message) => message.id === appended?.items[0]?.id
        )
        if (index >= 0) renderer?.scrollToItem?.(listId, index + leadingEdge, offset)
      }
    },
    [after, api, before, messages, pages, renderer]
  )

  const navigate = useCallback(
    async (href: string) => {
      const target = href.match(/^\/messages\/(message-\d+)$/)?.[1]
      if (!target || pending.current) return
      pending.current = true
      setLoading('route')
      const page = await api.fetchPage({ direction: 'around', cursor: target })
      flushSync(() => {
        setPages([page])
        setRoute(href)
        setLoading(null)
      })
      pending.current = false
      const index = page.items.findIndex((message) => message.id === target)
      const id = listRef.current?.id
      // +1 for the leading edge row, which exists whenever there is history above.
      if (id != null && index >= 0) renderer?.scrollToItem?.(id, index + (page.before ? 1 : 0))
    },
    [api, renderer]
  )

  const handleVisibleRange = useCallback(
    (event: EventPayload) => {
      const start = Math.floor(event.startIndex ?? 0)
      const end = Math.ceil(event.endIndex ?? start + 1)
      const rowCount = messages.length + (before ? 1 : 0) + (after ? 1 : 0)
      // Only the edge row itself triggers a fetch. No threshold, no prefetch:
      // the reader reaches the empty space first and waits there, which is what
      // a real client does on a slow connection.
      if (before && start === 0) {
        void loadPage('previous')
      } else if (after && end >= rowCount) {
        void loadPage('next')
      }
    },
    [after, before, loadPage, messages.length]
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: C.canvas,
        color: C.text,
        fontFamily: FONT_SANS,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 50,
          flexShrink: 0,
          paddingLeft: 24,
          paddingRight: 24,
          borderBottomWidth: 1,
          borderColor: C.border,
        }}
      >
        <text style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Infinite history</text>
        <text style={{ color: C.secondary, fontSize: 12 }}>{route}</text>
      </div>

      <div style={{ display: 'flex', flexGrow: 1, minHeight: 0, position: 'relative' }}>
        <Transcript
          messages={messages}
          hasPrevious={before != null}
          hasNext={after != null}
          loading={loading}
          listRef={listRef}
          onNavigate={navigate}
          onVisibleRange={handleVisibleRange}
        />

        {loading === 'route' && (
          <div
            testId="loading-route"
            style={{
              position: 'absolute',
              top: 12,
              left: 0,
              right: 0,
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
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
        )}
      </div>
    </div>
  )
}

const isEntryPoint =
  typeof Bun !== 'undefined'
    ? Bun.isStandaloneExecutable || Bun.main === import.meta.path
    : typeof process !== 'undefined' && process.argv[1]?.endsWith('infinite-chat.tsx')

if (isEntryPoint) {
  applyMacCpuThrottleFromEnv()
  render(<InfiniteChatApp />, {
    title: 'GPUIX Infinite History',
    width: 920,
    height: 760,
    titlebarTransparent: true,
    windowBackground: C.canvas,
    debugFrameOverlay: 'full',
    // Agent checks need real GPU paint, not control of the user's keyboard.
    focus: process.env.GPUIX_BACKGROUND !== '1',
  })
}
