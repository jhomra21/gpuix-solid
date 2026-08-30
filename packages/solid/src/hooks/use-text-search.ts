import { createMemo, createSignal } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { HighlightSpec, HostProps } from "../host/types.js"

export interface TextSearchOptions {
  query: string
  caseSensitive?: boolean
  wholeWord?: boolean
  color?: string
  activeColor?: string
  radius?: number
  matches?: { total: number; indexOffset: number }
}

export interface TextSearch {
  props: Pick<HostProps, "highlight" | "onHighlight">
  readonly total: number
  readonly active: number
  next(): void
  previous(): void
  goTo(index: number): void
}

/** Drive native text highlighting with Solid-owned find-bar state. */
export function useTextSearch(options: TextSearchOptions): TextSearch {
  const [reported, setReported] = createSignal(0)
  const [requested, setRequested] = createSignal(0)

  const total = createMemo(() => options.query.length === 0 ? 0 : (options.matches?.total ?? reported()))
  const active = createMemo(() => {
    const count = total()
    return count === 0 ? 0 : Math.min(requested(), count - 1)
  })
  const highlight = createMemo<HighlightSpec | null>(() => {
    if (options.query.length === 0) return null
    return {
      query: options.query,
      caseSensitive: options.caseSensitive,
      wholeWord: options.wholeWord,
      color: options.color,
      activeColor: options.activeColor,
      radius: options.radius,
      activeIndex: active(),
      matchIndexOffset: options.matches?.indexOffset,
    }
  })

  const onHighlight = (event: EventPayload): void => {
    setReported(event.matchCount ?? 0)
  }

  const goTo = (index: number): void => {
    const count = total()
    if (index < 0 || index >= count) return
    setRequested(index)
  }
  const next = (): void => {
    const count = total()
    if (count === 0) return
    setRequested((current) => (Math.min(current, count - 1) + 1) % count)
  }
  const previous = (): void => {
    const count = total()
    if (count === 0) return
    setRequested((current) => (Math.min(current, count - 1) + count - 1) % count)
  }

  return {
    props: {
      get highlight() {
        return highlight()
      },
      onHighlight,
    },
    get total() {
      return total()
    },
    get active() {
      return active()
    },
    next,
    previous,
    goTo,
  }
}

export interface FindRangesOptions {
  text: string
  query: string
  caseSensitive?: boolean
  wholeWord?: boolean
}

const WORD_CHAR = /[\p{Alphabetic}\p{N}_]/u

function wordCharBefore(text: string, end: number): boolean {
  if (end <= 0) return false
  const low = text.charCodeAt(end - 1)
  const start = low >= 0xdc00 && low <= 0xdfff && end >= 2 ? end - 2 : end - 1
  return WORD_CHAR.test(text.slice(start, end))
}

function wordCharAt(text: string, start: number): boolean {
  if (start >= text.length) return false
  const codePoint = text.codePointAt(start)
  if (codePoint === undefined) return false
  return WORD_CHAR.test(String.fromCodePoint(codePoint))
}

function fold(text: string): { folded: string; map: number[] } {
  let folded = ""
  const map: number[] = []
  for (let index = 0; index < text.length;) {
    const codePoint = text.codePointAt(index)
    const char = String.fromCodePoint(codePoint ?? 0)
    const lower = char.toLowerCase()
    for (let unit = 0; unit < lower.length; unit++) map.push(index)
    folded += lower
    index += char.length
  }
  map.push(text.length)
  return { folded, map }
}

/**
 * Return non-overlapping UTF-16 ranges using the same matching contract as
 * GPUIX native text search.
 */
export function findRanges(options: FindRangesOptions): Array<[number, number]> {
  const { text, query, caseSensitive = false, wholeWord = false } = options
  if (query.length === 0) return []

  const { folded, map } = caseSensitive ? { folded: text, map: null } : fold(text)
  const needle = caseSensitive ? query : query.toLowerCase()

  const out: Array<[number, number]> = []
  let from = 0
  for (;;) {
    const at = folded.indexOf(needle, from)
    if (at === -1) break
    from = at + needle.length
    const start = map ? map[at]! : at
    const end = map ? map[from]! : from
    if (start >= end) continue
    if (wholeWord && (wordCharBefore(text, start) || wordCharAt(text, end))) continue
    out.push([start, end])
  }
  return out
}
