import type { StyleDesc } from "./host/types.js"

export type BrowserGridTrack =
  | { kind: "fraction"; fraction: number; minWidth: number }
  | { kind: "fixed"; width: number; minWidth: number; maxWidth: number; flexShrink: number }

export function parseBrowserGridTemplateColumns(value: unknown): BrowserGridTrack[] | undefined {
  if (typeof value !== "string") return undefined
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

export function browserGridContainerStyle(tracks: readonly BrowserGridTrack[] | undefined): StyleDesc | undefined {
  if (!tracks) return undefined
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
      minWidth: track.minWidth,
      flexGrow: track.fraction,
      flexShrink: 1,
      flexBasis: 0,
    }
  }
  return {
    width: track.width,
    minWidth: track.minWidth,
    maxWidth: track.maxWidth,
    flexGrow: 0,
    flexShrink: track.flexShrink,
    flexBasis: track.width,
  }
}

function parseBrowserGridTrack(token: string): BrowserGridTrack | undefined {
  const fraction = parseFraction(token)
  if (fraction !== undefined) return { kind: "fraction", fraction, minWidth: 0 }

  const fixed = parseLength(token)
  if (fixed !== undefined) {
    return { kind: "fixed", width: fixed, minWidth: fixed, maxWidth: fixed, flexShrink: 0 }
  }

  const minmax = token.match(/^minmax\((.*)\)$/i)
  if (!minmax) return undefined
  const parts = splitTopLevelComma(minmax[1] ?? "")
  if (parts.length !== 2) return undefined
  const min = parseLength(parts[0] ?? "")
  if (min === undefined) return undefined
  const maxFraction = parseFraction(parts[1] ?? "")
  if (maxFraction !== undefined) return { kind: "fraction", fraction: maxFraction, minWidth: min }
  const max = parseLength(parts[1] ?? "")
  if (max === undefined || max < min) return undefined
  return { kind: "fixed", width: max, minWidth: min, maxWidth: max, flexShrink: 1 }
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
