/**
 * Solid 2 port of the published GPUIX Diff Viewer example.
 *
 * Upstream: remorses/gpuix@322993e examples/diff.tsx
 * Layout, colors, syntax highlighting, word diffing, and split/unified views
 * intentionally follow the published React example.
 */

import { diffWords, type StructuredPatchHunk as Hunk } from "diff"
import { For, Show, type Element as SolidElement } from "solid-js"
import {
  createHighlighter,
  type BundledLanguage,
  type GrammarState,
  type ThemedToken,
} from "shiki"

export const UNCHANGED_CODE_BG = "rgba(15, 15, 15, 1)"
const ADDED_BG = "rgba(100, 250, 120, 0.047)"
const REMOVED_BG = "rgba(255, 0, 0, 0.125)"
const LINE_NUMBER_BG = "rgba(5, 5, 5, 1)"
const REMOVED_LINE_NUMBER_BG = "rgba(60, 0, 0, 1)"
const ADDED_LINE_NUMBER_BG = "rgba(0, 50, 0, 1)"
const LINE_NUMBER_FG_BRIGHT = "#ffffff"
const LINE_NUMBER_FG_DIM = "#6c7086"
const WORD_REMOVED_BG = "rgba(255, 50, 50, 0.39)"
const WORD_ADDED_BG = "rgba(0, 200, 0, 0.39)"
const CODE_FG = "#e6edf3"
const SEPARATOR_FG = "#6c7086"
const theme = "github-dark-default"

const highlighter = await createHighlighter({
  themes: [theme],
  langs: [
    "javascript",
    "typescript",
    "tsx",
    "jsx",
    "json",
    "markdown",
    "html",
    "css",
    "python",
    "rust",
    "go",
    "java",
    "c",
    "cpp",
    "yaml",
    "toml",
    "bash",
    "sh",
    "sql",
  ],
})

function detectLanguage(filePath: string): BundledLanguage {
  const ext = filePath.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "ts":
      return "typescript"
    case "tsx":
      return "tsx"
    case "jsx":
      return "jsx"
    case "js":
    case "mjs":
    case "cjs":
      return "javascript"
    case "json":
      return "json"
    case "md":
    case "mdx":
    case "markdown":
      return "markdown"
    case "html":
    case "htm":
      return "html"
    case "css":
      return "css"
    case "py":
      return "python"
    case "rs":
      return "rust"
    case "go":
      return "go"
    case "java":
      return "java"
    case "c":
    case "h":
      return "c"
    case "cpp":
    case "cc":
    case "cxx":
    case "hpp":
    case "hxx":
      return "cpp"
    case "yaml":
    case "yml":
      return "yaml"
    case "toml":
      return "toml"
    case "sh":
      return "sh"
    case "bash":
      return "bash"
    case "sql":
      return "sql"
    default:
      return "javascript"
  }
}

function levenshteinDistance(left: string, right: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= left.length; i++) matrix[i] = [i]
  for (let j = 0; j <= right.length; j++) matrix[0]![j] = j
  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      )
    }
  }
  return matrix[left.length]![right.length]!
}

function calculateSimilarity(left: string, right: string): number {
  const longer = left.length > right.length ? left : right
  const shorter = left.length > right.length ? right : left
  if (longer.length === 0) return 1
  return (longer.length - levenshteinDistance(longer, shorter)) / longer.length
}

function tokenizeLine(
  code: string,
  lang: BundledLanguage,
  grammarState: GrammarState | undefined,
) {
  if (grammarState === undefined) {
    return highlighter.codeToTokens(code, { lang, theme })
  }
  return highlighter.codeToTokens(code, { lang, theme, grammarState })
}

function HighlightedTokens(props: { tokens: ThemedToken[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <For each={props.tokens}>
        {(token) => (
          <text style={{ color: token.color || CODE_FG, whiteSpace: "nowrap" }}>
            {token.content}
          </text>
        )}
      </For>
    </div>
  )
}

function WordDiffTokens(props: {
  parts: ReturnType<typeof diffWords>
  mode: "remove" | "add"
}) {
  const highlightBg = props.mode === "remove" ? WORD_REMOVED_BG : WORD_ADDED_BG
  const visibleParts = () => props.parts.filter((part) => {
    if (props.mode === "remove" && part.added) return false
    if (props.mode === "add" && part.removed) return false
    return true
  })

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <For each={visibleParts()}>
        {(part) => {
          const highlighted =
            (props.mode === "remove" && part.removed === true) ||
            (props.mode === "add" && part.added === true)
          const style = highlighted
            ? { color: CODE_FG, whiteSpace: "nowrap" as const, backgroundColor: highlightBg }
            : { color: CODE_FG, whiteSpace: "nowrap" as const }
          return <text style={style}>{part.value}</text>
        }}
      </For>
    </div>
  )
}

function LineNumberGutter(props: {
  lineNumber: string
  type: string
  maxWidth: number
}) {
  const backgroundColor =
    props.type === "add"
      ? ADDED_LINE_NUMBER_BG
      : props.type === "remove"
        ? REMOVED_LINE_NUMBER_BG
        : LINE_NUMBER_BG
  const color =
    props.type === "add" || props.type === "remove"
      ? LINE_NUMBER_FG_BRIGHT
      : LINE_NUMBER_FG_DIM

  return (
    <div style={{ flexShrink: 0, alignSelf: "stretch", backgroundColor }}>
      <text style={{ color, whiteSpace: "nowrap", fontSize: 13 }}>
        {` ${props.lineNumber.padStart(props.maxWidth)} `}
      </text>
    </div>
  )
}

interface DiffLineData {
  code: SolidElement
  type: string
  oldLineNumber: string
  newLineNumber: string
  pairedWith: number | undefined
  key: string
}

interface LinePair {
  remove: number
  add: number
}

function processHunkLines(
  lines: string[],
  oldStart: number,
  filePath: string,
): DiffLineData[] {
  const processedLines = lines.map((code) => {
    if (code.startsWith("+")) return { code: code.slice(1), type: "add" as const }
    if (code.startsWith("-")) return { code: code.slice(1), type: "remove" as const }
    return { code: code.slice(1), type: "nochange" as const }
  })
  const lang = detectLanguage(filePath)

  let beforeState: GrammarState | undefined
  const beforeTokens: Array<ThemedToken[] | null> = []
  for (const line of processedLines) {
    if (line.type === "remove" || line.type === "nochange") {
      const result = tokenizeLine(line.code, lang, beforeState)
      beforeTokens.push(result.tokens[0] || null)
      beforeState = highlighter.getLastGrammarState(result.tokens)
    } else {
      beforeTokens.push(null)
    }
  }

  let afterState: GrammarState | undefined
  const afterTokens: Array<ThemedToken[] | null> = []
  for (const line of processedLines) {
    if (line.type === "add" || line.type === "nochange") {
      const result = tokenizeLine(line.code, lang, afterState)
      afterTokens.push(result.tokens[0] || null)
      afterState = highlighter.getLastGrammarState(result.tokens)
    } else {
      afterTokens.push(null)
    }
  }

  const linePairs: LinePair[] = []
  if (
    processedLines.some((line) => line.type === "remove") &&
    processedLines.some((line) => line.type === "add")
  ) {
    let i = 0
    while (i < processedLines.length) {
      if (processedLines[i]?.type !== "remove") {
        i++
        continue
      }

      const removes: number[] = []
      let j = i
      while (j < processedLines.length && processedLines[j]?.type === "remove") {
        removes.push(j)
        j++
      }
      const adds: number[] = []
      while (j < processedLines.length && processedLines[j]?.type === "add") {
        adds.push(j)
        j++
      }
      const pairCount = Math.min(removes.length, adds.length)
      for (let k = 0; k < pairCount; k++) {
        linePairs.push({ remove: removes[k]!, add: adds[k]! })
      }
      i = j
    }
  }

  let oldLineNumber = oldStart
  let newLineNumber = oldStart
  const result: Array<{
    code: SolidElement
    type: string
    oldLineNumber: number
    newLineNumber: number
    pairedWith: number | undefined
  }> = []

  for (let i = 0; i < processedLines.length; i++) {
    const line = processedLines[i]
    if (!line) continue
    const { code, type } = line
    const pair = linePairs.find((candidate) => candidate.remove === i || candidate.add === i)

    if (pair?.remove === i) {
      const addedLine = processedLines[pair.add]
      if (!addedLine) continue
      const similarity = calculateSimilarity(code, addedLine.code)
      const tokens = beforeTokens[i]
      result.push({
        code:
          similarity < 0.5
            ? tokens
              ? <HighlightedTokens tokens={tokens} />
              : <text style={{ color: CODE_FG, whiteSpace: "nowrap" }}>{code}</text>
            : <WordDiffTokens parts={diffWords(code, addedLine.code)} mode="remove" />,
        type,
        oldLineNumber,
        newLineNumber,
        pairedWith: pair.add,
      })
      oldLineNumber++
      continue
    }

    if (pair?.add === i) {
      const removedLine = processedLines[pair.remove]
      if (!removedLine) continue
      const similarity = calculateSimilarity(removedLine.code, code)
      const tokens = afterTokens[i]
      result.push({
        code:
          similarity < 0.5
            ? tokens
              ? <HighlightedTokens tokens={tokens} />
              : <text style={{ color: CODE_FG, whiteSpace: "nowrap" }}>{code}</text>
            : <WordDiffTokens parts={diffWords(removedLine.code, code)} mode="add" />,
        type,
        oldLineNumber,
        newLineNumber,
        pairedWith: pair.remove,
      })
      newLineNumber++
      continue
    }

    const tokens =
      type === "remove"
        ? beforeTokens[i]
        : type === "add"
          ? afterTokens[i]
          : beforeTokens[i] || afterTokens[i]
    result.push({
      code:
        tokens && tokens.length > 0
          ? <HighlightedTokens tokens={tokens} />
          : <text style={{ color: CODE_FG, whiteSpace: "nowrap" }}>{code}</text>,
      type,
      oldLineNumber,
      newLineNumber,
      pairedWith: undefined,
    })

    if (type === "remove") oldLineNumber++
    else if (type === "add") newLineNumber++
    else {
      oldLineNumber++
      newLineNumber++
    }
  }

  return result.map((line, index) => ({
    code: line.code,
    type: line.type,
    oldLineNumber: line.oldLineNumber.toString(),
    newLineNumber: line.newLineNumber.toString(),
    pairedWith: line.pairedWith,
    key: `line-${index}`,
  }))
}

function UnifiedView(props: { diff: DiffLineData[]; maxWidth: number }) {
  return (
    <For each={props.diff}>
      {(line) => {
        const lineNumber =
          line.newLineNumber && line.newLineNumber !== "0"
            ? line.newLineNumber.padStart(props.maxWidth)
            : " ".repeat(props.maxWidth)
        const backgroundColor =
          line.type === "add"
            ? ADDED_BG
            : line.type === "remove"
              ? REMOVED_BG
              : UNCHANGED_CODE_BG
        return (
          <div style={{ display: "flex", flexDirection: "row" }}>
            <LineNumberGutter
              lineNumber={lineNumber}
              type={line.type}
              maxWidth={props.maxWidth}
            />
            <div style={{ flexGrow: 1, paddingLeft: 4, backgroundColor }}>
              {line.code}
            </div>
          </div>
        )
      }}
    </For>
  )
}

interface SplitLine {
  left: DiffLineData & { lineNumber: string }
  right: DiffLineData & { lineNumber: string }
}

function emptySplitLine(key: string, lineNumber: string): DiffLineData & { lineNumber: string } {
  return {
    lineNumber,
    code: <text>{""}</text>,
    type: "empty",
    oldLineNumber: "",
    newLineNumber: "",
    pairedWith: undefined,
    key,
  }
}

function buildSplitLines(
  diff: DiffLineData[],
  leftMaxWidth: number,
  rightMaxWidth: number,
): SplitLine[] {
  const splitLines: SplitLine[] = []
  const processed = new Set<number>()

  for (let i = 0; i < diff.length; i++) {
    if (processed.has(i)) continue
    const line = diff[i]
    if (!line) continue

    if (line.type === "remove" && line.pairedWith !== undefined) {
      const paired = diff[line.pairedWith]
      if (paired) {
        splitLines.push({
          left: { ...line, lineNumber: line.oldLineNumber.padStart(leftMaxWidth) },
          right: { ...paired, lineNumber: paired.newLineNumber.padStart(rightMaxWidth) },
        })
        processed.add(i)
        processed.add(line.pairedWith)
      }
      continue
    }
    if (line.type === "add" && line.pairedWith !== undefined) continue

    if (line.type === "remove") {
      splitLines.push({
        left: { ...line, lineNumber: line.oldLineNumber.padStart(leftMaxWidth) },
        right: emptySplitLine(`${line.key}-empty-right`, " ".repeat(rightMaxWidth)),
      })
    } else if (line.type === "add") {
      splitLines.push({
        left: emptySplitLine(`${line.key}-empty-left`, " ".repeat(leftMaxWidth)),
        right: { ...line, lineNumber: line.newLineNumber.padStart(rightMaxWidth) },
      })
    } else {
      splitLines.push({
        left: { ...line, lineNumber: line.oldLineNumber.padStart(leftMaxWidth) },
        right: { ...line, lineNumber: line.newLineNumber.padStart(rightMaxWidth) },
      })
    }
    processed.add(i)
  }

  return splitLines
}

function SplitSideGutter(props: { lineNumber: string; type: string }) {
  const backgroundColor =
    props.type === "remove"
      ? REMOVED_LINE_NUMBER_BG
      : props.type === "add"
        ? ADDED_LINE_NUMBER_BG
        : LINE_NUMBER_BG
  const color =
    props.type === "remove" || props.type === "add"
      ? LINE_NUMBER_FG_BRIGHT
      : LINE_NUMBER_FG_DIM
  return (
    <div style={{ flexShrink: 0, alignSelf: "stretch", backgroundColor }}>
      <text style={{ color, whiteSpace: "nowrap", fontSize: 13 }}>
        {` ${props.lineNumber} `}
      </text>
    </div>
  )
}

function SplitSideCode(props: { code: SolidElement; type: string }) {
  const backgroundColor =
    props.type === "remove"
      ? REMOVED_BG
      : props.type === "add"
        ? ADDED_BG
        : UNCHANGED_CODE_BG
  return (
    <div style={{ flexGrow: 1, paddingLeft: 4, minWidth: 0, backgroundColor }}>
      {props.code}
    </div>
  )
}

function SplitView(props: {
  diff: DiffLineData[]
  leftMaxWidth: number
  rightMaxWidth: number
}) {
  const lines = buildSplitLines(props.diff, props.leftMaxWidth, props.rightMaxWidth)
  return (
    <For each={lines}>
      {(line) => (
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div style={{ display: "flex", flexDirection: "row", width: "50%" }}>
            <SplitSideGutter lineNumber={line.left.lineNumber} type={line.left.type} />
            <SplitSideCode code={line.left.code} type={line.left.type} />
          </div>
          <div style={{ display: "flex", flexDirection: "row", width: "50%" }}>
            <SplitSideGutter lineNumber={line.right.lineNumber} type={line.right.type} />
            <SplitSideCode code={line.right.code} type={line.right.type} />
          </div>
        </div>
      )}
    </For>
  )
}

export interface DiffViewerProps {
  hunks: Hunk[]
  filePath?: string
  splitView?: boolean
}

export function DiffViewer(props: DiffViewerProps) {
  if (props.hunks.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <text style={{ color: LINE_NUMBER_FG_DIM }}>No changes</text>
      </div>
    )
  }

  const allLines = props.hunks.flatMap((hunk) => hunk.lines)
  let oldLine = props.hunks[0]?.oldStart || 1
  let newLine = props.hunks[0]?.newStart || 1
  for (const line of allLines) {
    if (line.startsWith("-")) oldLine++
    else if (line.startsWith("+")) newLine++
    else {
      oldLine++
      newLine++
    }
  }
  const leftMaxWidth = Math.max(oldLine.toString().length, 2)
  const rightMaxWidth = Math.max(newLine.toString().length, 2)
  const maxWidth = Math.max(leftMaxWidth, rightMaxWidth)
  const filePath = props.filePath ?? ""

  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: "Menlo", fontSize: 13 }}>
      <For each={props.hunks}>
        {(hunk, index) => {
          const diff = processHunkLines(hunk.lines, hunk.oldStart, filePath)
          return (
            <>
              <Show
                when={props.splitView}
                fallback={<UnifiedView diff={diff} maxWidth={maxWidth} />}
              >
                <SplitView
                  diff={diff}
                  leftMaxWidth={leftMaxWidth}
                  rightMaxWidth={rightMaxWidth}
                />
              </Show>
              <Show when={index() < props.hunks.length - 1}>
                <div style={{ paddingLeft: 4 }}>
                  <text style={{ color: SEPARATOR_FG, whiteSpace: "nowrap", fontSize: 13 }}>
                    {`${" ".repeat(maxWidth + 2)}...`}
                  </text>
                </div>
              </Show>
            </>
          )
        }}
      </For>
    </div>
  )
}

export const exampleHunks: Hunk[] = [
  {
    oldStart: 1,
    oldLines: 8,
    newStart: 1,
    newLines: 10,
    lines: [
      " import React from 'react'",
      " import { useState } from 'react'",
      " ",
      "-function Counter({ initial }: { initial: number }) {",
      "-  const [count, setCount] = useState(initial)",
      "+interface CounterProps {",
      "+  initial: number",
      "+  step?: number",
      "+}",
      "+",
      "+function Counter({ initial, step = 1 }: CounterProps) {",
      "+  const [count, setCount] = useState(initial)",
      " ",
      "   return (",
      "     <div>",
    ],
  },
  {
    oldStart: 12,
    oldLines: 5,
    newStart: 14,
    newLines: 7,
    lines: [
      "       <span>{count}</span>",
      "-      <button onClick={() => setCount(c => c + 1)}>+</button>",
      "-      <button onClick={() => setCount(c => c - 1)}>-</button>",
      "+      <button onClick={() => setCount(c => c + step)}>",
      "+        Increment by {step}",
      "+      </button>",
      "+      <button onClick={() => setCount(c => c - step)}>",
      "+        Decrement by {step}",
      "+      </button>",
      "     </div>",
      "   )",
    ],
  },
]

export function DiffNativeDemo() {
  return (
    <div
      testId="diff-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#11111b",
      }}
    >
      <div style={{ padding: 12, paddingLeft: 16, backgroundColor: "#1e1e2e" }}>
        <text style={{ color: "#cdd6f4", fontSize: 14, fontWeight: "bold" }}>
          counter.tsx
        </text>
      </div>
      <div
        testId="diff-scroll"
        style={{
          flexGrow: 1,
          overflow: "scroll",
          backgroundColor: UNCHANGED_CODE_BG,
        }}
      >
        <DiffViewer hunks={exampleHunks} filePath="counter.tsx" splitView={false} />
      </div>
    </div>
  )
}
