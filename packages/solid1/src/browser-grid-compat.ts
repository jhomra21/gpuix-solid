import type { StyleDesc } from "./host/types.js"

export type BrowserGridTrack =
  | { kind: "fraction"; fraction: number; minSize: number }
  | { kind: "fixed"; size: number; minSize: number; maxSize: number; flexShrink: number }

export type BrowserGridPlacement = {
  column: number
  row: number
  columnSpan: number
  rowSpan: number
}

export type BrowserGridItem = {
  columnSpan?: number | "full"
  rowSpan?: number | "full"
}

export function parseBrowserGridTemplateColumns(value: string | undefined): BrowserGridTrack[] | undefined {
  return parseBrowserGridTemplate(value)
}

export function parseBrowserGridTemplateRows(value: string | undefined): BrowserGridTrack[] | undefined {
  return parseBrowserGridTemplate(value)
}

export function browserGridContainerStyle(
  columns: readonly BrowserGridTrack[] | undefined,
  rows?: readonly BrowserGridTrack[] | undefined,
): StyleDesc | undefined {
  if (!columns) return undefined
  if (rows) return { position: "relative" }
  return { display: "flex", flexDirection: "row" }
}

export function browserGridItemStyle(
  tracks: readonly BrowserGridTrack[] | undefined,
  index: number | undefined,
): StyleDesc | undefined {
  if (!tracks || index === undefined || index < 1) return undefined
  const track = tracks[index - 1]
  if (!track) return undefined
  if (track.kind === "fraction") {
    return {
      minWidth: track.minSize,
      flexGrow: track.fraction,
      flexShrink: 1,
      flexBasis: 0,
    }
  }
  return {
    width: track.size,
    minWidth: track.minSize,
    maxWidth: track.maxSize,
    flexGrow: 0,
    flexShrink: track.flexShrink,
    flexBasis: track.size,
  }
}

export function placeBrowserGridItems(
  columns: readonly BrowserGridTrack[],
  rows: readonly BrowserGridTrack[],
  items: readonly BrowserGridItem[],
): BrowserGridPlacement[] | undefined {
  if (columns.length === 0 || rows.length === 0) return undefined
  const occupied = Array.from({ length: rows.length }, () => Array<boolean>(columns.length).fill(false))
  const placements: BrowserGridPlacement[] = []

  for (const item of items) {
    const columnSpan = item.columnSpan === "full"
      ? columns.length
      : Math.max(1, Math.min(columns.length, Math.floor(item.columnSpan ?? 1)))
    const rowSpan = item.rowSpan === "full"
      ? rows.length
      : Math.max(1, Math.min(rows.length, Math.floor(item.rowSpan ?? 1)))

    let placement: BrowserGridPlacement | undefined
    for (let row = 0; row <= rows.length - rowSpan && !placement; row++) {
      for (let column = 0; column <= columns.length - columnSpan; column++) {
        let available = true
        for (let y = row; y < row + rowSpan && available; y++) {
          for (let x = column; x < column + columnSpan; x++) {
            if (occupied[y]?.[x]) {
              available = false
              break
            }
          }
        }
        if (!available) continue
        placement = { column, row, columnSpan, rowSpan }
        break
      }
    }

    if (!placement) return undefined
    for (let y = placement.row; y < placement.row + placement.rowSpan; y++) {
      for (let x = placement.column; x < placement.column + placement.columnSpan; x++) {
        if (occupied[y]) occupied[y][x] = true
      }
    }
    placements.push(placement)
  }

  return placements
}

export function browserGrid2DItemStyle(
  columns: readonly BrowserGridTrack[],
  rows: readonly BrowserGridTrack[],
  placement: BrowserGridPlacement,
  availableWidth: number,
  availableHeight: number,
  offsetLeft = 0,
  offsetTop = 0,
): StyleDesc | undefined {
  const columnSizes = resolveBrowserGridTrackSizes(columns, availableWidth)
  const rowSizes = resolveBrowserGridTrackSizes(rows, availableHeight)
  if (!columnSizes || !rowSizes) return undefined

  const left = offsetLeft + sumTrackSizes(columnSizes, 0, placement.column)
  const top = offsetTop + sumTrackSizes(rowSizes, 0, placement.row)
  const width = sumTrackSizes(columnSizes, placement.column, placement.columnSpan)
  const height = sumTrackSizes(rowSizes, placement.row, placement.rowSpan)

  return {
    position: "absolute",
    left,
    top,
    width,
    height,
  }
}

export function resolveBrowserGridTrackSizes(
  tracks: readonly BrowserGridTrack[],
  availableSize: number,
): number[] | undefined {
  if (!Number.isFinite(availableSize) || availableSize < 0 || tracks.length === 0) return undefined

  let fixed = 0
  let fractionalMinimum = 0
  let fractionTotal = 0
  for (const track of tracks) {
    if (track.kind === "fixed") fixed += track.size
    else {
      fractionalMinimum += track.minSize
      fractionTotal += track.fraction
    }
  }

  const distributable = Math.max(0, availableSize - fixed - fractionalMinimum)
  return tracks.map((track) => {
    if (track.kind === "fixed") return track.size
    return track.minSize + (fractionTotal > 0 ? distributable * track.fraction / fractionTotal : 0)
  })
}

function parseBrowserGridTemplate(value: string | undefined): BrowserGridTrack[] | undefined {
  if (value === undefined) return undefined
  const tokens = splitTopLevelWhitespace(value.trim())
  if (tokens.length === 0) return undefined
  const tracks: BrowserGridTrack[] = []
  for (const token of tokens) {
    const track = parseBrowserGridTrack(token)
    if (!track) return undefined
    tracks.push(track)
  }
  return tracks
}

function parseBrowserGridTrack(token: string): BrowserGridTrack | undefined {
  const fraction = parseFraction(token)
  if (fraction !== undefined) return { kind: "fraction", fraction, minSize: 0 }

  const fixed = parseLength(token)
  if (fixed !== undefined) {
    return { kind: "fixed", size: fixed, minSize: fixed, maxSize: fixed, flexShrink: 0 }
  }

  const minmax = token.match(/^minmax\((.*)\)$/i)
  if (!minmax) return undefined
  const parts = splitTopLevelComma(minmax[1] ?? "")
  if (parts.length !== 2) return undefined
  const min = parseLength(parts[0] ?? "")
  if (min === undefined) return undefined
  const maxFraction = parseFraction(parts[1] ?? "")
  if (maxFraction !== undefined) return { kind: "fraction", fraction: maxFraction, minSize: min }
  const max = parseLength(parts[1] ?? "")
  if (max === undefined || max < min) return undefined
  return { kind: "fixed", size: max, minSize: min, maxSize: max, flexShrink: 1 }
}

function parseFraction(value: string): number | undefined {
  const match = value.trim().match(/^((?:\d+(?:\.\d+)?|\.\d+))fr$/i)
  if (!match) return undefined
  const fraction = Number(match[1])
  return Number.isFinite(fraction) && fraction > 0 ? fraction : undefined
}

function parseLength(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === "0") return 0
  const pixel = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/i)
  if (pixel) return Number(pixel[1])
  const rem = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))rem$/i)
  if (rem) return Number(rem[1]) * 16
  return undefined
}

function sumTrackSizes(sizes: readonly number[], start: number, count: number): number {
  let total = 0
  const end = Math.min(sizes.length, start + count)
  for (let index = start; index < end; index++) total += sizes[index] ?? 0
  return total
}

function splitTopLevelWhitespace(value: string): string[] {
  const tokens: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < value.length; index++) {
    const character = value[index]
    if (character === "(") depth++
    else if (character === ")") depth--
    else if (/\s/.test(character ?? "") && depth === 0) {
      const token = value.slice(start, index).trim()
      if (token) tokens.push(token)
      start = index + 1
    }
  }
  const token = value.slice(start).trim()
  if (token) tokens.push(token)
  return tokens
}

function splitTopLevelComma(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < value.length; index++) {
    const character = value[index]
    if (character === "(") depth++
    else if (character === ")") depth--
    else if (character === "," && depth === 0) {
      parts.push(value.slice(start, index).trim())
      start = index + 1
    }
  }
  parts.push(value.slice(start).trim())
  return parts
}
